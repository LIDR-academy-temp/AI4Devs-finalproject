> Detalla en esta sección los prompts principales utilizados durante la creación del proyecto, que justifiquen el uso de asistentes de código en todas las fases del ciclo de vida del desarrollo. Esperamos un máximo de 3 por sección, principalmente los de creación inicial o  los de corrección o adición de funcionalidades que consideres más relevantes.
Puedes añadir adicionalmente la conversación completa como link o archivo adjunto si así lo consideras


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

> Quiero documentar un producto nuevo llamado CondoManager: una plataforma de administración financiera y gestión de condominios horizontales con amenidades. Escribe un PRD (`docs/prd.md`) y un documento de especificación funcional del MVP (`docs/mvp.md`) que cubran el problema de negocio (desconfianza del condómino hacia la administración por falta de transparencia financiera), los perfiles de usuario, los principios de consistencia financiera (no borrar historia, trazabilidad, saldo explicable, reportes derivados del mismo dato, explicabilidad en lenguaje llano), y el alcance del MVP 1 con un piloto confirmado: una administradora profesional operando en México.

**Prompt 2:**

> Robustece `docs/prd.md` y `docs/mvp.md` agregando épicas (E1-E8), requisitos funcionales numerados (RF-1 a RF-30) mapeados a cada épica, requisitos no funcionales (RNF-1 a RNF-10), restricciones (RC-1 a RC-8) y métricas de éxito (ME-1 a ME-7). El contenido debe ser idéntico entre ambos documentos y no debe romper las referencias cruzadas ya existentes hacia `architecture.md` y `data-model.md`.

**Prompt 3:**

> Actúa como un revisor adversarial de `docs/prd.md` y `docs/mvp.md`: identifica supuestos no validados, requisitos ambiguos o no verificables, scope creep oculto y métricas de éxito que no se puedan medir objetivamente. Corrige cada hallazgo directamente en ambos documentos (marcando explícitamente los supuestos críticos como tales) y aplica el mismo criterio de sincronización entre los dos archivos.

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

**Prompt 1:**

> A partir de `docs/prd.md` y `docs/mvp.md`, diseña la arquitectura del sistema para el MVP 1 en `docs/architecture.md`. Decide si el sistema debe ser un monolito o microservicios, justificando la decisión con las restricciones reales del dominio (un ledger financiero con escrituras atómicas, un solo piloto, equipo reducido), e incluye un diagrama de alto nivel con los módulos del backend, la base de datos y los workers en segundo plano.

**Prompt 2:**

> Convierte el diagrama de arquitectura de `docs/architecture.md` §2 a formato Mermaid (`graph TB`) para incluirlo en `docs/plantilla.md` §2.1, manteniendo los mismos módulos y flujos, y agrega explícitamente los beneficios y déficits asumidos de la decisión de monolito modular.

---

### **2.2. Descripción de componentes principales:**

**Prompt 1:**

> Descompón el monolito modular de `docs/architecture.md` en módulos por bounded context (Identidad y Acceso, Condominios y Propiedades, Configuración Financiera, Ledger Financiero, Pagos, Integración de Pasarelas de Pago, Ingresos y Egresos, Reportería, Explicabilidad, Configuración Regional). Para cada uno, describe su responsabilidad, qué datos posee y qué módulos tienen permitido escribir en el ledger de movimientos.

---

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

**Prompt 1:**

> El repositorio todavía solo contiene `docs/` (no hay código fuente). Propón la estructura de carpetas de `backend/` y `frontend/` consistente con el monolito modular por bounded context descrito en `docs/architecture.md` §3 (un directorio por módulo bajo `backend/src/modules/`, más `common/` y `test/`; `frontend/src/` con `pages`, `components` y `services`). Documenta esta estructura en `docs/plantilla.md` §2.3.

---

### **2.4. Infraestructura y despliegue**

**Prompt 1:**

> `docs/architecture.md` §9 solo confirma el stack tecnológico (Node.js/NestJS, PostgreSQL, Redis + BullMQ, React/Next.js) pero deja el proveedor cloud abierto. Concreta la infraestructura eligiendo Google Cloud Platform: Cloud Run para el backend y el worker, Cloud SQL para PostgreSQL, Memorystore para Redis, Artifact Registry + Cloud Build para CI/CD, y Secret Manager para credenciales. Documenta el diagrama de despliegue (Mermaid) y el flujo de CI/CD en `docs/plantilla.md` §2.4.

---

### **2.5. Seguridad**

**Prompt 1:**

> Documenta el modelo de seguridad del sistema en base a `docs/architecture.md` §8: autenticación/autorización OAuth2/OIDC con proveedor de identidad propio (sin IdP externo), autorización por rol y por relación usuario-propiedad validada en la capa de aplicación (no solo en UI), aislamiento multi-tenant por `condominio_id` con row-level security como defensa adicional, auditoría transversal de configuración financiera, idempotencia de webhooks de pago, y el hecho de que CondoManager nunca custodia fondos.

