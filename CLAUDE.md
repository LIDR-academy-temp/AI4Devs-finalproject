# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**AgendaYa** — appointment-booking MVP for the AI4Devs "Proyecto Final" (certification capstone). A business owner configures services and weekly availability; a client books an open slot with no account required; the system sends a WhatsApp reminder ~24h before each appointment. Full product spec, architecture, data model, API spec, user stories and work tickets live in [readme.md](readme.md); the AI-workflow log lives in [prompts.md](prompts.md) — **both must stay in sync with the code** as the project evolves across deliveries.

This is a course deliverable with a fixed process — see "Course delivery process" below before creating branches or opening PRs.

## Commands

```bash
npm run dev             # next dev — local dev server (http://localhost:3000)
npm run build           # next build
npm run start           # next start (production server)
npm run lint            # eslint
npm run typecheck       # tsc --noEmit
npm run test            # vitest run (unit + integration)
npm run test:watch      # vitest in watch mode
npm run validate        # lint + typecheck + test — run before every commit
npm run prisma:migrate  # prisma migrate dev
npm run prisma:seed     # tsx prisma/seed.ts (also runs automatically after migrate dev)
npm run prisma:studio   # prisma studio — inspect local DB
```

Local Postgres: `docker-compose up -d` (see `docker-compose.yml`) before running migrations.

**Always run `npm run validate` before considering a change done**, and before every commit. Don't skip `typecheck` — the project is strict TypeScript end to end (API routes, Prisma models, UI).

> Nota: `npm run typecheck` depende de los tipos de rutas que Next.js genera en `.next/types` (p. ej. `LayoutProps`). Si falla con "Cannot find name 'LayoutProps'" en un checkout nuevo, corre `npm run build` (o `npm run dev` una vez) antes de repetir el typecheck — no es un error real del código.

## Herramientas de Claude Code para este repo

- `/code-review` (nivel `medium` o superior) antes de dar por cerrada cualquier entrega con código — no solo antes de un PR, ya que este curso no usa PRs para las entregas.
- `/security-review` antes de la Entrega Final, dado que hay auth de negocio y datos de clientes (nombre/teléfono) de por medio.
- Skill `run` para levantar y probar la app manualmente en vez de asumir que "compila" equivale a "funciona".
- Skill de proyecto `.claude/skills/validar-entrega/SKILL.md`: el checklist de validación pre-commit (validate + build + coherencia de readme/prompts + verificación manual) usado repetidamente en la Entrega 2 — invócalo antes de comitear en cualquier entrega futura.
- Skill de proyecto `.claude/skills/seed-demo/SKILL.md`: reset del entorno local a datos de demo limpios (docker + migrate + seed), sin recurrir nunca a `prisma migrate reset`.
- Skill de proyecto `.claude/skills/documentar-prompt/SKILL.md`: formato exacto para agregar un prompt nuevo a `prompts.md` (numeración, cita textual, *Criterio humano*) — invócalo justo después de terminar trabajo de código a partir de un prompt real del usuario.
- Hooks de proyecto (`.claude/settings.json` + `.claude/hooks/*.sh`):
  - `block-no-verify.sh` (`PreToolUse` / `Bash`): bloquea `git commit`/`push` con `--no-verify`, para que el hook de husky (`npm run validate`) no se pueda saltar sin que el usuario lo pida explícitamente.
  - `block-destructive-prisma.sh` (`PreToolUse` / `Bash`): bloquea `prisma migrate reset` y `prisma db push --force-reset|--accept-data-loss` — comandos que borran toda la base local, no solo los datos del seed.
  - `check-multi-tenancy.sh` (`PostToolUse` / `Edit|Write`): advierte (no bloquea) si se edita un Route Handler bajo `app/api/businesses/[businessId]/**` (salvo `slots`, público a propósito) que no llama a `requireOwnBusiness`.

## Environment

