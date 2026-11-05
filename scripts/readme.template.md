# AI Job Match

> Un ATS (Applicant Tracking System) personal impulsado por Inteligencia Artificial para la búsqueda y calificación automatizada de empleo.

## Índice

0. [Ficha del proyecto](#0-ficha-del-proyecto)
1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)

> **Estado: Entrega 1 (documentación).** Todavía no hay código. Las secciones que dependen de la implementación (capturas, instalación verificada, despliegue y pull requests) se completan en las entregas 2 y final. La documentación detallada vive en [`docs/`](./docs/).

| Documento | Contenido |
| --- | --- |
| [`docs/vision.md`](./docs/vision.md) | Problema, hipótesis, alcance y exclusiones |
| [`docs/prd.md`](./docs/prd.md) | Requisitos del MVP (v0.2) |
| [`docs/prd-review.md`](./docs/prd-review.md) | Revisión adversarial del PRD |
| [`docs/architecture.md`](./docs/architecture.md) | Arquitectura, modelo de datos y API |
| [`docs/adr/`](./docs/adr/) | Decisiones de arquitectura (ADR-0001 a ADR-0008) |
| [`docs/architecture-review.md`](./docs/architecture-review.md) | Revisión adversarial de la arquitectura |
| [`docs/sdlc-checklist.md`](./docs/sdlc-checklist.md) | Compuertas del AI SDLC |
| [`docs/user-stories.md`](./docs/user-stories.md) | 5 épicas y 10 historias con @@SCENARIOS@@ escenarios de aceptación |
| [`docs/tickets.md`](./docs/tickets.md) | @@TICKET_COUNT@@ tickets de trabajo |
| [`docs/ai-log.md`](./docs/ai-log.md) | Registro completo de prompts |
| [`CLAUDE.md`](./CLAUDE.md) | Convenciones para los agentes de IA |

---

## 0. Ficha del proyecto

### **0.1. Tu nombre completo:**

Juan Reyes

### **0.2. Nombre del proyecto:**

**AI Job Match**: Un ATS (Applicant Tracking System) personal impulsado por Inteligencia Artificial para la búsqueda y calificación automatizada de empleo.

### **0.3. Descripción breve del proyecto:**

Panel web personal para buscar empleo en Estados Unidos. Recolecta ofertas automáticamente de los job boards de las empresas objetivo (Greenhouse y Ashby) y de búsquedas guardadas en un agregador, y también acepta ofertas pegadas a mano. Descarta las que no cumplen los criterios no negociables, calcula con Claude un puntaje de encaje explicado contra el currículum y gestiona cada candidatura en un pipeline con su historial.

### **0.4. URL del proyecto:**

[PENDIENTE: URL de la instancia de demostración en Railway, con datos sintéticos (ADR-0007). Se publica en la entrega final.]

### 0.5. URL o archivo comprimido del repositorio

<https://github.com/JR-DevHub/AI4Devs-finalproject-temp> — rama `feature/entrega-1-jr`.

---

## 1. Descripción general del producto

### **1.1. Objetivo:**

Buscar empleo exige revisar ofertas en muchos portales, decidir una por una si el perfil encaja y llevar el seguimiento de cada candidatura, cuyo historial queda disperso en el correo. El producto concentra las ofertas en un solo panel, filtra las que no sirven sin gastar IA, explica por qué una oferta encaja o no con el currículum y registra cada decisión y cada candidatura.

- **Para quién:** un profesional del software que busca empleo en EE. UU. (el propio autor; un solo usuario).
- **Hipótesis:** con ofertas concentradas, filtradas y puntuadas, la decisión de aplicar baja de ~15 min a menos de 2 min por oferta y no se pierde ningún seguimiento.
- **Métricas:** ver [`docs/prd.md`](./docs/prd.md), sección 2 (OBJ-1 a OBJ-5).

### **1.2. Características y funcionalidades principales:**