---

### **2.6. Tests**

**Prompt 1:**

> Documenta en `docs/plantilla.md` §2.6 el estado actual de testing del proyecto: indica explícitamente que no existe código ni suite de tests todavía, dado que el repositorio solo contiene documentación de producto y arquitectura.

---

### 3. Modelo de Datos

**Prompt 1:**

> Diseña el modelo de datos relacional para CondoManager en `docs/data-model.md`, derivado de `docs/architecture.md` y del patrón de ledger append-only: entidades de identidad (USUARIO, PERFIL, USUARIO_PROPIEDAD_RELACION), de condominios/propiedades, de configuración financiera (cuotas, cargos recurrentes, multas, tabulador, fraccionamiento), el ledger (MOVIMIENTO, PROPIEDAD_SALDO_PROYECTADO, EXPLICACION_MOVIMIENTO), pagos (PAGO_INTENTO, PAGO_ASIGNACION), ingresos/egresos y auditoría. Respeta las convenciones de `fecha_efectiva` vs. `creado_en`, importes siempre positivos con un campo `efecto` que determina el signo, y que ninguna tabla de ledger tenga `updated_at` de negocio.

**Prompt 2:**

> Revisa `docs/data-model.md`: el Administrador del Sistema debe tener visibilidad global sobre todos los condominios y propiedades, no mediada por `USUARIO_PROPIEDAD_RELACION` como el resto de los perfiles. Ajusta el modelo y su documentación para reflejar esta excepción.

---

### 4. Especificación de la API

**Prompt 1:**

> `docs/architecture.md` §2 dejaba abierto el estilo de API (REST vs. GraphQL). Confírmalo como REST / OpenAPI 3.0 y documenta 3 endpoints representativos en `docs/plantilla.md` §4, derivados de los requisitos funcionales ya definidos: saldo consolidado del usuario (`GET /api/v1/me/balance`, RF-2/RF-4), estado de cuenta de una propiedad con soporte de fecha de corte histórica (`GET /api/v1/properties/{propertyId}/statement`, RF-5/RF-6/RF-7), e inicio de un intento de pago (`POST /api/v1/payments/intents`, RF-19 a RF-22). Incluye ejemplos de respuesta realistas, incluyendo un movimiento con su explicación en lenguaje llano.

---

### 5. Historias de Usuario

**Prompt 1:**

> Descompón la épica E1 (identidad y acceso) y E2 (saldo consolidado y adeudos vencidos) de `docs/prd.md` en historias de usuario formato INVEST, una por archivo bajo `docs/backlog/e1/` y `docs/backlog/e2/`, con declaración Como/Quiero/Para y criterios de aceptación Dado/Cuando/Entonces cubriendo el happy path y los edge cases relevantes. Donde encuentres ambigüedades de alcance no resueltas en el PRD/MVP (orden de cargos vencidos, definición de "cargo vencido", corte de vencimiento, visibilidad del Administrador del Sistema, expiración de sesión, bloqueo por intentos fallidos), resuélvelas y refleja la decisión de vuelta en `prd.md`/`mvp.md`.

**Prompt 2:**

> Descompón la épica E3 (estado de cuenta histórico y explicable, RF-5 a RF-8) en 5 historias de usuario INVEST bajo `docs/backlog/e3/`, con criterios de aceptación Dado/Cuando/Entonces para el happy path y los edge cases revisados (consulta a fecha pasada, exclusión de movimientos que no existían aún, datos mínimos por movimiento, explicación en lenguaje llano, y explicación individual cuando se combinan varios ajustes en el mismo periodo).

---

### 6. Tickets de Trabajo

**Prompt 1:**

> Descompón las 18 historias de usuario de las épicas E1, E2 y E3 en tickets de trabajo técnicos, uno por unidad de trabajo que una persona pueda terminar en una sesión (media jornada máximo). Cada ticket debe tener un tipo (Endpoint/API, Migración/DB, Modelo/Dominio, Frontend o Test), una Definition of Done específica según su tipo, y sus dependencias con otros tickets. Guarda el resultado en `docs/backlog/e{1,2,3}/tickets.md`.

---

### 7. Pull Requests

**Prompt 1:**

_Pendiente._ El trabajo realizado hasta ahora corresponde únicamente a documentación de producto y arquitectura, creada directamente sobre `main`; todavía no se ha abierto ningún Pull Request de implementación. Esta sección debe completarse con los prompts reales usados para generar las primeras PRs una vez exista desarrollo de código.

**Prompt 2:**

**Prompt 3:**
