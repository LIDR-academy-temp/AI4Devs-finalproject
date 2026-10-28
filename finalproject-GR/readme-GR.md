## Índice

0. [Ficha del proyecto](#0-ficha-del-proyecto)
1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)

---

## 0. Ficha del proyecto

### **0.1. Tu nombre completo:**

Gonzalo Roland

### **0.2. Nombre del proyecto:**

Railgun — QA Automation Platform

### **0.3. Descripción breve del proyecto:**

Plataforma web colaborativa para equipos de QA que centraliza la definición, organización, ejecución y seguimiento de casos de prueba, junto con la gestión de defectos (bugs), ofreciendo dashboards de salud, analítica de tendencias y reportes exportables como fuente única de verdad del proceso de testing.

### **0.4. URL del proyecto:**

> Puede ser pública o privada, en cuyo caso deberás compartir los accesos de manera segura. Puedes enviarlos a [alvaro@lidr.co](mailto:alvaro@lidr.co) usando algún servicio como [onetimesecret](https://onetimesecret.com/).

_Aún sin desplegar: la elección de hosting (Postgres, cómputo, almacenamiento y región; preguntas abiertas E1–E4 en [docs/open-questions.md](docs/open-questions.md)) sigue pendiente. Por ahora la aplicación se ejecuta en local siguiendo la sección 1.4._

### 0.5. URL o archivo comprimido del repositorio

> Puedes tenerlo alojado en público o en privado, en cuyo caso deberás compartir los accesos de manera segura. Puedes enviarlos a [alvaro@lidr.co](mailto:alvaro@lidr.co) usando algún servicio como [onetimesecret](https://onetimesecret.com/). También puedes compartir por correo un archivo zip con el contenido

[github.com/ibuprofano/AI4Devs-finalproject](https://github.com/ibuprofano/AI4Devs-finalproject): todo el proyecto vive en la carpeta `finalproject-GR/`, y cada entrega tiene su propia rama (`feature/entrega-1-gr`, `feature/entrega-2-gr`).

---

## 1. Descripción general del producto

> Describe en detalle los siguientes aspectos del producto:

### **1.1. Objetivo:**

Railgun centraliza todo el ciclo de vida de QA de un equipo de producto: definición y organización de casos de prueba, planificación y ejecución de baterías de test (manuales y, a futuro, automatizadas), seguimiento de defectos, y comunicación del estado de calidad a stakeholders no técnicos mediante dashboards y reportes exportables.

Resuelve un problema habitual en equipos de QA: la dispersión de la información de testing entre hojas de cálculo, gestores de tickets genéricos y herramientas de automatización desconectadas entre sí. Al unificar casos de prueba, ejecuciones, bugs y trazabilidad en una sola plataforma, el equipo gana una fuente única de verdad y visibilidad en tiempo real sobre la salud de calidad del producto.

Está dirigido a equipos de QA (manuales y de automatización), líderes técnicos y managers de producto que necesitan tanto ejecutar el trabajo diario de testing como reportar el estado de calidad a stakeholders.

### **1.2. Características y funcionalidades principales:**

- **Organización jerárquica de casos de prueba**: árbol de carpetas (hasta 4 niveles), etiquetas por proyecto, y casos de prueba en formato Gherkin (Given/When/Then) o descripción manual.
- **Gestión de ejecuciones de test (Test Executions)**: agrupación de casos en una ejecución con ciclo de vida propio (Draft → Ready → In Progress → Paused → Completed → Done/Canceled), entorno, navegador, viewport, locale y timezone configurables.
- **Ejecución manual y automatizada**: modo manual disponible desde el día uno; motor de ejecución automatizada basado en Playwright con mapeo de pasos asistido por IA en el roadmap (actualmente en reconstrucción).
- **Gestión de defectos (Bugs)**: severidad, estado, adjuntos de imagen (hasta 5 por bug), y vínculo directo con el test run y caso de prueba que los originó — incluyendo creación automática de bugs al fallar un run.
- **Trazabilidad completa**: grafo visual que conecta Test Cases → Executions → Test Runs → Bugs, con navegación directa entre entidades.
- **Dashboards y analítica**: KPIs de salud de proyecto (Health Score, cobertura, pass rate, bugs abiertos/críticos), tendencias configurables por rango de fechas, y reportes descargables en PDF/HTML.
- **Multi-tenant con control de acceso en dos niveles**: roles de Workspace (Owner, Collaborator) y de Proyecto (Admin, Contributor, Viewer), con reglas de acceso e invitación específicas.
- **Auditoría**: registro de actividad inmutable por proyecto, filtrable por tipo de entidad.
- **Roadmap de IA**: generación de casos de prueba desde fuentes externas, generación de código Playwright a partir de casos automatizados de alta confianza, y configuración de proveedor/modelo de IA por proyecto.

**Estado de la implementación (entrega 2):** el MVP ([docs/roadmap-mvp.md](docs/roadmap-mvp.md), fases 0–9) está completo, y del roadmap completo ([docs/roadmap-full.md](docs/roadmap-full.md)) ya se han construido varios tramos.

Ya funciona:
- **Base multi-tenant:** aislamiento por tenant con RLS, alta de identidad al primer login, autorización por rol de proyecto, log de actividad en la misma transacción y credenciales de entorno cifradas con revelado auditado.
- **Casos de prueba:** árbol de carpetas de 4 niveles con drag-and-drop, edición en Gherkin y etiquetas.
- **Ejecuciones y bugs:** ciclo de vida de ejecuciones con runs manuales, temporizador con pausas y firma (sign-off); bugs con creación automática al fallar un run; filtros por etiqueta.
- **Proyectos y workspace:** proyectos con selector, papelera y restauración, y renombrado del workspace.
- **Jobs en segundo plano:** el worker de jobs (Graphile Worker) con la purga diaria de la papelera.
- **Datos de demostración:** un seed con un proyecto de ejemplo completo.

Pendiente: tiempo real por SSE (propuesto como el cambio `sse-live-updates`), invitaciones y miembros, adjuntos de imagen, dashboards, reportes, y el motor automatizado.

### **1.3. Diseño y experiencia de usuario:**

> Proporciona imágenes y/o videotutorial mostrando la experiencia del usuario desde que aterriza en la aplicación, pasando por todas las funcionalidades principales.

La aplicación ya es navegable en local. Tiene una barra lateral colapsable, un selector de proyecto, y pantallas en vista dividida (lista y detalle) para Test Cases, Executions y Bugs, con tema claro y oscuro. Para recorrerla con datos realistas, ejecuta el seed de demostración (sección 1.4, paso 6). Llena tu proyecto con el conjunto de datos «ShopFlow»: árbol de carpetas, ejecuciones en todos los estados, bugs y compañeros de equipo.

_Pendiente: capturas de pantalla y video walkthrough de los flujos principales (alta de caso de prueba, creación y ejecución de una Test Execution, gestión de un bug)._

### **1.4. Instrucciones de instalación:**

> Documenta de manera precisa las instrucciones para instalar y poner en marcha el proyecto en local (librerías, backend, frontend, servidor, base de datos, migraciones y semillas de datos, etc.)

Todos los comandos se ejecutan desde la carpeta `finalproject-GR/`. [CLAUDE.md](CLAUDE.md) amplía cada variable de entorno y cada comando.

**Requisitos previos:**
- **Node.js ≥ 22.18** y **npm**. El monorepo usa npm workspaces ([ADR 0010](docs/adr/0010-monorepo-layout.md)), y Graphile Worker exige Node 22.18.
- **Docker**, para PostgreSQL 16. No hace falta Redis: la cola de jobs vive en PostgreSQL ([ADR 0005](docs/adr/0005-realtime-and-background-jobs-v1.md)).
- **Una aplicación de Clerk** (basta una de desarrollo), que da la clave pública y la secreta. Clerk solo gestiona la identidad ([ADR 0002](docs/adr/0002-authentication-and-workspace-membership.md)).
- Todavía no hacen falta almacenamiento S3/R2 ni proveedor de email: las funciones que los usan no se han construido.

**Pasos:**
1. **Clonar e instalar:**
   ```bash
   git clone https://github.com/ibuprofano/AI4Devs-finalproject.git
   cd AI4Devs-finalproject/finalproject-GR
   npm install
   ```
2. **Levantar PostgreSQL:** `docker compose up -d`. Escucha en el puerto **5433** del host. En un volumen nuevo, `db/init/` crea los roles:
   - `railgun_migrator`, dueño del esquema
   - `railgun_app`, el rol de la API, sin bypass de RLS
   - `railgun_worker`, el rol del worker
   - `railgun_breakglass`, inactivo

   Ver [ADR 0003](docs/adr/0003-tenant-isolation.md).
3. **Aplicar las migraciones**, con el rol migrador:
   ```bash
   DATABASE_URL=postgresql://railgun_migrator:migrator_dev_password@localhost:5433/railgun npm run db:migrate
   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/railgun npm run db:check-rls
   ```
   El primer comando instala el esquema de Graphile Worker y aplica `db/migrations/0001`–`0014`. El segundo comprueba que toda tabla con `workspace_id` tenga política RLS.
4. **Configurar las variables de entorno:**
   - **API:** copia `apps/api/.env.example` a `apps/api/.env` y rellena:
     - `CLERK_SECRET_KEY`
     - `SECRETS_MASTER_KEY`: 32 bytes en base64, por ejemplo `openssl rand -base64 32`. Consérvala, porque cifra las claves de cada workspace ([ADR 0004](docs/adr/0004-secrets-storage.md)).
   - **Web:** crea `apps/web/.env.local` con `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y la misma `CLERK_SECRET_KEY`.
   - Las cadenas de conexión (`DATABASE_URL`, `WORKER_DATABASE_URL`), `NEXT_PUBLIC_API_URL` y `WEB_ORIGIN` son opcionales: por defecto apuntan al Postgres de docker-compose y a los puertos locales.
5. **Arrancar todo:** `npm run dev` levanta la API (`localhost:3001`), la web (`localhost:3000`) y el worker en una sola terminal. Ctrl+C los detiene.
6. **Registrarse y cargar datos de demostración:** crea una cuenta en `http://localhost:3000`. El primer login crea tu workspace y tu proyecto. Después ejecuta:
   ```bash
   npm run db:seed -w apps/api -- --email tu@email.com
   ```
   El seed es idempotente: volver a ejecutarlo no escribe nada.
7. **Calidad:**
   - `npm run lint` y `npm run typecheck`
   - `npm test -w apps/api`, `npm test -w apps/worker` y `npm test -w apps/web`

   Los tests de la API y del worker usan el Postgres de docker-compose.

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

> Usa el formato que consideres más adecuado para representar los componentes principales de la aplicación y las tecnologías utilizadas. Explica si sigue algún patrón predefinido, justifica por qué se ha elegido esta arquitectura, y destaca los beneficios principales que aportan al proyecto y justifican su uso, así como sacrificios o déficits que implica.

La arquitectura se documenta formalmente en [ADR 0001 — Initial Technology Stack](docs/adr/0001-tech-stack.md) y en las decisiones posteriores que la enmiendan: [0002](docs/adr/0002-authentication-and-workspace-membership.md) (identidad y membresías), [0003](docs/adr/0003-tenant-isolation.md) (aislamiento por tenant), [0004](docs/adr/0004-secrets-storage.md) (secretos), [0005](docs/adr/0005-realtime-and-background-jobs-v1.md) (tiempo real y jobs en v1), [0006](docs/adr/0006-report-generation.md) (reportes) y [0007](docs/adr/0007-activity-log-and-trash-purge.md) (log de actividad y papelera).

Durante la implementación se añadieron:
- [0008](docs/adr/0008-tenant-context-implementation.md): helper `withTenantContext`
- [0009](docs/adr/0009-api-authentication-transport.md): bearer token de Clerk
- [0010](docs/adr/0010-monorepo-layout.md): monorepo con npm workspaces
- [0011](docs/adr/0011-frontend-ui-stack.md): Tailwind, shadcn/ui, TanStack Query y react-hook-form
- [0012](docs/adr/0012-execution-completion-and-sign-off.md) a [0017](docs/adr/0017-active-project.md): reglas de dominio
- [0018](docs/adr/0018-queue-library.md): Graphile Worker como cola

Este apartado resume el estado actual.

```mermaid
flowchart TB
    Browser["Browser<br/>Next.js UI"]

    subgraph Vercel["Vercel"]
        NextApp["Next.js App<br/>(React, App Router)"]
    end

    subgraph Compute["Compute host (Railway or Render, pending)"]
        API["NestJS API<br/>REST + SSE streams"]
        Worker["Worker process<br/>Postgres queue: emails, reports,<br/>health snapshot, trash purge"]
        PWWorker["Playwright Automation Worker<br/>(roadmap - automated execution engine)"]
    end

    subgraph Data["Data Layer"]
        PG[("PostgreSQL (Neon or RDS, pending)<br/>shared schema + RLS<br/>job queue, LISTEN/NOTIFY")]
    end

    subgraph External["External Services"]
        Clerk["Clerk<br/>identity only"]
        Storage["S3 / R2<br/>private bucket"]
        Email["Transactional email<br/>(provider pending)"]
        KMS["Cloud KMS<br/>(later, see ADR 0004 trigger)"]
    end

    Browser -->|HTTPS| NextApp
    NextApp -->|REST + SSE| API
    NextApp -->|sign-in, sessions| Clerk
    API -->|verify session| Clerk
    API -->|tenant-scoped queries, enqueue jobs| PG
    API -->|presigned URLs| Storage
    API -.->|unwrap master key, later| KMS

    Worker -->|dequeue, tenant-scoped read/write| PG
    Worker -->|reports, image cleanup| Storage
    Worker -->|invitation emails| Email

    PWWorker -.->|run results| PG
    PWWorker -.->|screenshots| Storage
```

**Notas del diagrama:**
- Las líneas continuas forman parte de v1; las discontinuas corresponden al motor de ejecución automatizada (deshabilitado en el PRD, §9) y a la clave maestra en KMS, que se adopta cuando se cumpla el disparador del ADR 0004.
- **No hay Redis ni WebSockets en v1**: las notificaciones en tiempo real son *server-sent events* (una sola dirección, servidor → navegador) y la cola de jobs vive en PostgreSQL, con lo que un job se encola en la misma transacción que el cambio que lo origina. Redis (pub/sub) y la evaluación de Temporal vuelven cuando se retome el motor de automatización (ADR 0005).
- Clerk solo gestiona **identidad**. Workspaces, membresías, roles e invitaciones viven en nuestra base de datos (ADR 0002).
- El navegador llama a la API directamente y envía el token de sesión de Clerk como `Authorization: Bearer`. El stream SSE usará el mismo token mediante un cliente basado en `fetch` ([ADR 0009](docs/adr/0009-api-authentication-transport.md)).
- **Estado actual:** la web, la API, el worker y PostgreSQL ya existen y funcionan en local. Todavía no existen el almacenamiento de objetos, el email, KMS, el motor Playwright ni el hosting. Mientras no llega el tiempo real por SSE, la web refresca las ejecuciones en curso cada 5 s.

**Patrón y justificación:** el backend sigue un patrón de **monolito modular** (NestJS, organizado por dominio: workspaces, proyectos, casos de prueba, ejecuciones, bugs, actividad) con un **worker desacoplado** que consume una cola en PostgreSQL para el trabajo asíncrono (emails, reportes, jobs programados). El frontend (Next.js) es un cliente independiente que consume la API por REST y SSE.

No se optó por microservicios: dado el estado inicial del producto y el tamaño de equipo, un monolito modular maximiza la velocidad de desarrollo y preserva una única fuente de verdad transaccional — crítico dado un modelo de datos fuertemente relacional (RBAC en dos niveles, papelera con borrado lógico, dashboards con joins entre entidades). Todo el estado (datos, cola y notificaciones) reside en una sola base de datos, lo que elimina un servicio completo frente al plan original.

**Beneficios principales:** menor complejidad operativa inicial (sin Redis), consistencia transaccional entre los cambios de datos, los jobs y el log de actividad, aislamiento entre tenants reforzado por la propia base de datos, y una ruta de crecimiento clara (Redis, Temporal y KMS entran en puntos de decisión ya definidos).

**Sacrificios asumidos:**
- El monolito deberá descomponerse eventualmente si el equipo crece de forma significativa.
- Se prioriza la velocidad de entrega (Vercel + Railway/Render) sobre el control total de infraestructura de un único proveedor cloud (alternativa «Combo C» del ADR 0001).
- La cola en PostgreSQL tiene un techo de rendimiento muy superior a lo que v1 necesita, pero inferior al de un broker dedicado.
- Los reportes se generan sin navegador (biblioteca PDF), lo que exige mantener dos plantillas (HTML y PDF) y resolver la cobertura de fuentes para texto no latino (ADR 0006).
- La clave maestra de cifrado vive en el almacén de secretos de la plataforma hasta que se adopte KMS (ADR 0004).

### **2.2. Descripción de componentes principales:**

> Describe los componentes más importantes, incluyendo la tecnología utilizada

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| Frontend | Next.js (React, App Router), Tailwind CSS v4 + shadcn/ui, TanStack Query, react-hook-form + zod, dnd-kit ([ADR 0011](docs/adr/0011-frontend-ui-stack.md), [ADR 0014](docs/adr/0014-drag-and-drop-and-ordering.md)) | UI de la aplicación: árbol de carpetas, ejecuciones, bugs, dashboards, selector de workspace e invitaciones pendientes |
| API Backend | NestJS (Node/TypeScript) | Lógica de negocio, módulo único de políticas de autorización (RBAC), endpoints REST, streams SSE, capa de acceso a datos con contexto de tenant |
| Base de datos | PostgreSQL 16 + Prisma 6 (cliente; las consultas son SQL parametrizado dentro de `withTenantContext`, [ADR 0008](docs/adr/0008-tenant-context-implementation.md)); migraciones SQL versionadas en `db/migrations` | Persistencia relacional, esquema compartido con `workspace_id` y RLS ([ADR 0003](docs/adr/0003-tenant-isolation.md)), log de actividad de solo inserción, tablas de la cola de jobs |
| Identidad | Clerk | Registro, inicio de sesión, sesiones, recuperación de contraseña y verificación de email. **No** gestiona organizaciones ([ADR 0002](docs/adr/0002-authentication-and-workspace-membership.md)) |
| Membresías e invitaciones | Módulo propio de NestJS sobre PostgreSQL | Workspaces, roles de workspace y de proyecto, invitaciones (aceptación explícita, 7 días de vigencia), transferencia de propiedad |
| Tiempo real | Server-sent events (SSE) | Refresco de estadísticas y runs cuando otro tester actualiza una ejecución; notificación de invitaciones y de reportes listos. El temporizador de la ejecución se calcula en el navegador |
| Cola / Jobs | Cola sobre PostgreSQL (Graphile Worker) en un proceso worker; los jobs se encolan en la misma transacción que el cambio que los origina | Emails, generación de reportes, snapshot diario del Health Score, purga de la papelera a los 30 días, limpieza de adjuntos huérfanos ([ADR 0005](docs/adr/0005-realtime-and-background-jobs-v1.md), [ADR 0018](docs/adr/0018-queue-library.md)) |
| Reportes | Plantilla HTML en servidor + biblioteca PDF (pdfmake por defecto, pendiente de spike) | Reportes HTML autocontenidos y PDF a partir de un único objeto de datos, con gráficos SVG dibujados una sola vez ([ADR 0006](docs/adr/0006-report-generation.md)) |
| Secretos | Cifrado de sobre AES-256-GCM en la aplicación | Credenciales de entorno, tokens de integración y claves de IA; clave por workspace envuelta por una clave maestra ([ADR 0004](docs/adr/0004-secrets-storage.md)) |
| Email transaccional | Proveedor pendiente de decidir | Invitaciones y recordatorios |
| Motor de automatización (roadmap) | Worker Node.js + Playwright | Ejecución automatizada de casos Gherkin. Su runtime (Temporal, Redis pub/sub) se decide cuando se retome |
| Almacenamiento de objetos | AWS S3 o Cloudflare R2 (pendiente) | Adjuntos de bugs y reportes generados, en bucket privado con URLs firmadas de vida corta |
| Hosting | Vercel (frontend) + Railway o Render (API, worker) + PostgreSQL gestionado (Neon o RDS), pendientes de decidir | Despliegue y ejecución de todos los servicios |

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

> Representa la estructura del proyecto y explica brevemente el propósito de las carpetas principales, así como si obedece a algún patrón o arquitectura específica.

Monorepo con **npm workspaces** ([ADR 0010](docs/adr/0010-monorepo-layout.md)): `apps/` agrupa los procesos desplegables y `packages/` el código compartido no desplegable. Esta es la estructura real tras la entrega 2:

```
finalproject-GR/
├── apps/
│   ├── api/                  # NestJS — API REST
│   │   ├── src/common/       # Guards (Clerk, rol de proyecto, owner), withTenantContext, ActivityLogger, cifrado de secretos
│   │   ├── src/<dominio>/    # Un módulo por dominio: projects, folders, test-cases, tags, executions, bugs, environments, workspace, me
│   │   ├── scripts/seed.ts   # Seed de demostración (ShopFlow)
│   │   └── test/             # Tests e2e contra Postgres real, incluido el arnés de aislamiento entre tenants
│   ├── web/                  # Next.js (App Router)
│   │   ├── app/(app)/        # Rutas autenticadas: test-cases, executions, bugs, settings, workspace-settings
│   │   ├── components/       # Pantallas y componentes (shadcn/ui en components/ui)
│   │   └── lib/              # Cliente de API, query keys de TanStack Query, permisos por rol, utilidades
│   └── worker/               # Graphile Worker: tareas (trash_purge), crontab y helper de contexto de tenant
├── packages/
│   ├── config/               # tsconfig y ESLint compartidos
│   ├── shared-types/         # Reservado para tipos compartidos (vacío por ahora)
│   └── reporting/            # Reservado para gráficos y reportes (vacío por ahora)
├── db/
│   ├── init/                 # Roles de base de datos (superusuario, una vez)
│   └── migrations/           # 0001–0014, cada una con .up.sql y .down.sql
├── prisma/schema.prisma      # Solo datasource y generator; el esquema vive en db/migrations
├── scripts/                  # Migraciones, instalación de la cola, chequeo de RLS, `npm run dev`
├── openspec/
│   ├── specs/                # Especificaciones vigentes por capacidad (25)
│   └── changes/              # Cambios en curso y archivo de cambios completados
├── docs/
│   ├── adr/                  # ADR 0001–0018
│   ├── open-questions.md     # Decisiones aún abiertas
│   ├── roadmap-mvp.md        # Orden de construcción del MVP (completado)
│   └── roadmap-full.md       # Orden de construcción del producto completo
├── CLAUDE.md                 # Guía para el asistente de código
├── PRD.md                    # Documento de producto
└── docker-compose.yml        # PostgreSQL 16 local
```

**Desarrollo guiado por especificaciones:** cada funcionalidad se construye como un cambio de [OpenSpec](https://github.com/Fission-AI/OpenSpec) (`/opsx:propose` → `/opsx:apply` → `/opsx:archive`), con propuesta, especificación delta, diseño y tareas. Al archivarse, el cambio actualiza las especificaciones de `openspec/specs/`.

Cada app dentro de `apps/` es desplegable de forma independiente. El worker comparte código de dominio con la API (mismo repositorio y mismas reglas de acceso a datos), pero se ejecuta como proceso separado para que la generación de reportes no compita con las peticiones de la API.

### **2.4. Infraestructura y despliegue**

> Detalla la infraestructura del proyecto, incluyendo un diagrama en el formato que creas conveniente, y explica el proceso de despliegue que se sigue

La infraestructura reutiliza el diagrama de la sección 2.1: **Vercel** aloja el frontend (Next.js) con despliegue automático por rama (preview deployments en cada Pull Request, producción en `main`); un proveedor de contenedores (**Railway** o **Render**, pendiente) aloja la API NestJS y el proceso worker; y **PostgreSQL** gestionado (Neon o RDS, pendiente) guarda datos, cola de jobs y notificaciones. **v1 no despliega Redis.** La región de todos los servicios está pendiente de decidir junto con los requisitos de residencia de datos.

**Proceso de despliegue previsto:**
1. Push/merge a una rama dispara el pipeline de CI (tests + build).
2. En caso de éxito, Vercel despliega el frontend automáticamente (preview en PRs, producción en `main`).
3. El proveedor de contenedores reconstruye y despliega la API y el worker a partir de la misma rama. Las migraciones se ejecutan con un **rol privilegiado propio del pipeline**; la API y el worker corren siempre con un rol sin capacidad de saltarse RLS ni de modificar el log de actividad (ADR 0003 y 0007).
4. Variables de entorno y secretos (claves de Clerk, credenciales S3/R2 y del proveedor de email, cadenas de conexión a base de datos y la clave maestra de cifrado) se gestionan en cada plataforma, nunca en el repositorio. La clave maestra no se guarda junto a las copias de seguridad de la base de datos (ADR 0004).

**Integración continua (ya en marcha):** GitHub Actions ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml), en la raíz del repositorio) se ejecuta en cada push o PR que toque `finalproject-GR/`. El workflow sigue estos pasos:
1. Levanta un servicio PostgreSQL 16 y usa Node 22.
2. Instala dependencias, y ejecuta `npm run lint` y `npm run typecheck` en todos los workspaces.
3. Crea los roles de base de datos (`db/init`).
4. Aplica todas las migraciones con el rol migrador, igual que el despliegue previsto.
5. Ejecuta `npm run db:check-rls`, que falla si una tabla con `workspace_id` no tiene política RLS forzada (ADR 0003).

Las suites de Jest y Vitest (sección 2.6) se ejecutan en local; incorporarlas al CI está pendiente.

_El despliegue continuo, los entornos de staging y la observabilidad (logs, errores, trazas y monitorización de jobs) siguen pendientes junto con el hosting; ver [docs/open-questions.md](docs/open-questions.md), apartados E y F._

### **2.5. Seguridad**

> Enumera y describe las prácticas de seguridad principales que se han implementado en el proyecto, añadiendo ejemplos si procede

- **RBAC en dos niveles**: rol de Workspace (Owner, Collaborator) como techo de acceso, y rol de Proyecto (Admin, Contributor, Viewer) para el día a día. Un único módulo de políticas de NestJS evalúa ambos en cada endpoint; el Owner es Admin implícito de todos sus proyectos. Las acciones destructivas quedan restringidas a Project Admin y Workspace Owner, como especifica el PRD (sección 3).
- **Aislamiento entre tenants en dos capas** ([ADR 0003](docs/adr/0003-tenant-isolation.md)): toda tabla de tenant lleva `workspace_id` y la capa de acceso a datos filtra siempre por él; además, PostgreSQL aplica **Row-Level Security** con un rol de aplicación que no puede saltársela. Un filtro olvidado, una consulta SQL directa de un dashboard o un worker que se salte la capa devuelven cero filas en lugar de datos de otro tenant. Los jobs llevan su `workspace_id` y fallan si no lo tienen.
- **Identidad delegada en Clerk** ([ADR 0002](docs/adr/0002-authentication-and-workspace-membership.md)): contraseñas, sesiones, recuperación de contraseña y verificación de email no se implementan a mano. La API valida la sesión en cada petición y aplica después las reglas de autorización propias. Solo una cuenta con **email verificado** puede ver o aceptar invitaciones, y la pantalla de recuperación responde igual exista o no la cuenta, para no revelar quién está registrado.
- **Invitaciones seguras**: el token del enlace se guarda solo como hash, caduca a los 7 días, y nadie entra en un workspace sin aceptar explícitamente.
- **Secretos cifrados con clave por workspace** ([ADR 0004](docs/adr/0004-secrets-storage.md)): credenciales de entorno, tokens de integración y claves de IA se cifran en la aplicación (AES-256-GCM, ligados al workspace y a la fila) y en la base de datos solo existe texto cifrado. Los tokens y claves son de solo escritura; las contraseñas de entorno se pueden revelar solo a Contributors y Admins, y **cada revelación se registra en el log de actividad en la misma transacción**. Nunca aparecen en logs, reportes ni payloads de jobs (estos llevan identificadores).
- **Log de auditoría inmutable** ([ADR 0007](docs/adr/0007-activity-log-and-trash-purge.md)): el rol de la aplicación solo puede insertar y leer, y un trigger rechaza cualquier `UPDATE` o `DELETE`. Sin claves foráneas, sobrevive a la purga de la papelera.
- **Papelera con retención acotada**: lo eliminado se conserva 30 días y después se purga de forma definitiva, incluidos los archivos asociados del almacenamiento.
- **URLs firmadas y de vida corta** sobre un bucket privado para adjuntos de bugs y reportes generados, evitando URLs públicas permanentes.
- **Validación de entrada** en todos los endpoints, con funciones de parseo propias por dominio (por ejemplo `execution-input.ts`) que rechazan con `400` cualquier campo desconocido o fuera de rango antes de abrir la transacción; todas las consultas son SQL parametrizado. Con los adjuntos se aplicarán también los límites del PRD (hasta 5 imágenes por bug, 5 MB por archivo, formatos JPEG/PNG/WebP/GIF). Como una URL prefirmada no puede imponer el número de imágenes ni el tipo, esa comprobación se hace en la aplicación.
- **Reportes seguros por construcción**: el HTML escapa todo texto de usuario, la biblioteca PDF no interpreta marcado, y ambos se construyen desde un objeto de datos con lista blanca de campos que no incluye secretos ni elementos de la papelera ([ADR 0006](docs/adr/0006-report-generation.md)).
- **HTTPS end-to-end** entre cliente, frontend y API, tanto en tráfico REST como en los streams SSE.

**Implementado a la fecha de la entrega 2:**
- **RBAC:** guards de rol de proyecto y de Owner de workspace.
- **Aislamiento entre tenants:** RLS forzada en todas las tablas de tenant, con roles separados para la API, el worker y las migraciones.
- **Autenticación:** verificación del JWT de Clerk en cada petición.
- **Secretos:** cifrado de sobre con revelado auditado y limitado en frecuencia.
- **Log de actividad:** inmutable.
- **Papelera:** purga a los 30 días.

**Pendiente, ligado a funciones aún no construidas:**
- invitaciones
- URLs firmadas (adjuntos)
- reportes seguros
- HTTPS, que llega con el hosting

**Límites conocidos:** quien obtenga el entorno de la aplicación obtiene también la clave maestra (hasta adoptar KMS), un Contributor puede revelar contraseñas de entorno por diseño (por eso se auditan en lugar de impedirse), y un superusuario de la base de datos podría alterar el log de actividad.

### **2.6. Tests**

> Describe brevemente algunos de los tests realizados

Cada cambio de OpenSpec incluye sus propios tests en sus tareas, y una tarea solo se marca como hecha cuando su verificación pasa. A la fecha de la entrega 2 hay unos 90 ficheros de test:

- **API: 41 ficheros, Jest + Supertest.** Se dividen en tests unitarios de reglas de dominio y tests e2e que levantan el `AppModule` real contra el PostgreSQL de docker-compose. Solo se simula la verificación del token de Clerk.
  - **Unitarios:** la máquina de estados de ejecuciones, las reglas de bugs y de proyectos, el orden fraccionario, el cifrado y los guards.
  - **Aislamiento entre tenants** (`tenant-isolation.e2e-spec.ts` y un arnés reutilizable): para cada tabla de tenant, las lecturas en el contexto del workspace A no ven datos del workspace B, una escritura cruzada se rechaza, y sin contexto de tenant se obtienen cero filas.
  - **Integridad:** el log de actividad sobrevive al borrado de entidades. Los secretos se guardan solo cifrados, y cada revelado escribe su entrada de auditoría en la misma transacción.
  - **Ciclo de vida:** las transiciones válidas e inválidas (`409`), los permisos por rol, el temporizador con pausas, los snapshots al iniciar, el cierre automático y el sign-off.
- **Worker: 5 ficheros, Jest.** Cubren el contexto de tenant, el crontab, el cierre ordenado, el encolado transaccional por la lista blanca (`enqueue_job`) y la purga de la papelera: plazo de 30 días, orden de dependencias, entrada de actividad del sistema e idempotencia.
- **Web: 43 ficheros, Vitest + React Testing Library.** Cubren:
  - el árbol de carpetas con drag-and-drop
  - el detalle de ejecución (temporizador, sondeo y acciones por rol)
  - los modales de alta
  - los filtros por etiqueta
  - la protección de rutas
  - las utilidades puras: parser Gherkin, tiempo transcurrido y vistas de lista
- **Base de datos en CI:** se aplican todas las migraciones y se comprueba la cobertura de RLS (sección 2.4).

Pendiente:
- tests end-to-end de navegador con Playwright para los recorridos críticos
- un test explícito de que el log de actividad rechaza `UPDATE` y `DELETE`
- ejecutar las suites en CI

---

## 3. Modelo de Datos

### **3.1. Diagrama del modelo de datos:**

> Recomendamos usar mermaid para el modelo de datos, y utilizar todos los parámetros que permite la sintaxis para dar el máximo detalle, por ejemplo las claves primarias y foráneas.

Este modelo refleja el [PRD v1.1](PRD.md) y los ADR [0002](docs/adr/0002-authentication-and-workspace-membership.md) (identidad y membresías), [0003](docs/adr/0003-tenant-isolation.md) (aislamiento por tenant), [0004](docs/adr/0004-secrets-storage.md) (secretos), [0006](docs/adr/0006-report-generation.md) (reportes) y [0007](docs/adr/0007-activity-log-and-trash-purge.md) (log de actividad y papelera). Toda tabla de tenant lleva `workspace_id` y las de papelera llevan `deleted_by`: ambas son claves foráneas (a `WORKSPACE` y a `USER`) que **no se dibujan como líneas** para no saturar el diagrama, pero sí figuran en cada entidad. `ACTIVITY_ENTRY` no tiene relaciones a propósito: no usa claves foráneas.

> **Estado de la implementación (entrega 2):** el diagrama describe el modelo objetivo del producto completo. Las migraciones `0001`–`0014` ya crean:
> - `workspace`, `user`, `workspace_membership`, `workspace_dek` (la `WORKSPACE_KEY` del diagrama) y `project`, con `user.last_project_id` para el proyecto activo ([ADR 0017](docs/adr/0017-active-project.md))
> - `project_membership`, `folder`, `test_case`, `tag`, `test_case_tag` y `bug_tag`
> - `environment`, `environment_credential`, `test_execution`, `test_run` y `bug`
> - `activity_entries`
>
> Difieren del diagrama en tres puntos:
> - El árbol de carpetas admite **4** niveles (enmienda del PRD §2.3).
> - Un run guarda solo su resultado (`outcome`) y sus snapshots. Todavía no hay `TestRunAttempt` ni `TestRunStep`, y el paso fallido se guarda en el bug (`failed_step_snapshot`).
> - El orden de carpetas y casos usa claves fraccionarias. Los runs usan una posición entera que se renumera al reordenar ([ADR 0014](docs/adr/0014-drag-and-drop-and-ordering.md)).
>
> Aún no existen `INVITATION`, `PROJECT_SETTINGS`, `BUG_IMAGE`, `HEALTH_SCORE_SNAPSHOT` ni `REPORT`.

```mermaid
erDiagram
    USER ||--o{ WORKSPACE_MEMBERSHIP : "has"
    WORKSPACE ||--o{ WORKSPACE_MEMBERSHIP : "has"
    WORKSPACE ||--o{ WORKSPACE_KEY : "encrypts with"
    WORKSPACE ||--o{ PROJECT : "contains"
    USER ||--o{ PROJECT_MEMBERSHIP : "has"
    PROJECT ||--o{ PROJECT_MEMBERSHIP : "has"
    PROJECT ||--o{ INVITATION : "issues"
    USER ||--o{ INVITATION : "sends"
    PROJECT ||--|| PROJECT_SETTINGS : "configured by"
    PROJECT ||--o{ FOLDER : "contains"
    FOLDER ||--o{ FOLDER : "nests"
    FOLDER ||--o{ TEST_CASE : "contains"
    PROJECT ||--o{ TAG : "defines"
    TEST_CASE ||--o{ TEST_CASE_TAG : "tagged"
    TAG ||--o{ TEST_CASE_TAG : "applied"
    BUG ||--o{ BUG_TAG : "tagged"
    TAG ||--o{ BUG_TAG : "applied"
    PROJECT ||--o{ ENVIRONMENT : "has"
    ENVIRONMENT ||--o{ ENVIRONMENT_CREDENTIAL : "has"
    PROJECT ||--o{ TEST_EXECUTION : "has"
    ENVIRONMENT |o--o{ TEST_EXECUTION : "used by"
    TEST_EXECUTION ||--o{ TEST_RUN : "contains"
    TEST_CASE |o--o{ TEST_RUN : "produces"
    TEST_RUN ||--o{ TEST_RUN_ATTEMPT : "has"
    TEST_RUN_ATTEMPT ||--o{ TEST_RUN_STEP : "has"
    PROJECT ||--o{ BUG : "tracks"
    TEST_RUN |o--o{ BUG : "surfaces"
    TEST_CASE |o--o{ BUG : "surfaces"
    BUG ||--o{ BUG_IMAGE : "has"
    PROJECT ||--o{ HEALTH_SCORE_SNAPSHOT : "records"
    PROJECT ||--o{ REPORT : "generates"
    PROJECT ||--o{ TEST_CASE : "owns"
    USER ||--o{ TEST_CASE : "creates"
    USER ||--o{ TEST_EXECUTION : "creates"
    USER |o--o{ TEST_EXECUTION : "signs off"
    USER ||--o{ BUG : "reports"
    USER ||--o{ REPORT : "requests"

    USER {
        uuid id PK
        string clerk_user_id UK
        string email UK
        string full_name
        timestamp email_verified_at "nullable, mirrored from Clerk"
        timestamp created_at
        timestamp updated_at
    }

    WORKSPACE {
        uuid id PK
        string name
        timestamp created_at
        timestamp updated_at
    }

    WORKSPACE_MEMBERSHIP {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        string role "Owner or Collaborator"
        timestamp created_at
    }

    WORKSPACE_KEY {
        uuid id PK
        uuid workspace_id FK
        int dek_version
        bytea wrapped_dek
        int master_key_version
        string status "Active or Retired"
        timestamp created_at
    }

    PROJECT {
        uuid id PK
        uuid workspace_id FK
        string name
        string slug "unique per workspace, immutable"
        uuid deleted_by FK "nullable"
        timestamp deleted_at "nullable, trash"
        uuid deletion_id "nullable, groups a deleted subtree"
        timestamp created_at
        timestamp updated_at
    }

    PROJECT_MEMBERSHIP {
        uuid id PK
        uuid workspace_id FK
        uuid project_id FK
        uuid user_id FK
        string role "Admin, Contributor or Viewer"
        timestamp created_at
    }

    INVITATION {
        uuid id PK
        uuid workspace_id FK
        uuid project_id FK
        uuid invited_by FK
        string email
        string role "Admin, Contributor or Viewer"
        string token_hash UK
        string status "Pending, Accepted, Declined or Revoked"
        uuid accepted_by FK "nullable"
        timestamp expires_at "7 days after last send"
        timestamp last_sent_at
        timestamp decided_at "nullable"
        timestamp created_at
    }

    PROJECT_SETTINGS {
        uuid project_id PK, FK
        uuid workspace_id FK
        boolean headless_default
        int execution_timeout_ms "nullable, roadmap"
        string screenshot_policy "nullable, roadmap"
        text context_for_ai "nullable, roadmap"
        string jira_url "nullable, roadmap"
        bytea jira_token_ciphertext "nullable, roadmap"
        string repo_url "nullable, roadmap"
        bytea repo_token_ciphertext "nullable, roadmap"
        string ai_provider "nullable, roadmap"
        string ai_model "nullable, roadmap"
        bytea ai_api_key_ciphertext "nullable, roadmap"
        int dek_version "nullable"
        timestamp updated_at
    }

    FOLDER {
        uuid id PK
        uuid workspace_id FK
        uuid project_id FK
        uuid parent_folder_id FK "nullable, self-reference, max depth 3"
        string name
        string position_key "fractional index"
        uuid deleted_by FK "nullable"
        timestamp deleted_at "nullable, trash"
        uuid deletion_id "nullable"
        timestamp created_at
        timestamp updated_at
    }

    TAG {
        uuid id PK
        uuid workspace_id FK
        uuid project_id FK
        string name
        string color
        timestamp created_at
    }

    TEST_CASE {
        uuid id PK
        uuid workspace_id FK
        uuid project_id FK
        uuid folder_id FK
        string name
        string source_type "Gherkin or Manual"
        string status "Draft, Ready or Deprecated"
        text gherkin_script "nullable"
        timestamp script_updated_at "drives Trend Reset"
        string position_key "fractional index"
        uuid created_by FK
        uuid deleted_by FK "nullable"
        timestamp deleted_at "nullable, trash"
        uuid deletion_id "nullable"
        timestamp created_at
        timestamp updated_at
    }

    TEST_CASE_TAG {
        uuid workspace_id FK
        uuid test_case_id PK, FK
        uuid tag_id PK, FK
    }

    ENVIRONMENT {
        uuid id PK
        uuid workspace_id FK
        uuid project_id FK
        string name
        string base_url
        string default_browser
        timestamp created_at
        timestamp updated_at
    }

    ENVIRONMENT_CREDENTIAL {
        uuid id PK
        uuid workspace_id FK
        uuid environment_id FK
        string alias
        string email
        bytea password_ciphertext "AES-256-GCM"
        int dek_version "key used to encrypt"
        timestamp created_at
        timestamp updated_at
    }

    TEST_EXECUTION {
        uuid id PK
        uuid workspace_id FK
        uuid project_id FK
        uuid environment_id FK "nullable, set null on delete"
        string environment_name_snapshot "nullable"
        string name
        text description "nullable"
        string status "Draft, Ready, InProgress, Paused, Completed, Done or Canceled"
        string run_mode "nullable, Manual or Automated, set at Run All"
        string browser "Chromium, Firefox or WebKit"
        int viewport_width
        int viewport_height
        string locale
        string timezone
        string app_version "nullable"
        boolean auto_create_bug_on_failure
        uuid created_by FK
        uuid signed_off_by FK "nullable"
        int elapsed_ms_accumulated "time before the last resume"
        timestamp last_resumed_at "nullable, timer runs while set"
        timestamp started_at "nullable"
        timestamp completed_at "nullable"
        timestamp signed_off_at "nullable"
        uuid deleted_by FK "nullable"
        timestamp deleted_at "nullable, trash"
        uuid deletion_id "nullable"
        timestamp created_at
        timestamp updated_at
    }

    TEST_RUN {
        uuid id PK
        uuid workspace_id FK
        uuid execution_id FK
        uuid test_case_id FK "nullable, set null on purge"
        string test_case_name_snapshot "nullable until execution starts"
        text gherkin_snapshot "nullable until execution starts"
        string position_key "fractional index"
        string status "Pass, Fail, NeedsReview or Pending"
        decimal ai_confidence "nullable"
        int duration_ms "nullable"
        timestamp created_at
        timestamp updated_at
    }

    TEST_RUN_ATTEMPT {
        uuid id PK
        uuid workspace_id FK
        uuid test_run_id FK
        int attempt_number
        string status
        timestamp started_at
        timestamp completed_at "nullable"
    }

    TEST_RUN_STEP {
        uuid id PK
        uuid workspace_id FK
        uuid test_run_attempt_id FK
        int position
        text step_text
        string outcome
        int duration_ms "nullable"
        text error_message "nullable"
    }

    BUG {
        uuid id PK
        uuid workspace_id FK
        uuid project_id FK
        uuid test_run_id FK "nullable, set null on purge"
        uuid test_case_id FK "nullable, set null on purge"
        string test_case_name_snapshot "nullable"
        uuid reporter_id FK
        string title
        string severity "Critical, High, Medium or Low"
        string status "Open, InProgress, Resolved, Closed or WontFix"
        text description "nullable"
        text steps_to_reproduce "nullable"
        text gherkin_snapshot "nullable"
        string failed_step_snapshot "nullable"
        uuid deleted_by FK "nullable"
        timestamp deleted_at "nullable, trash"
        uuid deletion_id "nullable"
        timestamp created_at
        timestamp updated_at
    }

    BUG_TAG {
        uuid workspace_id FK
        uuid bug_id PK, FK
        uuid tag_id PK, FK
    }

    BUG_IMAGE {
        uuid id PK
        uuid workspace_id FK
        uuid bug_id FK
        string storage_key "private bucket, signed reads"
        string content_type "JPEG, PNG, WebP or GIF"
        int size_bytes "max 5 MB"
        int position
        timestamp created_at
    }

    HEALTH_SCORE_SNAPSHOT {
        uuid id PK
        uuid workspace_id FK
        uuid project_id FK
        date snapshot_date
        int score "nullable, null means No data"
        string label "Healthy, AtRisk, Critical or NoData"
        jsonb components "pass rate, coverage, bug pressure, freshness"
        timestamp created_at
    }

    REPORT {
        uuid id PK
        uuid workspace_id FK
        uuid project_id FK
        uuid requested_by FK
        string report_type "ExecutionHtml, ExecutionPdf, OverviewPdf, TestCasesPdf, ExecutionsPdf or BugsPdf"
        jsonb parameters "execution id, time range"
        string status "Queued, Generating, Ready or Failed"
        string storage_key "nullable"
        text error_message "nullable"
        timestamp expires_at "nullable, retention open item"
        timestamp created_at
        timestamp completed_at "nullable"
    }

    ACTIVITY_ENTRY {
        uuid id PK "time-ordered"
        uuid workspace_id "no FK by design"
        uuid project_id "nullable, no FK by design"
        uuid actor_user_id "nullable, no FK by design"
        string actor_name_snapshot
        string action
        string entity_type
        uuid entity_id "no FK by design"
        string entity_name_snapshot
        string category "derived from entity type"
        jsonb details "nullable"
        timestamp created_at
    }
```

### **3.2. Descripción de entidades principales:**

> Recuerda incluir el máximo detalle de cada entidad, como el nombre y tipo de cada atributo, descripción breve si procede, claves primarias y foráneas, relaciones y tipo de relación, restricciones (unique, not null…), etc.

**Identidad y tenencia**

- **User**: cuenta individual, global (no pertenece a un tenant, por eso no lleva `workspace_id`). `email` y `clerk_user_id` únicos y no nulos. Clerk gestiona credenciales, verificación y sesiones (ADR 0002); esta tabla es un espejo con el estado de verificación. Las claves foráneas hacia `User` (autor, reporter, inviter…) no se anulan al salir de un workspace: el contenido se muestra como «Former member» cuando el usuario ya no tiene membresía.
- **Workspace**: raíz del tenant. No guarda `owner_id`: el propietario es la `WorkspaceMembership` con rol `Owner`, con un índice único parcial que impone **exactamente un Owner por workspace**, de modo que la transferencia de propiedad es una única transacción sobre dos filas y no puede quedar inconsistente.
- **WorkspaceMembership**: unión `User`–`Workspace` con rol `Owner` | `Collaborator`. Único `(workspace_id, user_id)`. Al eliminar a un Collaborator del workspace se eliminan también sus `ProjectMembership`.
- **WorkspaceKey**: clave de cifrado de datos (DEK) del workspace, almacenada **envuelta** por la clave maestra (ADR 0004). Único `(workspace_id, dek_version)`; `status` permite rotar (una `Active`, el resto `Retired` hasta re-cifrar).
- **Project**: unidad de organización del testing. `slug` único por workspace e inmutable. Borrado lógico (`deleted_at`, `deleted_by`, `deletion_id`); un proyecto en papelera solo lo restaura el Owner desde Workspace Settings.
- **ProjectMembership**: unión `User`–`Project` con rol `Admin` | `Contributor` | `Viewer`. Único `(project_id, user_id)`. El Owner es Admin implícito de todos los proyectos y no necesita fila.
- **Invitation**: invitación **a un proyecto** por email (ADR 0002). `token_hash` es el hash del token del enlace (nunca el token). `status` es `Pending`, `Accepted`, `Declined` o `Revoked`; **la expiración no se almacena como estado**: una invitación `Pending` con `expires_at` pasado se considera expirada al leerla. Reenviar actualiza `last_sent_at`, `expires_at` y el token. Aceptar es una transacción que crea `ProjectMembership` y, si falta, `WorkspaceMembership` Collaborator. Se consulta por una vía acotada al usuario (email verificado), no por el contexto de workspace (ADR 0003).
- **ProjectSettings**: relación 1—1 con `Project`. `headless_default` es lo único persistido y funcional hoy; el resto son columnas nulas reservadas para las funciones de roadmap del PRD §6.7 (integraciones, IA, timeout, screenshots). Los tokens y la clave de IA se guardan **solo como texto cifrado** y son de solo escritura (ADR 0004).

**Casos de prueba**

- **Folder**: nodo del árbol. Auto-referencia `parent_folder_id` (nulo = raíz); profundidad máxima 3, validada en la aplicación. `position_key` es un índice fraccionario (texto ordenable con collation `C`): mover una carpeta solo actualiza su propia fila. Borrado lógico; eliminar una carpeta marca todo su subárbol con el mismo `deletion_id`.
- **Tag**: etiqueta por proyecto, única por `(project_id, name)`. Se aplica a casos de prueba y a bugs mediante las tablas de unión **TestCaseTag** y **BugTag** (PK compuesta, ambas con `workspace_id`). Las ejecuciones no tienen etiquetas: el filtro por etiqueta del PRD §6.3.2 se resuelve a través de los casos de prueba que contienen.
- **TestCase**: unidad fundamental. Pertenece a un `Folder` (no nulo) y a un `Project`. `source_type` distingue Gherkin de Manual; `status` es su ciclo editorial. `script_updated_at` cambia solo al editar el script y alimenta la regla *Trend Reset* del PRD §6.2.3. `position_key` como en `Folder`. Borrado lógico. **No se puede eliminar mientras esté en una ejecución Draft, Ready, InProgress o Paused**: la comprobación se hace en la misma transacción que el borrado, bloqueando la fila del caso de prueba para que una ejecución creada en paralelo no lo incorpore a la vez.

**Entornos y ejecuciones**

- **Environment**: destino de ejecución (URL base, navegador por defecto), por proyecto. Se elimina de forma definitiva (no pasa por la papelera); las ejecuciones que lo usaban conservan `environment_name_snapshot` y `environment_id` pasa a nulo.
- **EnvironmentCredential**: uno o más juegos por `Environment`, únicos por `(environment_id, alias)`. `password_ciphertext` es AES-256-GCM cifrado en la aplicación con la DEK del workspace y ligado a `workspace_id` y a la fila (ADR 0004); `dek_version` indica la clave usada. La API nunca devuelve el valor salvo por el endpoint de *reveal*, que lo registra en el log de actividad en la misma transacción.
- **TestExecution**: lote de `TestRun` con ciclo de vida Draft → Ready → InProgress ⇄ Paused → Completed → Done / Canceled (PRD §6.3.4), modelado como máquina de estados en la capa de dominio (ADR 0005). `run_mode` se fija al pulsar Run All. **Temporizador con pausas**: `elapsed_ms_accumulated` guarda el tiempo hasta la última pausa y `last_resumed_at` (no nulo mientras corre) marca el inicio del tramo actual; el tiempo mostrado es `elapsed_ms_accumulated + (now − last_resumed_at)`. Borrado lógico.
- **TestRun**: una instancia de `TestCase` en una ejecución. Al pasar la ejecución a InProgress (y al reiniciarla) se rellenan `test_case_name_snapshot` y `gherkin_snapshot`; a partir de ahí el historial no depende de que el caso de prueba siga existiendo ni de sus ediciones posteriores. `test_case_id` es nulo tras purgar el caso de prueba. Al purgar una ejecución se eliminan sus runs, intentos y pasos.
- **TestRunAttempt / TestRunStep**: reintentos numerados de un run y resultado paso a paso (texto, resultado, duración, error). `position` de los pasos es un entero: siguen el orden del script y no se reordenan.

**Bugs**

- **Bug**: defecto con severidad y estado. `test_run_id` y `test_case_id` son nulos si el bug es manual o si el origen fue purgado; `test_case_name_snapshot`, `gherkin_snapshot` y `failed_step_snapshot` conservan el contexto. Borrado lógico; al purgarlo se eliminan sus imágenes del almacenamiento.
- **BugImage**: hasta 5 por bug (regla de aplicación), JPEG/PNG/WebP/GIF de hasta 5 MB. Guarda `storage_key` en un bucket privado con lecturas por URL firmada de vida corta, no una URL pública.

**Analítica, reportes y auditoría**

- **HealthScoreSnapshot**: una fila por proyecto y día, generada por un job programado; `score` nulo significa «No data». Único `(project_id, snapshot_date)`. Permite el gráfico de tendencia sin recalcular todo el histórico.
- **Report**: seguimiento de cada reporte generado (ADR 0006): tipo, parámetros, estado y `storage_key` del archivo final. `expires_at` gobierna la retención (valor pendiente, ver preguntas abiertas).
- **ActivityEntry**: registro **solo de inserción** (ADR 0007). Sin claves foráneas: referencia entidades por `entity_type` + `entity_id` y guarda instantáneas del nombre de la entidad y del actor, de modo que sobrevive a la purga de la papelera. `actor_user_id` nulo = acción del sistema. Se escribe en la misma transacción que el cambio que registra. Las restricciones (solo `INSERT`/`SELECT` para el rol de la aplicación y trigger contra `UPDATE`/`DELETE`) están en el ADR 0007.

**Reglas transversales**

- **Identificadores**: UUID v7 (ordenables en el tiempo) en todas las claves primarias.
- **Tenencia (ADR 0003)**: `workspace_id` en toda tabla de tenant, también en las hijas profundas (`TestRunStep`, `BugImage`…), para que la política RLS sea una única igualdad `workspace_id = current_setting('app.workspace_id')`.
- **Estados**: columnas de texto con restricción `CHECK`, no tipos `ENUM` de Postgres, para poder evolucionar los valores con migraciones simples.
- **Papelera**: columnas `deleted_at`, `deleted_by`, `deletion_id` en Project, Folder, TestCase, TestExecution y Bug. Las lecturas excluyen filas borradas por defecto; un job diario purga lo eliminado hace más de 30 días.
- **Fechas**: todas en UTC (`timestamptz`).
- **Índices destacados**: `TestRun (test_case_id, created_at desc)` para el historial y las señales de salud; `TestRun (execution_id, position_key)`; `ActivityEntry (workspace_id, project_id, created_at desc, id)` para paginación por cursor y `(workspace_id, entity_type, entity_id, created_at desc)` para los paneles de historial; `Bug (project_id, status, severity)`; `Invitation (lower(email), status)`; índices parciales `where deleted_at is null` en los listados.
- **Fuera del modelo de dominio**: las tablas de la cola de jobs (ADR 0005) viven en su propio esquema y no son de tenant.

---

## 4. Especificación de la API

> Si tu backend se comunica a través de API, describe los endpoints principales (máximo 3) en formato OpenAPI. Opcionalmente puedes añadir un ejemplo de petición y de respuesta para mayor claridad

**Convenciones comunes a los tres endpoints** (derivadas de los ADR [0002](docs/adr/0002-authentication-and-workspace-membership.md), [0003](docs/adr/0003-tenant-isolation.md) y [0007](docs/adr/0007-activity-log-and-trash-purge.md)):

- **Autenticación:** token de sesión de Clerk en `Authorization: Bearer`, verificado contra el JWKS de Clerk ([ADR 0009](docs/adr/0009-api-authentication-transport.md)). Toda petición sin sesión válida responde `401`.
- **Autorización:** un único módulo de políticas evalúa el rol de workspace y el de proyecto. Un rol insuficiente responde `403`.
- **Aislamiento entre tenants:** el workspace se deduce del recurso de la ruta (proyecto, ejecución…), nunca de un parámetro del cliente. Con RLS, un recurso de otro workspace es invisible, y uno en la papelera queda excluido de las lecturas; ambos responden **`404`**, no `403`, para no revelar su existencia.
- **Efectos comunes de toda escritura:** se registra una entrada en el log de actividad **en la misma transacción** y se emite un evento SSE a los suscriptores afectados.
- **Identificadores** UUID v7; `positionKey` es una clave de orden fraccionaria opaca (ver sección 3).

> **Estado de la implementación (entrega 2):** los tres endpoints existen. Difieren de esta especificación inicial en tres puntos:
> - **Rutas anidadas bajo el proyecto:** son `POST /projects/{projectId}/executions/{executionId}/run-all` y `POST /projects/{projectId}/bugs`, sin rutas por id suelto.
> - **Eventos SSE:** las escrituras todavía no emiten eventos; llegan con el cambio `sse-live-updates`, y mientras tanto la web refresca por sondeo.
> - **Modo Automated:** `run-all` solo acepta el modo `Manual` y rechaza `Automated` como no disponible (PRD §9).
>
> Las especificaciones vigentes, con todos sus escenarios, están en [`openspec/specs/`](openspec/specs/).

### 4.1. `POST /projects/{projectId}/test-cases` — Crear caso de prueba

```yaml
openapi: 3.0.3
paths:
  /projects/{projectId}/test-cases:
    post:
      summary: Crea un nuevo caso de prueba al final de una carpeta del proyecto
      tags: [TestCases]
      security:
        - bearerAuth: []
      parameters:
        - name: projectId
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [folderId, name]
              properties:
                folderId: { type: string, format: uuid }
                name: { type: string, example: "Login con credenciales válidas" }
                sourceType: { type: string, enum: [Gherkin, Manual], default: Manual }
                gherkinScript: { type: string, nullable: true }
      responses:
        "201":
          description: Caso de prueba creado en estado Draft
          content:
            application/json:
              schema:
                type: object
                properties:
                  id: { type: string, format: uuid }
                  projectId: { type: string, format: uuid }
                  folderId: { type: string, format: uuid }
                  name: { type: string }
                  status: { type: string, enum: [Draft, Ready, Deprecated] }
                  sourceType: { type: string, enum: [Gherkin, Manual] }
                  positionKey: { type: string, description: "Clave de orden fraccionaria" }
                  createdAt: { type: string, format: date-time }
        "401":
          description: Sin sesión válida
        "403":
          description: El usuario no tiene rol Contributor o superior en el proyecto (un Viewer no puede crear)
        "404":
          description: El proyecto o la carpeta no existe, está en la papelera o pertenece a otro workspace
        "422":
          description: Datos inválidos (por ejemplo nombre vacío)
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
```

**Ejemplo de petición:**
```json
POST /projects/8f2b.../test-cases
{
  "folderId": "3a91-...",
  "name": "Login con credenciales válidas",
  "sourceType": "Gherkin",
  "gherkinScript": "Given the user is on the login page\nWhen they submit valid credentials\nThen they are redirected to the dashboard"
}
```

**Ejemplo de respuesta (201):**
```json
{
  "id": "c7d4-...",
  "projectId": "8f2b-...",
  "folderId": "3a91-...",
  "name": "Login con credenciales válidas",
  "status": "Draft",
  "sourceType": "Gherkin",
  "positionKey": "a0",
  "createdAt": "2026-08-06T15:20:00Z"
}
```

### 4.2. `POST /executions/{executionId}/run-all` — Iniciar ejecución (Run All)

```yaml
openapi: 3.0.3
paths:
  /executions/{executionId}/run-all:
    post:
      summary: Inicia una ejecución en estado Ready
      description: >
        En una única transacción: valida el rol, transiciona la ejecución de Ready a InProgress,
        fija el modo, toma el snapshot (nombre y script) de cada test run, arranca el temporizador,
        registra la actividad y emite un evento SSE a quienes miran la ejecución.
      tags: [Executions]
      security:
        - bearerAuth: []
      parameters:
        - name: executionId
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [mode]
              properties:
                mode:
                  type: string
                  enum: [Manual, Automated]
                  description: "Automated está temporalmente deshabilitado (motor en reconstrucción)"
      responses:
        "200":
          description: Ejecución transicionada a InProgress
          content:
            application/json:
              schema:
                type: object
                properties:
                  id: { type: string, format: uuid }
                  status: { type: string, enum: [InProgress] }
                  runMode: { type: string, enum: [Manual, Automated] }
                  startedAt: { type: string, format: date-time }
                  lastResumedAt: { type: string, format: date-time, description: "Inicio del tramo actual del temporizador" }
                  elapsedMsAccumulated: { type: integer, description: "Tiempo acumulado antes del tramo actual (0 al iniciar)" }
                  serverTime: { type: string, format: date-time, description: "Hora del servidor al responder; el cliente la usa para corregir la deriva de su reloj en el temporizador" }
        "401":
          description: Sin sesión válida
        "403":
          description: El usuario es Viewer en el proyecto
        "404":
          description: La ejecución no existe, está en la papelera o pertenece a otro workspace
        "409":
          description: La ejecución no está en estado Ready
        "422":
          description: "Modo Automated solicitado mientras el motor está deshabilitado, o la ejecución no tiene test runs"
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
```

**Ejemplo de petición:**
```json
POST /executions/9c1a-.../run-all
{ "mode": "Manual" }
```

**Ejemplo de respuesta (200):**
```json
{
  "id": "9c1a-...",
  "status": "InProgress",
  "runMode": "Manual",
  "startedAt": "2026-08-06T15:25:00Z",
  "lastResumedAt": "2026-08-06T15:25:00Z",
  "elapsedMsAccumulated": 0,
  "serverTime": "2026-08-06T15:25:00Z"
}
```

### 4.3. `POST /bugs` — Crear bug (manual, opcionalmente desde un run)

```yaml
openapi: 3.0.3
paths:
  /bugs:
    post:
      summary: Crea un bug, opcionalmente pre-rellenado desde un test run fallido
      description: >
        Si se indica testRunId, el servidor deduce el caso de prueba y copia del run el nombre,
        el script Gherkin y el paso fallido; el cliente no envía esos valores. Las imágenes
        (hasta 5, JPEG/PNG/WebP/GIF, 5 MB cada una) se suben después con URLs prefirmadas.
      tags: [Bugs]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [projectId, title, severity]
              properties:
                projectId: { type: string, format: uuid }
                title: { type: string }
                description: { type: string, nullable: true }
                stepsToReproduce: { type: string, nullable: true }
                severity: { type: string, enum: [Critical, High, Medium, Low] }
                tagIds: { type: array, items: { type: string, format: uuid } }
                testRunId: { type: string, format: uuid, nullable: true }
      responses:
        "201":
          description: Bug creado
          content:
            application/json:
              schema:
                type: object
                properties:
                  id: { type: string, format: uuid }
                  projectId: { type: string, format: uuid }
                  title: { type: string }
                  status: { type: string, enum: [Open] }
                  severity: { type: string, enum: [Critical, High, Medium, Low] }
                  testRunId: { type: string, format: uuid, nullable: true }
                  testCaseId: { type: string, format: uuid, nullable: true }
                  reporterId: { type: string, format: uuid }
                  tagIds: { type: array, items: { type: string, format: uuid } }
                  createdAt: { type: string, format: date-time }
        "401":
          description: Sin sesión válida
        "403":
          description: El usuario no tiene rol Contributor o superior en el proyecto
        "404":
          description: El proyecto, el run o alguna etiqueta no existe, está en la papelera o pertenece a otro workspace
        "422":
          description: Datos inválidos, o el testRunId no pertenece al proyecto indicado
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
```

**Ejemplo de petición:**
```json
POST /bugs
{
  "projectId": "8f2b-...",
  "title": "Login con credenciales válidas",
  "severity": "High",
  "testRunId": "7e5c-..."
}
```

**Ejemplo de respuesta (201):**
```json
{
  "id": "b0a2-...",
  "projectId": "8f2b-...",
  "title": "Login con credenciales válidas",
  "status": "Open",
  "severity": "High",
  "testRunId": "7e5c-...",
  "testCaseId": "c7d4-...",
  "reporterId": "5d13-...",
  "tagIds": [],
  "createdAt": "2026-08-06T15:30:00Z"
}
```

_Otros endpoints previstos, fuera del máximo de tres de este formato y aún sin especificar: pausar y reanudar una ejecución (`pause` y `resume`, ver Ticket 2), invitaciones (crear, reenviar, revocar, aceptar, rechazar), revelar una credencial de entorno, papelera (listar, restaurar), reportes (solicitar, descargar) y los streams SSE._

---

## 5. Historias de Usuario

> Documenta 3 de las historias de usuario principales utilizadas durante el desarrollo, teniendo en cuenta las buenas prácticas de producto al respecto.

**Historia de Usuario 1 — Crear un caso de prueba**

**Como** Contributor de un proyecto,
**quiero** crear un caso de prueba, con su nombre y opcionalmente un script Gherkin, en la carpeta que elija,
**para** empezar a documentar los escenarios que hay que validar.

*Criterios de aceptación:*
- Dado que estoy en la pantalla de Test Cases, cuando hago clic en "+" o uso el menú contextual de una carpeta, entonces se abre el modal de creación con un selector de carpeta destino.
- Dado que el modal está abierto, cuando intento guardar sin nombre o sin carpeta destino, entonces se me indica qué falta y no se crea nada.
- Dado que indico el nombre y la carpeta (y, opcionalmente, un script Gherkin), cuando guardo, entonces el caso de prueba se crea con estado `Draft` y se abre su vista de detalle, con su ruta de carpetas, su estado y su tipo (Gherkin o Manual).
- Dado que acabo de crear el caso, cuando miro el árbol de carpetas, entonces aparece al final de la carpeta elegida.
- Dado que acabo de crear el caso, cuando abro el Activity Log, entonces veo una entrada con mi nombre, la acción y el caso creado.
- Dado que soy Viewer, cuando accedo a la pantalla de Test Cases, entonces no veo el botón "+" ni la opción de crear en el menú contextual.

**Historia de Usuario 2 — Crear una ejecución**

**Como** Contributor de un proyecto,
**quiero** crear una ejecución con un subconjunto de casos de prueba y una configuración concreta,
**para** preparar una sesión de pruebas reproducible bajo un entorno, un navegador y unos ajustes determinados.

*Criterios de aceptación:*
- Dado que estoy en Test Executions, cuando hago clic en "+", o que estoy en un caso de prueba y uso su botón "Run" para crear una ejecución nueva, entonces se abre el modal de nueva ejecución (con ese caso ya seleccionado si vengo del botón "Run").
- Dado que el modal está abierto, cuando intento guardar sin nombre o sin ningún caso de prueba seleccionado, entonces se me indica qué falta y no se crea nada.
- Dado que indico el nombre (obligatorio), una descripción opcional y selecciono uno o más casos de prueba con el selector de carpetas, cuando elijo entorno, navegador (Chromium, Firefox o WebKit), viewport, locale, timezone y si quiero crear bugs automáticamente al fallar, y guardo, entonces se crea una ejecución en estado `Draft` con un `TestRun` en estado `Pending` por cada caso seleccionado.
- Dado que no elijo ningún entorno, cuando guardo, entonces la ejecución se crea igualmente, sin entorno asignado.
- Dado que hay casos de prueba eliminados (en la papelera), cuando abro el selector de casos, entonces no aparecen como seleccionables.
- Dado que acabo de crear la ejecución, cuando miro la lista de ejecuciones, entonces aparece con su estado `Draft` y su detalle abierto; y en el Activity Log hay una entrada con mi nombre y la ejecución creada.
- Dado que soy Viewer, cuando accedo a Test Executions, entonces no veo el botón "+" ni el botón "Run" de los casos de prueba.

**Historia de Usuario 3 — Navegar de un bug al caso de prueba que lo originó**

**Como** miembro de un proyecto, con cualquier rol (incluido Viewer),
**quiero** ir desde un bug hasta el caso de prueba que lo originó,
**para** entender qué escenario falló y revisar su script actual.

*Criterios de aceptación:*
- Dado que abro el detalle de un bug vinculado a un caso de prueba, cuando miro la sección "Linked test case", entonces veo el nombre del caso como un enlace.
- Dado que hago clic en ese enlace, cuando se carga la página, entonces llego al detalle de ese caso de prueba en la pantalla de Test Cases, con su ruta de carpetas y su script.
- Dado que estoy en el detalle del caso, cuando uso el botón Atrás del navegador, entonces vuelvo al detalle del bug del que venía.
- Dado que soy Viewer, cuando sigo el enlace, entonces puedo ver el caso de prueba pero no editarlo.
- Dado que el bug se reportó de forma manual, sin partir de un run, cuando abro su detalle, entonces no hay enlace a ningún caso de prueba.
- Dado que el caso de prueba vinculado fue eliminado, cuando abro el bug, entonces el vínculo aparece como "deleted" y no es navegable.

---

## 6. Tickets de Trabajo

> Documenta 3 de los tickets de trabajo principales del desarrollo, uno de backend, uno de frontend, y uno de bases de datos. Da todo el detalle requerido para desarrollar la tarea de inicio a fin teniendo en cuenta las buenas prácticas al respecto. 

Los tres tickets forman un **corte vertical del ciclo de vida de una ejecución** (ejecutarla manualmente), en el orden en que se construyen: base de datos → backend → frontend. Continúan la Historia de Usuario 2, que cubre la creación de la ejecución: parten de una ejecución ya creada y construyen el paso siguiente (iniciarla, pausarla y reanudarla). Cada ticket lleva sus propios criterios de aceptación y cita los ADR que debe respetar.

**Tickets previos referenciados, no documentados aquí:**
- **RG-0**: tabla `activity_entry` de solo inserción y función `ActivityLogger.log(tx, …)` que escribe en la misma transacción que el cambio ([ADR 0007](docs/adr/0007-activity-log-and-trash-purge.md)).
- **RG-S**: endpoint de streams SSE y su autenticación ([ADR 0005](docs/adr/0005-realtime-and-background-jobs-v1.md); pregunta abierta A2).
- **RG-E**: `GET /executions/{executionId}` y el módulo de políticas de autorización ([ADR 0002](docs/adr/0002-authentication-and-workspace-membership.md)).
- **Migración base** con las tablas `workspace`, `user`, `project`, `test_case` y `environment`, y el script local que crea los roles de base de datos (sección 1.4).

**Definición de hecho común a los tres tickets:** el código pasa revisión; los tests indicados pasan en CI; no hay secretos ni datos personales en logs; y si cambia un contrato de la API, se actualiza la sección 4 de este documento.

> **Estado de la implementación (entrega 2):** los tickets se implementaron como cambios de OpenSpec.
> - **Tickets 1 y 2:** [`execution-lifecycle`](openspec/changes/archive/2026-10-25-execution-lifecycle/proposal.md).
> - **Ticket 3:** [`executions-screen`](openspec/changes/archive/2026-10-25-executions-screen/proposal.md).
>
> Queda pendiente la parte de tiempo real: la suscripción SSE del Ticket 3 y el ticket previo RG-S. El cambio [`sse-live-updates`](openspec/changes/sse-live-updates/proposal.md) ya está propuesto. Hasta entonces, la pantalla refresca por sondeo cada 5 s.

---

**Ticket 1 — Base de datos**

**Título:** Esquema de ejecuciones: temporizador con pausas, snapshots de runs y aislamiento por tenant (RLS)

**Historia relacionada:** Historia de Usuario 2 (crear una ejecución). Este ticket crea las tablas que esa historia necesita para guardar la ejecución y sus runs, y añade los campos que hacen posible el paso siguiente: el temporizador que no cuenta las pausas y el snapshot de cada run al iniciar.

**Contexto:** el ciclo de vida de una ejecución (Draft → Ready → InProgress ⇄ Paused → Completed → Done/Canceled, PRD §6.3.4) necesita persistir cuánto tiempo ha corrido de verdad, y el historial de un run no puede depender de que el caso de prueba original siga existiendo o no cambie ([readme sección 3](#3-modelo-de-datos)). Estas tablas son de tenant, por lo que deben nacer protegidas por RLS ([ADR 0003](docs/adr/0003-tenant-isolation.md)).

**Alcance — incluye:**
1. Tabla `test_execution` con todas las columnas de la sección 3, en particular `run_mode`, `elapsed_ms_accumulated` (entero, no nulo, por defecto 0), `last_resumed_at`, `started_at` y las columnas de papelera (`deleted_at`, `deleted_by`, `deletion_id`).
2. Tabla `test_run` con `test_case_id` anulable, `test_case_name_snapshot`, `gherkin_snapshot` y `position_key` (`text COLLATE "C"`).
3. Restricciones que hacen imposibles los estados incoherentes (ver más abajo).
4. Políticas RLS en ambas tablas, y el privilegio mínimo para el rol de la aplicación.
5. Un script de verificación que falla si alguna tabla con `workspace_id` no tiene RLS forzada y política, ejecutado en CI.
6. Datos de ejemplo para desarrollo: dos workspaces con ejecuciones en cada estado.

**Alcance — excluye:** la tabla del log de actividad (RG-0), `test_run_attempt` y `test_run_step`, y el job de purga de la papelera.

**Detalle técnico:**
- **Migración en SQL plano**, independiente del ORM (pregunta abierta B1), con su migración inversa.
- **Restricciones de `test_execution`:**
  ```sql
  CONSTRAINT status_valid CHECK (status IN ('Draft','Ready','InProgress','Paused','Completed','Done','Canceled')),
  CONSTRAINT elapsed_non_negative CHECK (elapsed_ms_accumulated >= 0),
  -- el temporizador corre solo mientras la ejecución está InProgress
  CONSTRAINT timer_only_in_progress CHECK ((status = 'InProgress') = (last_resumed_at IS NOT NULL)),
  CONSTRAINT run_mode_after_ready CHECK (status IN ('Draft','Ready') OR run_mode IS NOT NULL),
  CONSTRAINT run_mode_valid CHECK (run_mode IS NULL OR run_mode IN ('Manual','Automated'))
  ```
- **Integridad entre tenants:** `UNIQUE (id, workspace_id)` en `test_execution`, y en `test_run` la clave foránea compuesta `FOREIGN KEY (execution_id, workspace_id) REFERENCES test_execution (id, workspace_id) ON DELETE CASCADE`, de modo que un run no pueda apuntar a una ejecución de otro workspace.
- **Claves foráneas de origen:** `test_run.test_case_id … ON DELETE SET NULL` (los snapshots conservan el historial cuando se purga el caso de prueba); `test_execution.environment_id … ON DELETE SET NULL`.
- **RLS**, en ambas tablas:
  ```sql
  ALTER TABLE test_execution ENABLE ROW LEVEL SECURITY;
  ALTER TABLE test_execution FORCE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON test_execution
    USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
    WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);
  ```
  El `nullif(…, '')` evita el error de conversión que aparece cuando la conexión ya ha usado el ajuste en una transacción anterior. Sin contexto de tenant, la política no devuelve filas (falla cerrado).
- **Roles:** las tablas pertenecen al rol de migraciones; el rol `railgun_app` (sin `BYPASSRLS`, no propietario) recibe solo `SELECT, INSERT, UPDATE, DELETE` sobre ellas.
- **Índices:** `test_run (test_case_id, created_at DESC) WHERE test_case_id IS NOT NULL` (historial y señales de salud), `test_run (execution_id, position_key)`, `test_execution (project_id, status) WHERE deleted_at IS NULL`, y un índice por `workspace_id` en ambas.
- **Script de verificación de RLS:** consulta `pg_class` y `pg_policies` para listar tablas con columna `workspace_id` sin RLS forzada o sin política, y termina con código distinto de cero si hay alguna.

**Criterios de aceptación:**
- La migración se aplica sobre una base con la migración base y se revierte sin dejar objetos huérfanos.
- Como `railgun_app` con `app.workspace_id` = A, `SELECT` sobre `test_execution` devuelve solo filas de A; **sin** contexto devuelve cero filas; e insertar una fila con `workspace_id` de B falla.
- Se rechazan: una ejecución `InProgress` con `last_resumed_at` nulo; una `Paused` con `last_resumed_at` no nulo; `elapsed_ms_accumulated` negativo; un estado inexistente; y una ejecución `InProgress` sin `run_mode`.
- Insertar un `test_run` cuyo `workspace_id` no coincide con el de su ejecución falla.
- Al eliminar un caso de prueba, `test_run.test_case_id` pasa a nulo y los snapshots se conservan; al eliminar una ejecución, sus runs se eliminan en cascada.
- Añadir en un test una tabla con `workspace_id` y sin política hace fallar el script de verificación.

**Pruebas:** tests de integración contra un PostgreSQL real en contenedor (no un doble), con un caso por cada criterio anterior, y el script de verificación de RLS como paso de CI.

**Dependencias:** migración base; roles locales del script de la sección 1.4.

---

**Ticket 2 — Backend**

**Título:** Ciclo de vida de la ejecución: Run All, Pause y Resume como máquina de estados transaccional

**Historia relacionada:** continúa la Historia de Usuario 2 (crear una ejecución): parte de una ejecución en estado `Ready` y añade iniciarla (Run All), pausarla y reanudarla.

**Contexto:** hoy una ejecución solo se puede crear; este ticket la hace ejecutable en modo manual. Las reglas son de dominio y no dependen de la cola de jobs ([ADR 0005](docs/adr/0005-realtime-and-background-jobs-v1.md): el ciclo de vida es una máquina de estados en el dominio, persistida en la base de datos). El contrato de `run-all` ya está en la [sección 4.2](#42-post-executionsexecutionidrun-all--iniciar-ejecución-run-all).

**Alcance — incluye:** `POST /executions/{executionId}/run-all`, `POST /executions/{executionId}/pause` y `POST /executions/{executionId}/resume`.

**Alcance — excluye:** «Mark as Ready» y «Back to Draft», Cancel, la transición a Completed y Sign Off (pregunta abierta G6), el modo Automated, y la actualización del resultado de cada run.

**Detalle técnico:**
- **Función de transición pura** `transition(execution, action, actor, now)` en la capa de dominio, sin acceso a base de datos:

  | Acción | Desde | Hasta | Efecto sobre los campos |
  |---|---|---|---|
  | `run-all` | Ready | InProgress | `run_mode` = modo pedido, `started_at` = ahora, `last_resumed_at` = ahora, `elapsed_ms_accumulated` = 0 |
  | `pause` | InProgress | Paused | `elapsed_ms_accumulated` += (ahora − `last_resumed_at`) en ms; `last_resumed_at` = nulo |
  | `resume` | Paused | InProgress | `last_resumed_at` = ahora |

  Cualquier otra combinación estado/acción devuelve un error de dominio `invalid_transition`.
- **Reloj:** «ahora» es la hora de la transacción de la base de datos, nunca la del cliente. La respuesta incluye `serverTime` para que el cliente corrija la deriva de su reloj.
- **Una sola transacción por petición**, en este orden: abrir la transacción y fijar el contexto de tenant (`set_config('app.workspace_id', …, true)`, [ADR 0003](docs/adr/0003-tenant-isolation.md)); bloquear la fila de la ejecución con `SELECT … FOR UPDATE`; comprobar autorización; aplicar la transición; (solo `run-all`) tomar el snapshot; escribir la entrada de actividad con `ActivityLogger.log` (RG-0, acciones `execution.started`, `execution.paused`, `execution.resumed`); emitir el evento; confirmar.
- **Snapshot en `run-all`:** para cada `test_run` de la ejecución se copian `test_case_name_snapshot` y `gherkin_snapshot` desde su caso de prueba. Si algún caso de prueba no está disponible, se aborta con `409 test_case_unavailable`. Si la ejecución no tiene runs, `422 execution_empty` (PRD §6.3.4).
- **Evento en tiempo real:** `pg_notify('execution:{id}', {executionId, status})` **dentro** de la transacción, de modo que solo se entrega si se confirma ([ADR 0005](docs/adr/0005-realtime-and-background-jobs-v1.md)). El payload contiene solo identificadores.
- **Concurrencia:** el bloqueo de fila hace que dos `run-all` simultáneos den un `200` y un `409`.
- **Autorización** (módulo de políticas RG-E): Contributor o superior (PRD §3.2 y §6.3.4). Un Viewer recibe `403`. Un recurso de otro workspace o en la papelera responde `404` (RLS y filtro de borrado lógico).
- **Respuestas:** las tres devuelven `id`, `status`, `runMode`, `startedAt`, `lastResumedAt`, `elapsedMsAccumulated` y `serverTime`, como en la sección 4.2.

  | Código | Cuándo |
  |---|---|
  | 200 | Transición aplicada |
  | 401 | Sin sesión válida |
  | 403 | Usuario Viewer |
  | 404 | La ejecución no existe, está en la papelera o es de otro workspace |
  | 409 | `invalid_transition`, o `test_case_unavailable` |
  | 422 | Modo `Automated` (`automated_mode_unavailable`) o ejecución sin runs (`execution_empty`) |

**Criterios de aceptación:**
- Una ejecución `Ready` pasa a `InProgress` con el modo, `started_at`, `last_resumed_at` y `elapsed_ms_accumulated` = 0 esperados, y cada run tiene su snapshot.
- Tras `run-all`, esperar, `pause`, esperar, `resume` y `pause`, `elapsed_ms_accumulated` equivale a la suma de los tramos en ejecución y **no** incluye la pausa.
- Renombrar o editar el caso de prueba después de `run-all` no cambia el snapshot del run.
- Toda combinación no permitida de estado y acción devuelve `409`.
- Dos `run-all` concurrentes sobre la misma ejecución: uno `200`, otro `409`.
- Si la escritura de la actividad falla, no cambia ni el estado ni el timer y no se emite evento; si todo va bien, existe exactamente una entrada de actividad por transición.
- Un Viewer recibe `403`; un usuario de otro workspace recibe `404`.

**Pruebas:**
- **Unitarias** sobre la función de transición: tabla exhaustiva de pares estado/acción, y aritmética del temporizador con reloj simulado y varios ciclos de pausa y reanudación.
- **De integración** contra PostgreSQL real: todos los criterios anteriores, incluidos concurrencia, atomicidad (fallo forzado tras la transición) y entrega del evento solo tras el commit.
- **De aislamiento entre tenants:** una petición con la sesión del workspace A sobre una ejecución del B devuelve `404` ([ADR 0003](docs/adr/0003-tenant-isolation.md)).

**Dependencias:** Ticket 1, RG-0, RG-E.

**Fuera de alcance, pero relacionado:** la regla «un caso de prueba no se puede eliminar mientras esté en una ejecución Draft, Ready, InProgress o Paused» (PRD §2.11) se implementa en el ticket del borrado de casos de prueba; este ticket solo garantiza que `run-all` no falle en silencio si esa regla se incumple.

---

**Ticket 3 — Frontend**

**Título:** Cabecera de la ejecución: temporizador en vivo, acciones de ciclo de vida por rol y actualización en tiempo real

**Historia relacionada:** continúa la Historia de Usuario 2: implementa, en la vista de detalle de ejecución (PRD §6.3.3), lo que el usuario ve y hace después de crearla.

**Contexto:** el backend del Ticket 2 deja la ejecución en `InProgress` y guarda el tiempo acumulado; falta que el usuario lo vea y actúe. El temporizador se calcula en el navegador a partir de datos del servidor, sin emitir un evento por segundo ([ADR 0005](docs/adr/0005-realtime-and-background-jobs-v1.md)).

**Alcance — incluye:** el componente `ExecutionHeader` (nombre, descripción, insignia de estado con temporizador), los botones Run All, Pause y Resume, el diálogo de modo de ejecución, y la suscripción a cambios.

**Alcance — excluye:** la tabla de runs, el panel lateral, la barra de estadísticas, el cajón de consola, y los botones Mark as Ready, Cancel, Sign Off y Try Again.

**Detalle técnico:**
- **Temporizador:** el hook `useElapsedTimer({ elapsedMsAccumulated, lastResumedAt, serverTime })` devuelve `elapsedMsAccumulated + (ahoraCorregido − lastResumedAt)` mientras `lastResumedAt` no sea nulo, y el valor fijo `elapsedMsAccumulated` si lo es. `ahoraCorregido` = hora del cliente + (`serverTime` − hora del cliente al recibir la respuesta), para no depender de un reloj de cliente desajustado. Refresca una vez por segundo y se detiene al desmontar.
- **Formato** `HH:MM:SS`; el elemento lleva `role="timer"` y no anuncia cada segundo a lectores de pantalla.
- **Botones según estado y rol:**

  | Estado | Contributor / Admin | Viewer |
  |---|---|---|
  | Ready | **Run All** | nada |
  | InProgress | **Pause** | nada |
  | Paused | **Resume** | nada |

  **Run All** abre un diálogo con los modos Manual y Automated; Automated aparece deshabilitado con el aviso «en reconstrucción» (PRD §6.3.4).
- **Envío:** el botón se deshabilita mientras la petición está en curso, para evitar dobles envíos.
- **Errores:** `409` → aviso «La ejecución cambió de estado» y recarga de datos; `403` → oculta los botones; `422` → mensaje en el diálogo; error de red → botón reintentar.
- **Actualización en vivo:** el hook `useExecutionStream(executionId)` usa un cliente SSE basado en `fetch` (los `EventSource` nativos no envían cabecera `Authorization`; pregunta abierta A2) y, al recibir `execution.updated` o al **reconectar**, vuelve a pedir la ejecución completa (los eventos son avisos; el estado es la fuente de verdad). Ambos hooks se envuelven en `useExecution` para poder cambiar la librería de datos cuando se decida (pregunta abierta F6).
- **Estados de carga y error** de la propia cabecera (esqueleto y mensaje con reintento).

**Criterios de aceptación:**
- Con la ejecución `InProgress`, el temporizador avanza cada segundo desde el valor acumulado; al pausar se detiene en ese valor; al reanudar continúa desde él sin contar la pausa.
- Los botones que aparecen para cada estado y rol coinciden exactamente con la tabla anterior; un Viewer no ve ninguno.
- Si otro usuario pausa la ejecución, la cabecera lo refleja sin recargar la página, y tras un corte de conexión se recupera el estado correcto al reconectar.
- Con el reloj del navegador desajustado varios minutos, el temporizador muestra igualmente el tiempo correcto.
- Una respuesta `409` muestra el aviso y deja la cabecera en el estado real; no quedan botones bloqueados.

**Pruebas:**
- **Unitarias** del hook `useElapsedTimer` con temporizadores simulados: parado, en marcha, pausa, reanudación y desajuste de reloj.
- **De componente** (React Testing Library): matriz estado × rol de la tabla de botones, deshabilitado durante el envío, y cada rama de error.
- **Del hook de streams** con un flujo simulado: evento recibido, reconexión y refetch.
- **End-to-end** (Playwright, [sección 2.6](#26-tests)): iniciar, esperar, pausar, esperar y reanudar, comprobando con tolerancia que el tiempo mostrado excluye la pausa.

**Dependencias:** Ticket 2, RG-S (endpoint de streams) y RG-E (lectura de la ejecución).

---

## 7. Pull Requests

> Documenta 3 de las Pull Requests realizadas durante la ejecución del proyecto

**Cómo se organiza el trabajo:**
- **La unidad de trabajo es un cambio de [OpenSpec](https://github.com/Fission-AI/OpenSpec)**, no una PR. Cada uno tiene propuesta, especificación delta, diseño y tareas verificables, y se crea, implementa y archiva con `/opsx:propose`, `/opsx:apply` y `/opsx:archive`.
- **Cada entrega se publica en el curso como una PR** desde su rama `feature/entrega-N-gr`.
- **Los cambios archivados** (`openspec/changes/archive/`, 23 a la fecha) son el registro de lo construido, con el mismo nivel de detalle que una PR.

Estos son tres representativos, uno por capa:

**Pull Request 1 — `execution-lifecycle`: ciclo de vida de las ejecuciones (base de datos + backend)**

- **Alcance:**
  - Tablas `test_execution` y `test_run` (migración `0008`) con RLS, temporizador con pausas (`elapsed_ms_accumulated`, `last_resumed_at`) y snapshots del caso de prueba.
  - Máquina de estados Draft → Ready → In Progress ⇄ Paused → Completed → Done.
  - Resultados manuales de los runs.
  - Log de actividad en la misma transacción.
- **Decisiones clave:**
  - Cada transición es un único `UPDATE` condicionado al estado esperado. De dos peticiones concurrentes en conflicto, una gana y la otra recibe `409`.
  - La ejecución se completa automáticamente al dar resultado al último run pendiente, y el sign-off se rechaza mientras quede alguno en Needs Review. Este punto resolvía la pregunta abierta G6 y se registró en el [ADR 0012](docs/adr/0012-execution-completion-and-sign-off.md).
- **Tests:** e2e contra Postgres real para cada transición válida e inválida, permisos por rol, snapshots y temporizador.
- **Documentación:** [propuesta](openspec/changes/archive/2026-10-25-execution-lifecycle/proposal.md), [diseño](openspec/changes/archive/2026-10-25-execution-lifecycle/design.md) y [tareas](openspec/changes/archive/2026-10-25-execution-lifecycle/tasks.md).

**Pull Request 2 — `executions-screen`: pantalla de ejecuciones (frontend)**

- **Alcance:**
  - Pantalla `/executions` en vista dividida: lista ordenable y filtrable, y detalle.
  - **Detalle:**
    - temporizador en vivo calculado en el navegador y corregido por el desfase de reloj con el servidor
    - barra de estadísticas que filtra la tabla de runs
    - acciones del ciclo de vida según el rol
    - panel lateral del run para registrar resultados
    - panel de entorno con revelado auditado de credenciales
  - Modal de nueva y edición de ejecución (react-hook-form + zod).
- **Decisiones clave:**
  - Sondeo cada 5 s mientras la ejecución está en curso, en lugar de SSE, para no adelantar la infraestructura de tiempo real.
  - El cliente de API muestra el motivo exacto con el que el servidor rechaza una acción, por ejemplo «resolve every Needs Review run…».
  - Se dejaron registrados como diferidos el reordenado por drag-and-drop, Cancel y Try Again.
- **Tests:** Vitest + React Testing Library para el temporizador, el sondeo, la visibilidad de acciones por rol y el modal.
- **Documentación:** [propuesta](openspec/changes/archive/2026-10-25-executions-screen/proposal.md), [diseño](openspec/changes/archive/2026-10-25-executions-screen/design.md) y [tareas](openspec/changes/archive/2026-10-25-executions-screen/tasks.md).

**Pull Request 3 — `background-jobs`: cola de jobs, worker y purga de la papelera (infraestructura)**

- **Alcance:**
  - Graphile Worker ([ADR 0018](docs/adr/0018-queue-library.md)) instalado por las migraciones.
  - Rol `railgun_worker` de mínimo privilegio.
  - Función `enqueue_job` (`SECURITY DEFINER`, con lista blanca de tareas) para encolar en la misma transacción que el cambio.
  - Primer código del worker en `apps/worker`.
  - Job diario `trash_purge`: elimina definitivamente lo que lleva más de 30 días en la papelera, en orden de dependencias, con una entrada de actividad del sistema por elemento ([ADR 0007](docs/adr/0007-activity-log-and-trash-purge.md)).
- **Decisiones y hallazgos:**
  - Graphile Worker en lugar de pg-boss: encola con una llamada SQL, sin adaptador para Prisma 6.
  - Al arrancar el worker con su rol real se descubrió que Graphile activa RLS sin políticas en sus tablas privadas, algo que su documentación no menciona. Se añadieron políticas explícitas y quedó registrado en el ADR 0018.
  - El CI pasó a Node 22.
- **Tests:** Jest contra Postgres real para el plazo de 30 días, el orden de borrado, la idempotencia, el encolado por lista blanca y el cierre ordenado.
- **Documentación:** [propuesta](openspec/changes/archive/2026-10-27-background-jobs/proposal.md), [diseño](openspec/changes/archive/2026-10-27-background-jobs/design.md) y [tareas](openspec/changes/archive/2026-10-27-background-jobs/tasks.md).

