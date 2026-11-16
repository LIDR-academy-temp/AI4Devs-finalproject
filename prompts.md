> Detalla en esta sección los prompts principales utilizados durante la creación del proyecto, que justifiquen el uso de asistentes de código en todas las fases del ciclo de vida del desarrollo. Esperamos un máximo de 3 por sección, principalmente los de creación inicial o  los de corrección o adición de funcionalidades que consideres más relevantes.
Puedes añadir adicionalmente la conversación completa como link o archivo adjunto si así lo consideras

## Herramientas y modelos usados

| Herramienta | Modelo | Fase |
|---|---|---|
| Claude Code | Sonnet 5 y Sonnet 5.5 | Definición de la idea, investigación técnica (documentación de FirmAR/SIU, antecedentes académicos), decisiones de arquitectura y stack, redacción y verificación de la documentación de la Entrega 1 |
| Claude Code (flujo de diseño) | Sonnet 5 | Mockup interactivo de referencia visual, usado para detectar requisitos (no forma parte del repositorio) |
| Jira (vía MCP de Atlassian) | — | Carga y seguimiento del backlog en el proyecto `FIRDOC` |
| Cursor (agente) | Claude Opus 5.5 | Análisis de la devolución de la Entrega 1, cierre de contradicciones del readme, contrato `docs/openapi.yaml` y `CLAUDE.md` |
| Redocly CLI | — | Lint del contrato OpenAPI generado por la IA |
| OpenSpec 2.0 | — | Desarrollo guiado por especificaciones: propuesta, specs, diseño y tareas por cambio (Ticket 1a en adelante) |

En la Entrega 1 no se usaron subagentes ni comandos personalizados; el trabajo fue conversacional directo con Claude Code, más búsqueda y lectura web para la investigación de antecedentes y conectores MCP (GitHub, Atlassian). Desde la Entrega 2, el contexto de la IA se fija en `CLAUDE.md` (stack, fuentes de verdad, decisiones cerradas, comandos y la regla de un ticket por vez).

## Uso de IA por fase del ciclo de vida

| Fase | Uso de la IA | Control humano |
|---|---|---|
| Análisis | Investigación de FirmAR/SIU y antecedentes académicos; análisis de la devolución de la Entrega 1 | Elección del problema y de las decisiones de alcance |
| Diseño | Arquitectura, modelo, tickets y contrato OpenAPI escrito antes del código | Decisiones cerradas en `CLAUDE.md`; lint del contrato con Redocly |
| Implementación | Claude Code y Cursor, un ticket por vez, con `CLAUDE.md` y `docs/openapi.yaml` como contexto | Revisión de cada diff antes del commit |
| Pruebas | La IA genera primero los tests a partir de los criterios Dado/Cuando/Entonces (empezando por los rechazos del motor de firma) | Revisión de los tests antes de implementar; verificación del PDF con `pdfsig` |
| Despliegue | La IA redacta el `Dockerfile`, el `docker-compose.yml` y el workflow de GitHub Actions | Prueba local del compose y del pipeline |
| Mantenimiento | Revisión asistida de cada PR (agente de revisión en Cursor) y actualización del readme y de `prompts.md` al cerrar cada ticket | Aprobación final del PR |

## Índice