- Config via `.env` (gitignored), documented in `.env.example` with **empty/test values only** — never commit real secrets.
- `DATABASE_URL` — Postgres connection string (local Docker Compose container in dev).
- `WHATSAPP_API_SID` / `WHATSAPP_API_TOKEN` / `WHATSAPP_FROM_NUMBER` — Twilio WhatsApp **sandbox/test** credentials only (see "Security" below). Never use live/production WhatsApp credentials in this repo.
- `AUTH_SECRET` — nombre que lee Auth.js v5 (no `NEXTAUTH_SECRET`); genera uno con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` en un checkout nuevo. `NEXTAUTH_URL` se mantiene por compatibilidad de tooling.

## Architecture

Monolito modular en **Next.js App Router + TypeScript**, full-stack (frontend + API routes en el mismo proyecto), con **PostgreSQL vía Prisma ORM** y un job programado que dispara recordatorios de WhatsApp. Decisión y justificación completas en [readme.md § 2](readme.md#2-arquitectura-del-sistema) — no la repitas ni la contradigas sin actualizar ese documento primero.

**Estructura de carpetas** (ver [readme.md § 2.3](readme.md#23-descripción-de-alto-nivel-del-proyecto-y-estructura-de-ficheros) para el detalle):
- `app/(public)/[businessSlug]` — página pública de reserva (sin auth).
- `app/(dashboard)/*` — panel del negocio: `agenda`, `servicios`, `disponibilidad`, `configuracion`, protegidas por `proxy.ts` (requiere sesión).
- `app/login` — login del negocio (Credentials provider de Auth.js).
- `app/api/*` — Route Handlers (auth, disponibilidad, servicios, slots, appointments). Los que administran datos del negocio (`services`, `availability`, el PATCH de `businesses/[id]`) exigen sesión vía `lib/security/authz.ts`; `slots` y `appointments` son públicos a propósito.
- `lib/auth.ts` — configuración de Auth.js v5 (Credentials + JWT, `session.user.businessId`).
- `lib/security/authz.ts` — `requireOwnBusiness(businessId)`, el único punto de verificación de multi-tenancy; cualquier endpoint nuevo del panel lo usa en vez de reimplementar el chequeo.
- `lib/services/*` — lógica de negocio pura, sin HTTP ni efectos — **toda regla de negocio no trivial (cálculo de slots, validación de solapes) va aquí, testeada con Vitest**, nunca directamente en un Route Handler.
- `lib/notifications/*` — integración con la API de WhatsApp (Twilio) — pendiente, Entrega Final.
- `prisma/schema.prisma` + `prisma/seed.ts` — modelo de datos y datos de prueba.
- `proxy.ts` (raíz del repo) — convención Next.js 16 para lo que antes era `middleware.ts`; no recrear `middleware.ts`, Next 16 lo marca deprecado.
- `jobs/*` — job de recordatorios 24h (pendiente, Entrega Final).
- Tests en `tests/unit`, `tests/integration`, `tests/e2e` (ver sección "Validación" abajo).

**Modelo de datos**: `Business` 1—N `Service`, `Business` 1—N `Availability`, `Business`/`Service` 1—N `Appointment`. Ver diagrama ER y restricciones completas en [readme.md § 3](readme.md#3-modelo-de-datos). Cualquier cambio de esquema debe reflejarse ahí también.

**API**: todos los endpoints nuevos pasan por Zod en el límite (body/query) antes de tocar Prisma. **[openapi.yaml](openapi.yaml) es la fuente de verdad del contrato** (spec-driven): cualquier cambio de forma/validación en `app/api/**` se actualiza ahí primero, y el resumen narrativo en [readme.md § 4](readme.md#4-especificación-de-la-api) debe mantenerse coherente con ese archivo. Un endpoint marcado `x-status: planned` en el spec existe en el contrato pero todavía no en código.

## Conventions worth knowing

- **Idioma**: comentarios y contenido de negocio (readme.md, prompts.md, nombres de historias de usuario) en español; código, nombres de variables/funciones y mensajes de commit en inglés, salvo texto visible al usuario final (UI en español).
- **Sin comentarios por defecto**: solo cuando el *por qué* no es obvio (p. ej. una regla de negocio no evidente del cálculo de slots).
- `strict: true` en `tsconfig.json` — todo código nuevo debe tipar limpio.
- Multi-tenancy por `businessId`: **todo** query/mutación del panel del negocio debe filtrar por el `businessId` de la sesión activa. Nunca confíes en un `businessId` recibido del cliente sin verificar que coincide con la sesión — usa `requireOwnBusiness` (`lib/security/authz.ts`) en vez de comparar `session.user.businessId` a mano en cada endpoint.
- Zonas horarias: todas las fechas de citas se calculan en la `timezone` del `Business`, nunca en la del servidor/cliente a secas.
- `Service` nunca se borra de verdad desde el panel: `DELETE /api/businesses/{id}/services/{id}` marca `active: false`, porque `Appointment.serviceId` tiene `onDelete: Cascade` y un borrado físico se llevaría las citas históricas por delante.

## Validación y tests

- `lib/services/slots.ts` (cálculo de huecos disponibles) es la pieza más sensible del MVP: cualquier cambio ahí requiere un test unitario nuevo o actualizado en `tests/unit`.
- El envío real de WhatsApp **se mockea siempre** en tests automatizados (unit/integration/E2E) — nunca debe llamarse a la API real de Twilio desde la suite de tests.
- `npm run validate` (lint + typecheck + test) debe pasar en limpio antes de dar una tarea por terminada.
- Antes de un cambio de UI, levanta `npm run dev` y prueba el flujo manualmente (reserva pública de principio a fin) — no basta con que compile.
- Antes de un cambio en `next.config.ts`, rutas o layout, corre también `npm run build`: `npm run dev` no detecta errores de prerenderizado (ya ocurrió con `cacheComponents`/`"use cache"` y una página dinámica sin `Suspense` — ver abajo).
- Esta app **no usa Cache Components** (`cacheComponents`/`partialPrefetching` en `next.config.ts`): ambas páginas (`/[businessSlug]`, `/agenda`) son dinámicas por diseño (datos en vivo), así que esa feature solo añadiría complejidad sin beneficio. `/agenda` lleva `export const dynamic = "force-dynamic"` explícito porque, sin funciones dinámicas (cookies/headers/searchParams), Next.js la prerenderizaría como estática y congelaría las citas en el build. Si se añade una página nueva que lea datos en vivo sin `searchParams`/`cookies`/`headers`, hay que marcarla igual.
- **Pre-commit hook (husky):** `.husky/pre-commit` corre `npm run validate` automáticamente en cada `git commit` (instalado vía `"prepare": "husky"` en `package.json`, se activa solo con `npm install`). Un commit con lint/typecheck/tests en rojo se bloquea; no se salta con `--no-verify` salvo que el usuario lo pida explícitamente.

## Seguridad

- Nunca credenciales ni tokens reales de WhatsApp/Twilio en el repo, commits, `.env.example` ni logs — solo credenciales de **sandbox/test**, documentadas vacías en `.env.example`.
- Contraseñas del negocio: hash con bcrypt, nunca texto plano en logs ni en respuestas de API.
- Los datos de prueba (seed) son explícitamente ficticios (`demo@agendaya.test`); no usar datos reales de negocios ni clientes.
- **`passwordHash` nunca sale de `lib/db.ts` hacia una página/respuesta:** toda consulta Prisma a `Business` desde `app/**` usa `select` explícito (nunca `include`/objeto completo) para no arrastrar ese campo a un Server Component o a una respuesta JSON, aunque hoy no se renderice.
- **Rate limiting (`lib/security/rateLimit.ts`):** los endpoints públicos (`/api/appointments`, `/api/businesses/[id]/slots`) limitan peticiones por IP (en memoria, por proceso — válido para el MVP de un solo servidor; en un despliegue multi-instancia habría que moverlo a Redis/Upstash). Cualquier endpoint público nuevo debe aplicar el mismo patrón.
- `clientPhone` se valida con un patrón tipo E.164 (`^\+?[1-9]\d{6,14}$`), no solo longitud — es el dato que después usará el job de recordatorios de WhatsApp.
- Cabeceras de seguridad básicas (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) aplicadas globalmente en `next.config.ts`.
- **Login (`lib/auth.ts`):** `checkRateLimit` por IP+email (5 intentos / 5 min) dentro de `authorize`, y `bcrypt.compare` contra un hash dummy cuando el email no existe, para que el tiempo de respuesta no delate si una cuenta existe.
- **`clientIp` (`lib/security/rateLimit.ts`):** toma el **último** hop de `X-Forwarded-For`, nunca el primero — el primero lo puede fijar el propio cliente con cualquier valor; el último es el que agrega el proxy de confianza (Vercel) justo antes del servidor.
- **`POST /api/appointments`:** revalida el `startAt` recibido contra `computeAvailableSlots` (disponibilidad real + citas existentes + no-pasado) antes de intentar crear la cita — sin esto, un cliente podía mandar un horario arbitrario directo a la API sin pasar por el selector de la UI. La transacción final usa aislamiento `Serializable` (no el nivel por defecto de Postgres) para que dos reservas concurrentes del mismo hueco no puedan colarse ambas; Prisma lanza `P2034` en ese caso, mapeado al mismo 409.
- **`callbackUrl` en `/login`:** se sanitiza a solo rutas relativas (`sanitizeCallbackUrl` en `LoginForm.tsx`) para que `?callbackUrl=https://evil.com` no sirva de open redirect tras un login legítimo.

## Course delivery process (AI4Devs Proyecto Final)

- Ramas de entrega: `feature/entrega-1-rm`, `feature/entrega-2-rm`, `final-project-rm` (iniciales del autor: `rm`), cada una partiendo del estado más reciente (incluye las entregas previas). **No se abren Pull Requests** para las entregas — es rama + Typeform, según las bases del curso.
- Cada entrega debe mantener `readme.md` y `prompts.md` completos y coherentes con el código real de esa rama; si el código cambia una decisión documentada (stack, modelo de datos, API), actualiza `readme.md` en el mismo cambio.
- Entrega 2: al menos una funcionalidad 100% operativa de extremo a extremo (acordado: disponibilidad + reserva pública contra la base de datos real). Entrega Final: las 3-5 funcionalidades must-have operativas + suite de tests (unit/integration/E2E) + evidencia de funcionamiento.