| Funcionalidad | Descripción | Prioridad |
| --- | --- | --- |
| Recolección automática de ofertas | Importa ofertas de los job boards de Greenhouse y Ashby (Lever como should-have) de las empresas objetivo, y ejecuta búsquedas guardadas en un agregador; evita duplicados y respeta un tope por sincronización. | Must-have |
| Ofertas pegadas a mano | La IA extrae título, empresa, ubicación, modalidad, salario, seniority y habilidades; el usuario puede corregirlos. | Must-have |
| Perfil del currículum | El currículum en Markdown se convierte en un perfil estructurado editable (PDF como should-have). | Must-have |
| Filtros duros sin IA | Rol, modalidad, ubicación, salario y seniority con reglas explícitas; un dato desconocido no descarta la oferta. | Must-have |
| Puntaje de encaje explicado | Puntaje de 0 a 100, etiqueta, fortalezas, brechas y evidencia verificada literalmente contra la oferta y el currículum. Automático para las ofertas pegadas y a pedido para las importadas. | Must-have |
| Control de gasto de IA | Registro del costo de cada llamada y topes diario y mensual configurables. | Must-have |
| Decisión por oferta | Aplicar (crea la candidatura) o descartar (con motivo); se mide el tiempo hasta la decisión. | Must-have |
| Pipeline de candidaturas | Tablero por estado accesible con teclado e historial inmutable. | Must-have |
| Correos y alertas | Clasificación de correos pegados y alertas de seguimiento. | Should-have |
| Interfaz en español | Interfaz en inglés con traducción al español. | Should-have |

### **1.3. Diagrama de flujo y experiencia de usuario:**

[PENDIENTE: capturas y video tras la Entrega 2.] Pantallas previstas: login, currículum, preferencias, empresas objetivo, búsquedas guardadas, lista de ofertas, detalle de oferta con filtro y puntaje, y tablero de candidaturas. Flujo principal:

@@SEQ@@

### **1.4. Instrucciones de instalación:**

> Comandos previstos; se verifican al crear el walking skeleton (ticket T-01 a T-05).

Requisitos: Node.js 24, pnpm, Docker y una clave de Claude API.

```bash
git clone https://github.com/JR-DevHub/AI4Devs-finalproject-temp.git
cd AI4Devs-finalproject-temp
pnpm install
cp apps/api/.env.example apps/api/.env      # completar ANTHROPIC_API_KEY, credenciales del usuario único, etc.
docker compose up -d db                      # PostgreSQL local
pnpm --filter api exec node ace migration:run
pnpm --filter api exec node ace db:seed      # crea el usuario único
pnpm dev                                     # API y SPA en modo desarrollo
```

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

@@DIAGRAM@@

**Patrón:** monorepo con dos aplicaciones (API REST en AdonisJS v7 y SPA en React 19) desplegadas en un solo contenedor; backend en capas (controladores → servicios de dominio → modelos) con puertos y adaptadores para las integraciones externas (Claude y plataformas de empleo).

**Beneficios:** frontera clara entre interfaz y API; mismo origen, sin CORS y con autenticación por cookie; un solo servicio y PostgreSQL como única infraestructura (también para la cola de trabajos); agregar una plataforma de empleo es implementar un adaptador.

**Sacrificios:** API y SPA escalan juntas; el worker comparte proceso con la API en el MVP; el polling del estado de los trabajos agrega peticiones. Detalle y alternativas en [`docs/adr/`](./docs/adr/).

### **2.2. Descripción de componentes principales:**

@@COMPONENTS@@

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

@@TREE@@

### **2.4. Infraestructura y despliegue**

@@INFRA@@

### **2.5. Seguridad**

@@SECURITY@@

### **2.6. Tests**

@@TESTS@@

---

## 3. Modelo de Datos

### **3.1. Diagrama del modelo de datos:**

@@ERD@@

@@INTEGRITY@@

### **3.2. Descripción de entidades principales:**

Convención: tablas y columnas en inglés y `snake_case`; claves primarias enteras autoincrementales.

@@ENTITIES@@

---

## 4. Especificación de la API

API REST bajo `/api/v1`, autenticada con cookie de sesión. Formato de respuesta `{ data, error, meta }`. Lista completa de endpoints en [`docs/architecture.md`](./docs/architecture.md), sección 4. Endpoints principales:

