> Detalla en esta sección los prompts principales utilizados durante la creación del proyecto, que justifiquen el uso de asistentes de código en todas las fases del ciclo de vida del desarrollo. Esperamos un máximo de 3 por sección, principalmente los de creación inicial o  los de corrección o adición de funcionalidades que consideres más relevantes.
Puedes añadir adicionalmente la conversación completa como link o archivo adjunto si así lo consideras

> El registro completo y numerado de todos los prompts está en [`docs/ai-log.md`](./docs/ai-log.md). Aquí solo aparece la selección de los prompts clave, copiados textualmente.

## Índice

0. [Herramientas, modelos y flujo de trabajo](#0-herramientas-modelos-y-flujo-de-trabajo)
1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)

---

## 0. Herramientas, modelos y flujo de trabajo

| Elemento | Uso |
| --- | --- |
| Herramienta | Claude Code (CLI) en todas las fases de la Entrega 1 |
| Modelo | Claude Opus 5.5, esfuerzo medio: descubrimiento, PRD, arquitectura, historias, tickets y revisiones |
| Skills | `/opsx:explore` (entrevista de descubrimiento), `claude-api` (modelos, precios y capacidades de Claude API) |
| Búsqueda web | Verificación de AdonisJS v7, plataformas de empleo de las empresas objetivo, API de Greenhouse, Adzuna, SmartRecruiters, JSearch y SerpApi |
| Reglas | `.claude/rules/ai-log.md` (registrar cada prompt en `docs/ai-log.md`) y `.claude/rules/sdlc-gates.md` (compuertas del AI SDLC y gestión de cambios) |
| Contexto | `CLAUDE.md` (convenciones, comandos y definition of done) y `openspec/config.yaml` (contexto y reglas por artefacto de OpenSpec) |
| Proceso | AI SDLC con OpenSpec: visión → PRD → revisión adversarial → arquitectura y ADRs → historias → tickets (ver `docs/ai-sdlc-claude-code-openspec.md`) |

**Ajustes humanos sobre el resultado de la IA**

- Elección del lado del ATS (candidato), mercado (EE. UU., híbrido preferido) y empresas objetivo (FAANG/MANGO, Walmart, ServiceNow, PayPal/Venmo, eBay y medianas).
- Convención de idioma: código y base de datos en inglés, interfaz en inglés con i18n, documentación en español y "currículum" en lugar de "CV".
- Correos y alertas y la traducción al español pasan a should-have (hoy HU9 y HU10).
- El usuario detectó que faltaban las épicas y pidió reestructurar las historias en 5 épicas y 10 historias.
- A partir de los errores del proceso, el usuario pidió mejorar el AI SDLC: se agregaron compuertas G0-G3, revisiones adversariales, ciclo de vida de los ADR, propagación de cambios y el script `scripts/check_docs.py`.
- Arquitectura: se rechazó el monolito con Inertia recomendado por la IA a favor de un monorepo con API REST y SPA separadas en un solo contenedor.
- Modelos de Claude: económicos en desarrollo y pruebas, de mayor calidad en producción.
- Idea propia de usar Markdown como representación del currículum para reducir costos.
- El usuario pidió una revisión adversarial del PRD que la IA no había propuesto a tiempo, y decidió que la recolección automática de ofertas es tan importante como pegarlas; con ello se amplió el presupuesto a 36 horas.

---

## 1. Descripción general del producto

**Prompt 1:** Proceso general (Claude Code, Opus 5.5)

```markdown
Quiero desarrollar un sistema ATS (Applicant Tracking System) personal o un panel inteligente de búsqueda de empleo como proyecto final para el curso Master AI4Devs. La idea es que sea un sistema completo a largo plazo pero a la vez funcional con lo mínimo necesario y que demuestre lo aprendido en el curso. Cuál sería el proceso a seguir?
```

Resultado: proceso por fases alineado con las entregas del curso. Después, una entrevista de descubrimiento con `/opsx:explore` ("empecemos la entrevista de la Fase 0") produjo [`docs/vision.md`](./docs/vision.md).

**Prompt 2:** Corte del MVP y PRD

```markdown
HU5 se queda como should-have, i18n también pero usando el inglés como lenguaje principal; arranca el PRD
```

Resultado: [`docs/prd.md`](./docs/prd.md) v0.1 con objetivos, flujo principal, historias y requisitos funcionales y no funcionales.

**Prompt 3:** Revisión adversarial del PRD

```markdown
Esto se debió haber hecho antes.

PRD adversarial
Cambia de sombrero: sé un revisor de producto adversarial. Critíca el PRD: ¿qué requerimientos están ambiguos o nomás no se pueden probar? ¿Qué suposición, si resulta ser falsa, se trae abajo todo el MVP? ¿En dónde hay desviación del alcance escondido? ¿Qué métrica nomás no hay forma de medir bien en la vida real? Priorízalo todo por nivel de riesgo.
```

Resultado: 4 hallazgos críticos, 8 altos y 11 medios o bajos ([`docs/prd-review.md`](./docs/prd-review.md)). Tras las decisiones del usuario ("A, y aplica el resto de las correcciones"), el PRD pasó a la v0.2.

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

**Prompt 1:** Inicio de la fase de arquitectura

```markdown
Empecemos con la fase 2
```

Resultado: la IA investigó AdonisJS v7 y la API de Claude, y planteó cinco decisiones (D1 a D5) con recomendación.

**Prompt 2:** Decisiones de arquitectura