1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)
8. [Ajustes humanos sobre el output de la IA](#8-ajustes-humanos-sobre-el-output-de-la-ia)

---

## 1. Descripción general del producto

**Prompt 1:**
> "se puede hacer un proyecto que se pueda integrar o embeber dentro de otro para que cualquier sistema [...] pueda tener su firmador [...] ¿qué te parece esta idea?"

Claude investigó la documentación real de integración de FirmAR (página y PDF de especificación) para entender el flujo real (OAuth + envío de documento + callback) antes de opinar, en lugar de responder con suposiciones.

**Prompt 2:**
> "mi idea con esto es hacer el entregable del master, reutilizar en mi trabajo y si es un buen tema proponer de tesis de grado"

Este dato subió el nivel de exigencia de la documentación (justificación de decisiones, consideraciones legales y de seguridad), más allá del mínimo del máster.

**Prompt 3:**
> "viendo el mockup la idea es poder agarrar un documento previamente adjuntado en mi BD, firmarlo [...] y luego poder descargar [...] o bien que el doc quede como vigente [...] versionado que no pise pero sí quede como la versión activa"

Precisó el caso de uso real (documentos preexistentes, no archivos sueltos) y un requisito de versionado que el texto no había capturado.

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

**Prompt 1:**
> "¿se puede hacer un firmador propio, así como el Firmar, sin necesidad de conectar con ello? ¿o conviene adaptar eso y además hacer el firmador propio?"

Claude propuso el patrón central del proyecto: un "hub de firma" con proveedores intercambiables (motor propio PAdES + adaptador simulado del contrato de FirmAR), en lugar de forzar una sola opción.

**Prompt 2:**
> "actualmente en mi organismo usamos de front Angular [...] ¿se va a poder embeber al proyecto?"

Claude ajustó la decisión de frontend (React) sin descartarla, agregando una capa de compatibilidad (iframe / Web Component).

**Prompt 3:**
Pedido de investigar si existía un firmador comercial equivalente al de un proveedor de expedientes judiciales electrónicos ("hacer algo similar"), y posterior aporte de una investigación previa de un compañero de trabajo (conversación compartida con Claude) para **rearmar la propuesta** como servicio de firma digital institucional. Claude detectó que un token USB no es accesible desde un navegador ni desde un servidor y agregó un tercer proveedor (`token`) basado en un **agente local con PKCS#11**; de la investigación del compañero tomó la **firma diferida** (el servidor prepara el PDF y calcula el hash, el token firma solo el hash, el servidor incrusta la firma), que simplifica el agente y deja la validación en el servidor. No se reutilizó código de esa investigación. Claude verificó contra documentación pública las afirmaciones que sostienen el diseño (firma interrumpida de pyHanko, aviso de acceso a red local de Chrome 142 y su política empresarial) y marcó como **no verificado** el límite de documentos por operación del servicio remoto.

### **2.2. Descripción de componentes principales:**

Sin prompt dedicado: derivada de la conversación de 2.1. La usuaria eligió el stack (Python + pyHanko, FastAPI, React para el widget) entre las alternativas propuestas por Claude. Después pidió que el panel de administración fuera una aplicación **Angular con PrimeNG**, para usarlo también como ejemplo de cómo se embebe el widget desde Angular; Claude verificó que PrimeNG 22 pasó a una licencia comercial y propuso quedarse en PrimeNG 21 (MIT) con Angular 21. Con el proveedor `token` se sumaron el motor PAdES (preparar/completar), la validación de confianza y el Firmadoc Agent.

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

Sin prompt dedicado: derivada de la arquitectura de 2.1 (separación `backend/`, `widget/`, `frontend/` y `agent/`).

### **2.4. Infraestructura y despliegue**

Sin prompt dedicado: propuesta redactada por Claude como parte de la documentación; la viabilidad del despliegue on-premise queda pendiente de validar con el área de Sistemas del organismo adoptante.

### **2.5. Seguridad**

Sin prompt dedicado: redactada por Claude, incluyendo la nota de diseño sobre firma electrónica vs. firma digital bajo la Ley 25.506. Tras el cambio de propuesta, el proveedor `token` (certificado de una AC licenciada) produce firma digital y el proveedor `local` (autofirmado) queda como firma electrónica para demostraciones. Se sumaron validación de confianza, desafíos de un solo uso y controles de seguridad del agente local.

### **2.6. Tests**

Sin prompt dedicado: estrategia de tests redactada por Claude. Con el agente local se sumaron pruebas con SoftHSM (PKCS#11 por software, ejecutable en CI), casos de rechazo de la validación y verificación independiente con una herramienta ajena a pyHanko. Los supuestos no verificables se documentaron en la sección 2.7.

---

### 3. Modelo de Datos

**Prompt 1:**
El prompt de versionado de la sección 1 (Prompt 3) derivó en las entidades `Document` y `DocumentVersion`: versiones inmutables, append-only, con un puntero `current_version_id` que se actualiza sin pisar nada.

**Prompt 2:**
Pedido de la usuaria de dejar plasmada la firma **en lote** (varios documentos, una sola confirmación). Claude la modeló como `SignatureBatch`, que agrupa `SignatureRequest` existentes sin cambiar el mecanismo de firma ni de versionado por documento.

**Prompt 3 (Entrega 2, implementación del Ticket 3):**
> "ok" (aprobación del plan: empezar por el Ticket 3 — `docker-compose.yml` con PostgreSQL, `.env.example`, modelos SQLAlchemy, migración Alembic con triggers append-only y seed)

Con `CLAUDE.md` y la sección 3 del readme como contexto, el agente de Cursor:
- Escribió los modelos y una migración inicial a mano, sin autogenerar, para que quede congelada e incluya los triggers.
- Escribió 17 tests de integración contra PostgreSQL real que cubren los criterios del ticket: rechazo de `UPDATE`, `DELETE` y `TRUNCATE` sobre `document_version` y `audit_event`; mover `current_version_id` sin tocar versiones; `downgrade base`; y seed idempotente.
- Agregó invariantes que se desprenden del modelo: desafío de un solo uso, `origin = signed` solo con una solicitud de firma, formato del CUIL y `signed_at` solo en estado `signed`.

Se verificó con `alembic check` que los modelos no difieren de la migración. Durante la implementación aparecieron dos huecos del modelo, que se resolvieron y documentaron en la sección 3.2:
- **Documentos del panel sin integrador:** `integrating_system_id` es nulo en los documentos y solicitudes cargados desde el panel.
- **Auditoría sin lotes:** `audit_event.signature_request_id` es `NOT NULL` hasta que exista `SignatureBatch`.

---

### 4. Especificación de la API

**Prompt 1:**
Tras el requisito de versionado, se ajustaron `POST /signature-requests`, `GET /signature-requests/{id}` y el webhook para incluir `document_id`, `external_document_id`, `version_number`, `is_active_version` y `download_url`. Con la firma diferida, el flujo principal pasó a `create` / `prepare` / `complete`; se agregaron `POST /signature-batches`, el cambio de estado del documento y la verificación como endpoints adicionales.

**Prompt 2 (Entrega 2, a partir de la devolución):**
> "antes de empezar con el código, intenta analizar la devolución de la entrega 1 [...] de forma tal ver qué corregir o reforzar"

La revisión pedía el contrato en formato OpenAPI. La IA escribió `docs/openapi.yaml` (OpenAPI 3.1) con los endpoints del hito 1, el de carga del panel (`POST /admin/signing-uploads`, que antes solo figuraba en las historias), la descarga de versiones y el webhook como `callback`. También unificó `prepare` / `complete` para que `local` y `token` usen el mismo flujo (con `local` se omiten el certificado y las firmas). El contrato se validó con Redocly y se corrigieron los errores que marcó.

**Prompt 3 (Entrega 2, Ticket 1a con desarrollo guiado por especificaciones):**
> "me gustaría instalar primero OpenSpec y aplicar ese cambio del Ticket 1 con SDD" y luego `/openspec-apply-change`

Se instaló OpenSpec (esquema `spec-driven`) y se acotó el change `add-document-upload` al sub-ticket 1a. La IA redactó `proposal.md`, tres specs con escenarios WHEN/THEN (`api-access`, `document-intake` y `document-versions`), un `design.md` con ocho decisiones y 21 tareas ordenadas con los tests primero. Después las implementó una por una con `openspec-apply-change`, comprobando antes de cada implementación que los tests fallaban:
- `POST /api/v1/admin/signing-uploads` (panel, multipart), `POST /api/v1/signature-requests` (integrador, JSON con base64 o `document_id`) y `GET /api/v1/documents/{id}/versions/{n}/download`, sobre un único servicio de alta (`app/services/intake.py`).
- Validación del PDF con pyHanko antes de abrir la transacción, credenciales como dependencias de FastAPI y token del enlace de firma con HMAC en el fragmento de la URL.
- 120 tests (unitarios y de integración contra PostgreSQL), `alembic check` sin diferencias y `openspec validate --strict`. La verificación manual con `curl` confirmó que el SHA-256 del PDF descargado coincide con el cargado.

---

### 5. Historias de Usuario

**Prompt 1:**
Pedido de la usuaria de que la firma **parta, en general, de cargar un PDF desde el navegador** (uno o varios; con varios se firman en lote), manteniendo el camino por sistema integrador como variante (HU 1b). Se reescribió la historia 1 y sus criterios de aceptación.

**Prompt 2:**
Corrección de la usuaria: descarga y versionado no son alternativas ("y/o"), deben darse **siempre juntas** en toda firma completada. Se ajustaron los criterios de aceptación de las historias 1 a 4.

La usuaria también precisó el lote: el resultado puede ser **parcial** («2 de 3 firmados»), con descarga de los firmados y reintento de los fallidos, y la firma remota no se admite por lote. Pidió además que el panel muestre el origen de cada documento (individual o lote) y su detalle como **cadena de custodia**, y que permita gestionar los sistemas integradores y sus claves.

**Prompt 3:**
La firma en lote se priorizó como *should-have*, no *must-have*, siguiendo la disciplina de alcance de MVP de la Lección 1. Tras el cambio de propuesta se reordenó el backlog: la firma con token y el motor propio (para recorrer los flujos sin hardware) son *must-have*; FirmAR pasó a *should-have*. Se incorporaron los estados de documento `borrador → pendiente de firma (con fecha límite) → firmado` y el listado de firmantes, a propuesta de Claude tras revisar el manual público de un sistema de expediente electrónico judicial; Claude dejó explícito que el comportamiento al vencer el plazo no está definido por la fuente y debe acordarse con cada integrador.

---

### 6. Tickets de Trabajo

**Prompt 1:**
Los tickets de backend, frontend y base de datos se redactaron con tareas, criterios de aceptación y estimación, y se actualizaron tras el cambio de versionado y de propuesta (flujo `prepare`/`complete`). El agente local quedó como ticket adicional, fuera de los 3 detallados.

**Prompt 2 (Entrega 2, a partir de la devolución):**
La revisión señaló que el ticket de backend concentraba demasiado y que el agente local no tenía ticket propio. La IA dividió el backend en cuatro sub-tickets ordenados por hito: carga y versionado, motor PAdES con proveedor `local`, validación de confianza, y auditoría con webhook. Con eso la épica pasó de 14 h a 34 h. Además detalló el agente como Ticket 4, con criterios verificables con SoftHSM, y separó el widget en hito 1 (firma propia) y hito 2 (token).

---

### 7. Pull Requests

Pendiente: se completará con los Pull Requests de la Entrega 2 y la Entrega final.

---

## 8. Ajustes humanos sobre el output de la IA

- La **idea de negocio y el dominio del problema** (firma digital embebible para organismos públicos) los aportó íntegramente la usuaria, a partir de un dolor real de su trabajo; la IA lo analizó y estructuró.
- La usuaria **corrigió el alcance del embebido**: Claude había asumido React como única pieza de frontend; al informar que su organismo usa Angular, se separó la "implementación interna del widget" de la "superficie de embebido" (iframe / Web Component).
- La usuaria **eligió explícitamente el stack** entre las opciones propuestas.
- Los **datos de identidad del proyecto** (nombre, iniciales, nombre "Firmadoc") los aportó la usuaria.
- Por **confidencialidad**, a pedido de la usuaria se removió toda mención al nombre del organismo empleador, usando referencias genéricas.
- El requisito de **versionado** lo detectó la usuaria al revisar visualmente el mockup interactivo de referencia visual (no incluido en el repositorio), no desde una especificación escrita: un prototipo temprano destapó un requisito que el texto no había capturado.
- Claude redactó una primera versión con descarga y versionado como alternativas; la usuaria lo **corrigió** (deben darse siempre ambos).
- La firma **en lote** fue pedido de la usuaria; la priorización como *should-have* fue decisión de la IA y la usuaria no la corrigió.
- Por confidencialidad, el README cita el paper académico utilizado como antecedente pero no nombra al organismo, a la provincia ni al proveedor comercial de referencia.
- La usuaria **pidió el PIN "en el medio de la pantalla sobre el diálogo de Angular"**; Claude explicó que el PIN no puede ingresarse en el navegador (invariante de seguridad del proyecto) y lo resolvió en la ventana nativa del agente: mínima (titular y PIN), centrada y siempre al frente. También se decidió poder **simular la firma con token** mediante un token de software, para que un revisor recorra los flujos sin hardware.
- La usuaria **decidió que el CUIL del certificado no se coteja con el del firmante por defecto** (firma quien tiene el token y su PIN; la firma registra el certificado usado), dejando el cotejo como opción de configuración.
- Pendiente de revisión humana antes de cerrar la Entrega 1: validar que las estimaciones de horas por ticket sean realistas y confirmar la viabilidad del despliegue on-premise.

### Ajustes tras la devolución de la Entrega 1

- **Alcance recortado** según la revisión. El MVP queda en un único camino: carga de PDF, firma con `local` por `prepare` / `complete`, y descarga y versión vigente. El agente con SoftHSM pasa a ser el hito 2; lote, FirmAR, TSA, Web Component, OAuth2 y reintentos de webhooks pasan a la versión 2.
- La IA detectó cuatro contradicciones (las mismas que la revisión) y propuso opciones. **Cada decisión la tomó el autor:**
  - El CUIL **no se coteja por defecto**; se activa con `FIRMADOC_REQUIRE_CUIL_MATCH=true`. Se ratifica la decisión anterior y se corrigen las secciones que decían lo contrario.
  - **PostgreSQL en todos los entornos**, con los PDF **dentro de la base** (`bytea`). Se descarta SQLite y el object storage.
  - La URL del webhook se guarda **por solicitud** (`SignatureRequest.callback_url`).
  - El formulario de carga del panel **pide nombre y CUIL del firmante**, para que toda solicitud tenga un `Signer`.
- La IA propuso un nivel PAdES B-B en el MVP (sin TSA), como recomendó la revisión, y el autor lo aceptó.

### Ajustes durante la implementación

- **Ticket 3:** un test generado por la IA esperaba que un CUIL con guiones fuera rechazado por el `CHECK` (`IntegrityError`). Al ejecutarlo contra PostgreSQL real, el rechazo llegó antes por la longitud de la columna (`DataError`). Se corrigió el test para aceptar cualquier rechazo de la base: la protección existe en las dos capas. Es un ejemplo de por qué los tests corren contra la base real y no contra mocks.
- **Ticket 1a (herramientas):** `TestClient` de Starlette emitía un aviso de obsolescencia con `httpx`; se reemplazó por `httpx2` en `requirements-dev.txt`. La tarea de prueba manual decía `uvicorn app.main:app`, pero la app se construye con una fábrica (`create_app(settings)`) para que los tests inyecten su configuración; se corrigió a `uvicorn app.main:create_app --factory`.
- **Ticket 1a (test corregido):** un test generado por la IA afirmaba que el corte previo sobre el texto base64 coincidía exactamente con el tamaño máximo. Base64 codifica de a 3 bytes, así que 1000 y 1001 bytes ocupan lo mismo. Se corrigió el test para comprobar lo que el diseño pedía: el corte previo es una cota superior que nunca rechaza un archivo válido, y el límite exacto se aplica después de decodificar.
- **Ticket 1a (escenario reubicado):** el escenario «token de enlace de otra solicitud» se probó en los tests de descarga, con documentos reales, y no con un endpoint de prueba, porque es ahí donde se aplica la regla.
