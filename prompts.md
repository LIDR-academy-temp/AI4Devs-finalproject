> Detalla en esta sección los prompts principales utilizados durante la creación del proyecto, que justifiquen el uso de asistentes de código en todas las fases del ciclo de vida del desarrollo. Esperamos un máximo de 3 por sección, principalmente los de creación inicial o  los de corrección o adición de funcionalidades que consideres más relevantes.
Puedes añadir adicionalmente la conversación completa como link o archivo adjunto si así lo consideras

## Herramientas, modelos y contexto utilizados

- **Herramientas:** Claude Code (CLI/app de Anthropic) como asistente principal durante toda la Entrega 1, trabajando directamente sobre el repositorio clonado `AI4Devs-finalproject` (gestión de rama, lectura de plantillas y edición de `readme.md`/`prompts.md`).
- **Modelos:** Claude Sonnet 5.5 (razonamiento general + generación de documentación técnica: arquitectura, modelo de datos, API, historias de usuario y tickets a partir de la idea de negocio descrita en lenguaje natural).
- **Contexto avanzado:** `CLAUDE.md` de otro proyecto del mismo usuario (Ombe) fue visible como contexto de la sesión pero **no se usó como base** de este proyecto (se decidió explícitamente "proyecto nuevo desde cero"); no se usaron skills, subagentes ni system prompts adicionales para esta entrega — el flujo fue conversación directa con Claude Code más lectura de las plantillas oficiales (`readme.md`/`prompts.md` del fork) para respetar su estructura exacta.
- **Proceso seguido:** en lugar de pedir "genera el proyecto final" de forma abierta, el desarrollo se guió con preguntas de alcance encadenadas (idea → stack → ubicación del repo → integración de WhatsApp → vertical de negocio → datos de la ficha) antes de generar cualquier documento, para evitar que la IA asumiera decisiones de producto/arquitectura que le correspondían al autor.

### Uso de IA en el ciclo de vida del desarrollo

- **Análisis:** definición del problema, del público objetivo y de las 5 funcionalidades must-have / 2 should-have a partir de la idea en lenguaje natural (sección 1 y Prompt 1-2 de esa sección).
- **Diseño:** elección de stack, decisión de integración real de WhatsApp (vs. mock), diagrama de arquitectura, modelo de datos (ER) y especificación de la API (secciones 2, 3 y 4).
- **Pruebas:** plan de pruebas unitarias/integración/E2E ya definido en la sección 2.6, incluyendo la decisión de mockear el envío real de WhatsApp en los tests automatizados; se usará IA para generar los tests concretos en la Entrega Final.
- **Despliegue:** arquitectura de infraestructura y despliegue (Vercel + Postgres gestionado + Cron) documentada con IA en la sección 2.4, pendiente de ejecutar en una entrega posterior.
- **Implementación y mantenimiento** (planificado, no ejecutado en esta entrega): se usará Claude Code para generar el scaffold inicial (Entrega 2) y para iterar sobre bugs/nuevas funcionalidades en entregas posteriores, manteniendo siempre revisión humana de lo generado.

---

## Índice

1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)

---

## 1. Descripción general del producto

**Prompt 1:**

"vamos a hacer un sistemas para negocios que trabajen por cita, donde el cliente pueda reservar en horarios disponbles que habilita el dueño del negocio, similar a lo que ya hace calendly, con mensajes de whats app para confirmar cita 24 horas antes"

*Criterio humano:* este fue el único prompt de producto; a partir de él, Claude propuso preguntas de acotamiento (no asumió el alcance directamente).

**Prompt 2:**

Pregunta de Claude (AskUserQuestion) para acotar el dominio: *"¿Qué tipo de negocios por cita tienes en mente como caso de uso principal?"* → respuesta del usuario: **"Genérico (cualquier negocio por cita)"**, lo que fijó que el MVP no se especializa en un vertical (salón, clínica, etc.) sino que el propio negocio configura su catálogo.

**Prompt 3:**

Instrucción implícita de continuar: tras fijar alcance (5 funcionalidades must-have: disponibilidad, catálogo de servicios, reserva pública, recordatorio WhatsApp 24h, panel de agenda) y 2 should-have opcionales, se pidió a Claude redactar la sección 1 completa (objetivo, funcionalidades, instalación) siguiendo la plantilla oficial del repo `AI4Devs-finalproject`.