```markdown
D1. Opción B - Monorepo, 2 apps separadas: API REST + SPA con despliegue en un solo contenedor (backend + frontend)
D2. Opción económica por defecto durante desarrollo y pruebas, y la opción de calidad para productivo.
D3. Está bien
D4. Está bien. Como nota adicional pudieramos considerar el uso de un documento markdown para reducir costos
D5. Está bien
```

Resultado: [`docs/architecture.md`](./docs/architecture.md) con diagramas Mermaid y ADR-0001 a ADR-0005 en [`docs/adr/`](./docs/adr/).

**Prompt 3:** Revisión adversarial de la arquitectura (compuerta G2)

```markdown
hagamos la revisión adversarial de la arquitectura
```

Resultado: 12 hallazgos en [`docs/architecture-review.md`](./docs/architecture-review.md), entre ellos dos críticos: las credenciales del evaluador expondrían datos personales y no había control de gasto de IA. Con "Instancia de demostración, puntuar a pedido, acepto riesgo; aplica el resto" se crearon ADR-0007 y ADR-0008 y se propagaron los cambios.

### **2.2. Descripción de componentes principales:**

**Prompt 1:** Empresas objetivo

```markdown
Me faltó mencionar Walmart, ServiceNow, PayPal, eBay, Venmo pero también me interesan medianas empresas.
```

Resultado: tras investigar qué plataforma de empleo usa cada empresa, la IA propuso el componente de adaptadores (`JobSourceAdapter`) por plataforma.

**Prompt 2:** Fuentes automáticas

```markdown
El recolectar ofertas de diferentes portales automáticamente es tan importante como copiar y pegar la oferta. Se tienen 30 hrs pero no hay problema si nos pasamos un 20% más.
```

Resultado: adaptadores de Greenhouse, Ashby y Lever más un agregador por búsqueda sujeto a spike (ADR-0006, que reemplaza parcialmente a ADR-0002). Al dividir las historias, Lever pasó a should-have porque ninguna empresa objetivo lo usa.

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

**Prompt 1:** Contrato para los agentes

```markdown
sigamos con CLAUDE.md
```

Resultado: [`CLAUDE.md`](./CLAUDE.md) con la estructura del monorepo, comandos, convenciones y definition of done.

**Prompt 2:** Contexto de OpenSpec

```markdown
llena openspec/config.yaml y haz commit
```

Resultado: `openspec/config.yaml` con el contexto del proyecto y reglas por artefacto (proposal, specs, design, tasks).

### **2.4. Infraestructura y despliegue**

Ver el Prompt 2 de la sección 2.1 (decisión D1: un solo contenedor con API y SPA; D3: cola de trabajos en PostgreSQL). Resultado: sección 2.5 de `docs/architecture.md` y ADR-0001 y ADR-0005.

### **2.5. Seguridad**

Ver el Prompt 2 de la sección 2.1. Las medidas de seguridad (sesión, CSRF, validación, inyección de prompts, SSRF y privacidad) se derivaron de los requisitos no funcionales del PRD y se ajustaron con la revisión adversarial (Prompt 3 de la sección 1).

### **2.6. Tests**

Ver el Prompt 2 de la sección 2.1 (decisión D5: Japa, Playwright y un doble de prueba del cliente de Claude) y el Prompt 3 de la sección 1 (golden sets separados en ajuste y prueba, y `axe-core` en la prueba E2E).

---

### 3. Modelo de Datos

**Prompt 1:** Ver el Prompt 2 de la sección 2.1. Resultado: ERD de 9 tablas en `docs/architecture.md`.

**Prompt 2:** Ajustes por la revisión adversarial

```markdown
A, y aplica el resto de las correcciones
```

Resultado: tabla `job_searches`, columnas de decisión y medición en `job_postings` y preferencias de rol.

---

### 4. Especificación de la API

**Prompt 1:** Ver el Prompt 2 de la sección 2.1. Resultado: contrato REST bajo `/api/v1` con el formato `{ data, error, meta }`.

**Prompt 2:** Coherencia entre tickets y API

```markdown
Corrige los puntos 1 y 3
```

Resultado: se agregó `PATCH /auth/me` a la API, detectado al revisar los tickets, y se alinearon las estimaciones.

---

### 5. Historias de Usuario

**Prompt 1:**

```markdown
sigamos con las historias de usuario
```

Resultado: primera versión de [`docs/user-stories.md`](./docs/user-stories.md) con seis historias, criterios Dado/Cuando/Entonces, reglas de negocio y fuera de alcance.

**Prompt 2:** Ver el Prompt 2 de la sección 3. Resultado: 43 escenarios tras la revisión adversarial.

**Prompt 3:** Épicas omitidas

```markdown
Dónde quedaron las épicas?
```

Resultado: la IA reconoció que se había saltado el paso de épicas que piden la guía y las reglas del curso. Con "B, y haz commit" se reestructuraron las historias en 5 épicas (mapeadas a capabilities de OpenSpec) y 10 historias con 45 escenarios (49 tras la revisión de la arquitectura).

---

### 6. Tickets de Trabajo

**Prompt 1:**

```markdown
registra los tickets en docs/tickets.md
```

Resultado: [`docs/tickets.md`](./docs/tickets.md) con tipo, estimación, requisitos, dependencias, tareas y criterios de aceptación.

**Prompt 2:** Ver el Prompt 2 de la sección 3. Resultado: 30 tickets tras la revisión adversarial del PRD; 36 tickets tras la revisión de la arquitectura, con must-have ≈ 35.5 h dentro del tope de 36 h.

---

### 7. Pull Requests

[PENDIENTE] Se documentan a partir de la Entrega 2.