```yaml
openapi: 3.1.0
info:
  title: AI Job Match API
  version: 0.1.0
servers:
  - url: /api/v1
components:
  securitySchemes:
    session:
      type: apiKey
      in: cookie
      name: adonis-session
  schemas:
    Error:
      type: object
      properties:
        code: { type: string, example: VALIDATION_ERROR }
        message: { type: string }
        details: { type: array, items: { type: object } }
    Salary:
      type: object
      nullable: true
      properties:
        min: { type: integer, nullable: true }
        max: { type: integer, nullable: true }
        currency: { type: string, example: USD }
        period: { type: string, enum: [year, month, hour] }
    JobPostingInput:
      type: object
      required: [source, title, companyName, descriptionMarkdown]
      properties:
        source: { type: string, enum: [manual] }
        sourceUrl: { type: string, format: uri, nullable: true }
        title: { type: string }
        companyName: { type: string }
        locationText: { type: string, nullable: true }
        country: { type: string, nullable: true, example: US }
        workMode: { type: string, enum: [remote, hybrid, onsite, unknown] }
        salary: { $ref: '#/components/schemas/Salary' }
        seniority: { type: string, nullable: true, enum: [junior, mid, senior, staff, principal] }
        requiredSkills: { type: array, items: { type: string } }
        niceToHaveSkills: { type: array, items: { type: string } }
        minYearsExperience: { type: integer, nullable: true }
        descriptionMarkdown: { type: string }
    FilterResult:
      type: object
      properties:
        outcome: { type: string, enum: [pass, fail, unknown] }
        criteria:
          type: object
          additionalProperties:
            type: object
            properties:
              result: { type: string, enum: [pass, fail, unknown] }
              reason: { type: string }
    MatchAnalysis:
      type: object
      properties:
        score: { type: integer, minimum: 0, maximum: 100 }
        label: { type: string, enum: [strong, good, weak, poor] }
        strengths: { type: array, items: { type: string } }
        gaps: { type: array, items: { type: string } }
        evidence:
          type: array
          items:
            type: object
            properties:
              source: { type: string, enum: [posting, resume] }
              quote: { type: string }
        isStale: { type: boolean }
security:
  - session: []
paths:
  /job-postings:
    post:
      summary: Guardar una oferta (pegada y revisada); aplica los filtros duros y encola el puntaje
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/JobPostingInput' }
      responses:
        '201':
          description: Oferta creada
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: object
                    properties:
                      id: { type: integer }
                      filterResult: { $ref: '#/components/schemas/FilterResult' }
                      match:
                        type: object
                        properties:
                          status: { type: string, enum: [queued, skipped] }
                          jobId: { type: string, nullable: true }
                  error: { type: 'null' }
        '409': { description: Oferta duplicada, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
        '422': { description: Datos inválidos, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
  /job-postings/{id}:
    get:
      summary: Detalle de la oferta con filtro y puntaje; fija firstViewedAt la primera vez
      parameters:
        - { name: id, in: path, required: true, schema: { type: integer } }
      responses:
        '200':
          description: Detalle
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    allOf:
                      - $ref: '#/components/schemas/JobPostingInput'
                      - type: object
                        properties:
                          id: { type: integer }
                          filterResult: { $ref: '#/components/schemas/FilterResult' }
                          match: { $ref: '#/components/schemas/MatchAnalysis' }
                          decision: { type: string, nullable: true, enum: [apply, skip] }
                          firstViewedAt: { type: string, format: date-time }
                          decidedAt: { type: string, format: date-time, nullable: true }
        '404': { description: No existe, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
  /job-postings/{id}/decision:
    post:
      summary: Registrar la decisión; apply crea la candidatura en saved, skip archiva la oferta
      parameters:
        - { name: id, in: path, required: true, schema: { type: integer } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [decision]
              properties:
                decision: { type: string, enum: [apply, skip] }
                reason: { type: string, nullable: true, maxLength: 500 }
      responses:
        '200':
          description: Decisión registrada
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: object
                    properties:
                      decision: { type: string, enum: [apply, skip] }
                      decidedAt: { type: string, format: date-time }
                      applicationId: { type: integer, nullable: true }
        '409': { description: Ya existe una candidatura para la oferta, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
```

**Ejemplo — registrar la decisión de aplicar:**

```http
POST /api/v1/job-postings/42/decision
Content-Type: application/json

{ "decision": "apply" }
```

```json
{
  "data": { "decision": "apply", "decidedAt": "2026-11-10T10:01:12Z", "applicationId": 7 },
  "error": null
}
```

---

## 5. Historias de Usuario

Las 10 historias del MVP se agrupan en 5 épicas, cada una mapeada a una capability de OpenSpec. Las historias completas, con sus @@SCENARIOS@@ escenarios, están en [`docs/user-stories.md`](./docs/user-stories.md).

@@EPICS@@

Selección de tres historias must-have, una de cada épica principal:

@@STORIES@@

---

## 6. Tickets de Trabajo

Selección de tres tickets (base de datos, backend y frontend). Los @@TICKET_COUNT@@ tickets están en [`docs/tickets.md`](./docs/tickets.md).

@@TICKETS@@

---

## 7. Pull Requests

[PENDIENTE] La Entrega 1 es solo documentación y se entrega en la rama `feature/entrega-1-jr`. Las pull requests se documentan a partir de la Entrega 2, una por cambio de OpenSpec (por ejemplo: walking skeleton, HU2, HU1, HU3, HU4).