*Criterio humano:* se revisó que las 5 funcionalidades must-have fueran realmente el núcleo (reserva + recordatorio WhatsApp) y no se diluyeran con las should-have; estas últimas se marcaron explícitamente como no operativas/opcionales para no comprometer el alcance exigido.

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

**Prompt 1:**

Pregunta de Claude: *"¿Qué stack quieres usar para este nuevo proyecto de citas?"* con 3 opciones razonadas (Next.js+Node/Postgres, React+Express+Postgres, o reutilizar el stack Expo de Ombe) → respuesta del usuario: **"Next.js + Node/Postgres"**.

**Prompt 2:**

Pregunta de Claude: *"Para los mensajes de WhatsApp de confirmación 24h antes, ¿cómo lo manejamos en el MVP?"* (API real de prueba vs. simulado) → respuesta del usuario: **"Integración real con API de prueba"**, lo que fijó Twilio WhatsApp Sandbox como integración externa en el diagrama en vez de un mock.

**Prompt 3:**

A partir de ambas decisiones, se pidió a Claude generar el diagrama de arquitectura (mermaid) y la justificación de un monolito modular Next.js frente a microservicios, explicando beneficios (simplicidad, un solo despliegue) y el sacrificio aceptado (notificaciones y lógica de negocio comparten runtime).

*Criterio humano:* se verificó que el diagrama reflejara fielmente las dos decisiones tomadas (stack y WhatsApp real) y no introdujera componentes no acordados (p. ej. colas de mensajería, que serían sobre-ingeniería para este MVP).

### **2.2. Descripción de componentes principales:**

**Prompt 1:**

Mismo contexto que 2.1 (stack Next.js/Postgres/Twilio ya decidido); se solicitó a Claude detallar cada componente (frontend, API, auth, DB, job programado, integración WhatsApp) con su tecnología concreta.

**Prompt 2:**

**Prompt 3:**

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

**Prompt 1:**

Se pidió a Claude proponer la estructura de carpetas de un proyecto Next.js App Router que separe rutas/presentación (`/app`), lógica de negocio pura testeable (`/lib/services`) y modelo de datos (`/prisma`), coherente con el plan de tests de la sección 2.6.

**Prompt 2:**

**Prompt 3:**

### **2.4. Infraestructura y despliegue**

**Prompt 1:**

Se pidió a Claude documentar un despliegue estándar para este stack (Vercel + Postgres gestionado + Vercel Cron) ya que el despliegue es opcional en las bases del proyecto; se marcó explícitamente como "previsto", no como algo ya realizado.

**Prompt 2:**

**Prompt 3:**

### **2.5. Seguridad**

**Prompt 1:**

Se pidió a Claude enumerar las prácticas de seguridad mínimas razonables para el alcance (hash de contraseñas, validación de entrada, aislamiento de datos por negocio, manejo de secretos de WhatsApp/DB), evitando prometer medidas no realistas para un MVP de curso (p. ej. no se incluyó 2FA ni WAF).

**Prompt 2:**

**Prompt 3:**

### **2.6. Tests**

**Prompt 1:**

Se pidió a Claude redactar el plan de pruebas (unitarias, integración, E2E) requerido por las bases del proyecto, dejando explícito que el envío real de WhatsApp se mockea en los tests para no depender de red/servicios externos, siguiendo la recomendación de la propia guía del proyecto final sobre componentes no deterministas.

**Prompt 2:**

**Prompt 3:**

---

### 3. Modelo de Datos

**Prompt 1:**

A partir de las 5 historias/funcionalidades must-have ya acordadas (disponibilidad, servicios, reserva, recordatorio, panel), se pidió a Claude derivar las entidades mínimas necesarias (`Business`, `Service`, `Availability`, `Appointment`) y su diagrama entidad-relación en mermaid, incluyendo claves primarias/foráneas y restricciones.

**Prompt 2:**

**Prompt 3:**

*Criterio humano:* se decidió manualmente **no** crear una entidad `Client` independiente (el cliente no se registra, solo deja nombre/teléfono en la cita) para mantener la reserva pública simple, ajustado a la historia de usuario 2.

---

### 4. Especificación de la API

**Prompt 1:**

Se pidió a Claude seleccionar y documentar en formato OpenAPI los 3 endpoints principales del flujo (crear disponibilidad, consultar huecos libres, crear una cita), con ejemplos de petición/respuesta, priorizando los que forman la ruta crítica de la reserva.

**Prompt 2:**

**Prompt 3:**

---

### 5. Historias de Usuario

**Prompt 1:**

Se pidió a Claude redactar en formato "Como/quiero/para" las 3 historias de usuario más representativas del MVP (configurar disponibilidad, reservar sin cuenta, recibir recordatorio de WhatsApp 24h antes), cada una con criterios de aceptación verificables.

**Prompt 2:**

**Prompt 3:**

---

### 6. Tickets de Trabajo

**Prompt 1:**

Se pidió a Claude generar un ticket de backend (cálculo de huecos disponibles), uno de frontend (página pública de reserva) y uno de base de datos (esquema Prisma + seed), cada uno con alcance, criterios de aceptación y estimación, siguiendo el requisito de la guía de "backend, frontend y base de datos".

**Prompt 2:**

**Prompt 3:**

---

### 7. Pull Requests

> No aplica todavía en la Entrega 1 (0% código, sin PRs). Se completará en la Entrega Final con los prompts usados para generar las PRs reales del desarrollo.

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

---

## 8. Entrega 2 — Implementación end-to-end

> A diferencia de la Entrega 1 (solo documentación), aquí los prompts generan y modifican código real sobre la rama `feature/entrega-2-rm`. Se mantiene el mismo criterio: máximo ~3 prompts por tema, priorizando los de creación inicial, corrección de bugs y endurecimiento final.

**Prompt 1 — Alcance y arranque:**

"listo, ahora vamos preparando la entrega dos"

Preguntas de acotamiento de Claude (AskUserQuestion) antes de escribir código: *¿qué funcionalidad hacemos 100% operativa end-to-end?* → **"Disponibilidad + reserva pública"**; *¿dónde vive el código?* → **"Raíz de AI4Devs-finalproject"**; *¿cómo levantamos Postgres local?* → **"Docker Compose local"**. A partir de estas tres decisiones se generó: `prisma/schema.prisma` (Business/Service/Availability/Appointment), `lib/services/slots.ts` (cálculo puro de huecos) con 7 tests unitarios en Vitest, los Route Handlers `GET /api/businesses/[id]/slots` y `POST /api/appointments` (validados con Zod, con manejo de conflicto 409 dentro de una transacción Prisma), la página pública `/[businessSlug]` con su formulario de reserva, el panel `/agenda` de solo lectura, y `prisma/seed.ts` con datos de demo.

*Criterio humano:* se verificó el flujo real en 3 niveles antes de considerarlo "hecho" — consultas Prisma directas, `curl` contra los endpoints (slots, creación 201, doble reserva 409) y la UI completa en el navegador — en vez de confiar solo en que `npm run validate` pasara en limpio.

**Prompt 2 — Corrección de bugs encontrados al verificar (no al escribir código):**

Durante la verificación manual (no a partir de un prompt de producto, sino de inspeccionar el comportamiento real) se detectaron y corrigieron dos bugs: (a) `prisma/seed.ts` generaba IDs de servicio no-UUID (`${business.id}-corte`) que rompían la validación `.uuid()` de Zod en ambos endpoints — se corrigió dejando que Prisma generara UUIDs reales (`@default(uuid())`); (b) `BookingForm.tsx` no cargaba los huecos disponibles al montar la página (solo en `onChange`), por lo que la página pública se veía "sin horarios" al abrirla — se corrigió con un `useEffect` de montaje.

*Criterio humano:* ambos bugs se encontraron usando la propia app (browser + curl), no leyendo el código en abstracto; es la misma disciplina de "probar el flujo manualmente" que exige `CLAUDE.md § Validación y tests`.

**Prompt 3 — Endurecimiento antes de comitear (seguridad, spec-driven, validación de commit):**

"antes de eso, asegurate de documentar los prompts, que el harness esté debidamente, que tengamos open spec para el spec driven, seguridad, unit test, validaciones al commit, generación de user stories etc"

A partir de este prompt se: extrajo el contrato de API a un `openapi.yaml` independiente (spec-driven, referenciado desde `readme.md § 4` y `CLAUDE.md`); se añadió `lib/security/rateLimit.ts` (rate limit en memoria por IP) a los dos endpoints públicos; se endureció la validación de `clientPhone` (regex E.164 en vez de solo longitud); se cambiaron las consultas a `Business` para usar `select` explícito y no arrastrar `passwordHash`; se añadieron cabeceras de seguridad básicas en `next.config.ts`; se instaló `husky` con un hook `pre-commit` que corre `npm run validate`; y se documentó todo en `readme.md` (Ticket 4, sección 2.5/2.6 actualizadas) y aquí mismo.

*Criterio humano:* se revisó que el rate limiting y el `select` explícito fueran proporcionales al alcance de un MVP de curso (sin introducir Redis/colas) y se dejó explícitamente documentada la limitación conocida (rate limit en memoria, no compartido entre instancias) en vez de presentarlo como una solución de producción completa.

**Prompt 4 — "corre localmente el proyecto para probarlo" antes de comitear:**

"antes de esto corre localmente el projecto para probarlo"

Se levantó `npm run dev`, se completó una reserva real en el navegador (`/barberia-demo` → slot → nombre/teléfono → confirmación) y se verificó que apareciera en `/agenda`. Además, se corrió `npm run build` (producción), algo que no se había hecho hasta este punto — y falló: `cacheComponents`/`partialPrefetching` (activados en `next.config.ts` desde el harness inicial) exigen `Suspense` o `"use cache"` alrededor de cualquier acceso a datos dinámico, y `/agenda` (consulta Prisma directa, sin `searchParams`/`cookies`) no los tenía. Se corrigió desactivando esos flags experimentales (no aportan nada a este MVP) y marcando `/agenda` con `export const dynamic = "force-dynamic"` para que nunca sirva una foto fija de las citas tomada en build time.

*Criterio humano:* probar solo con `npm run dev` habría dejado pasar este bug a producción sin que ningún test lo detectara; se añadió la regla de correr `npm run build` antes de cambios de rutas/config a `CLAUDE.md` para que no se repita.

**Prompt 5 — Feedback en medio del commit: falta el panel del negocio:**

"definitivamente la ui es un punto a mejorar, tambien falta el panel del duelo del negocio donde se adminsitra los tiempos disponible y donde se puede ver la agenta, configurar el mensaje de confirmacion etc"

Se preguntó (AskUserQuestion) si continuar con el commit de Entrega 2 ya validado (dejando el panel para después) o empezar el panel de inmediato → respuesta: **"Empezar ya el panel del negocio"**. A partir de ahí se construyó, en la misma rama: autenticación real con Auth.js v5 (Credentials provider contra `Business` + bcrypt, sesión JWT), `proxy.ts` protegiendo `/agenda`/`/servicios`/`/disponibilidad`/`/configuracion`, `lib/security/authz.ts` como único punto de verificación de multi-tenancy, CRUD completo de servicios (con "eliminar" implementado como desactivar, no borrar, para no arrastrar citas históricas), CRUD de disponibilidad (con validación `endTime > startTime`), y una página de configuración para editar la plantilla del mensaje de confirmación de WhatsApp (campo nuevo `Business.confirmationMessageTemplate` + migración). `/agenda` dejó de usar un slug de negocio fijo y pasó a leer el `businessId` de la sesión.

*Criterio humano:* se verificó explícitamente la frontera de seguridad antes de dar el trabajo por terminado — `curl` sin sesión contra los nuevos endpoints debía responder 401 (y lo hizo), y las páginas protegidas debían redirigir a `/login` (y lo hicieron) — en vez de confiar en que "la UI no muestra el link" fuera suficiente protección. También se decidió no implementar NextAuth/Auth.js como mock u OAuth social (fuera de alcance de un MVP de curso) sino Credentials simple, coherente con la decisión ya documentada en `readme.md § 2.2`.

**Prompt 6 — Identidad visual ("diseños modernos e intuitivos, colores llamativos y con contraste"):**

"Seguir afinando UI" (tras: *"ahora solo enfoquemonos en la ui, usemos diseños modernos e intuitivos, usa colores llamativos y con contraste"*)

Se cargó la skill `frontend-design` del propio Claude Code antes de escribir una sola línea de CSS, para evitar los defaults típicos de una UI generada por IA (crema+serif+terracota, negro+verde ácido, tarjetas SaaS idénticas). Se definió un sistema de tokens en `app/globals.css` (paleta violeta/coral/sol sobre blanco, tipografía Bricolage Grotesque + Plus Jakarta Sans vía `next/font`) y se rediseñaron las 8 pantallas: landing (hero con mock-up real del selector de horarios en vez de una ilustración genérica), reserva pública (indicador de pasos, porque el flujo es realmente secuencial), login (panel dividido), y las 4 páginas del panel de negocio (nav con pastilla activa, badges de estado).

*Criterio humano:* se hizo una pasada de autocrítica explícita después de la primera versión — en vez de darla por terminada, se revisó en el navegador en mobile y se encontraron y corrigieron 3 problemas reales: la tabla de agenda se rompía en mobile (texto apilado en varias líneas), el nav se partía en 2-3 líneas, y el anillo de foco por teclado era violeta sobre fondos ya violetas (invisible). También se agregó una página 404 con la misma identidad, porque la reserva pública usa `notFound()` para slugs inexistentes y antes caía en la plantilla genérica de Next.js.

**Prompt 7 — Validación final antes del commit:**

"ok estamos cerca de hacer commit solo hay que validar que los prompts esten documentados y se cumpla con lo requerido de la entrega 2"

Se revisó `prompts.md` contra la conversación real (este mismo prompt añadió los Prompts 6 y 7 que faltaban) y se auditó `readme.md` contra el código actual, encontrando y corrigiendo desincronizaciones: las instrucciones de instalación todavía mencionaban `NEXTAUTH_SECRET` en vez de `AUTH_SECRET` (Auth.js v5), y la sección 1.2 no reflejaba que disponibilidad/servicios/agenda ya están implementados con UI real (no solo modelo de datos), no solo "planeados".

*Criterio humano:* en vez de asumir que la documentación escrita en pasos anteriores seguía siendo exacta, se releyó contra el estado real del código antes de comitear — la propia guía del curso evalúa que `readme.md`/`prompts.md` sean coherentes con el código de cada entrega, no solo que existan.

**Prompt 8 — Hallazgos de un security review automático post-push:**

Tras el commit y push, dos reviews automáticos de seguridad (plugin `security-guidance`, no un prompt del usuario) sobre el diff comiteado señalaron 4 hallazgos reales: (1) `authorize()` en `lib/auth.ts` sin rate limit y con un posible timing attack (no comparaba contra ningún hash cuando el email no existía); (2) `POST /api/appointments` solo chequeaba solape contra citas existentes, nunca contra la disponibilidad real del negocio, por lo que un cliente podía mandar un `startAt` arbitrario (fuera de horario o en el pasado) directo a la API; (3) `callbackUrl` en `LoginForm.tsx` se usaba en `router.push` sin validar que fuera una ruta relativa (open redirect); (4) `clientIp()` confiaba en el primer valor de `X-Forwarded-For`, que el propio cliente puede falsear.

Se corrigieron los 4: rate limit por IP+email + hash dummy en el login; revalidación contra `computeAvailableSlots` + aislamiento `Serializable` en la transacción de citas; saneo de `callbackUrl` a solo rutas relativas; y `clientIp` ahora toma el último hop de XFF en vez del primero (se aprovechó para también podar el `Map` de rate limiting, que crecía sin límite).

*Criterio humano:* se trató el aviso automático como una revisión genuina a atender, no como una instrucción del usuario — se verificó cada hallazgo leyendo el código real antes de "arreglarlo" (en vez de aplicar el parche sugerido a ciegas), y se probó cada corrección por separado (rate limit con un script directo, revalidación de horario con `curl` contra fechas/horas inválidas, login real en el navegador) antes de darlas por buenas.
