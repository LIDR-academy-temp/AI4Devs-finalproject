# Registro de uso de IA

### Prompt 1

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (nivel de esfuerzo: [por confirmar])
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Quiero desarrollar un sistema ATS (Applicant Tracking System) personal o un panel inteligente de búsqueda de empleo como proyecto final para el curso Master AI4Devs. La idea es que sea un sistema completo a largo plazo pero a la vez funcional con lo mínimo necesario y que demuestre lo aprendido en el curso. Cuál sería el proceso a seguir?
  ```

- **Resultado:** Propuesta de proceso por fases (descubrimiento, alcance y corte del MVP, PRD, arquitectura, historias y tickets, walking skeleton, ciclo OpenSpec, despliegue) aplicada a un ATS personal y alineada con las tres entregas del curso y con `docs/ai-sdlc-claude-code-openspec.md`. Respuesta en el chat; no se modificaron otros archivos.

### Prompt 2

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code (skill `/opsx:explore`)
- **Prompt:**

  ```markdown
  Nivel de esfuerzo medio. Usa currículum en vez de CV. empecemos la entrevista de la Fase 0
  ```

- **Resultado:** Inicio de la entrevista de descubrimiento (Fase 0) en modo explore de OpenSpec, con las primeras preguntas sobre problema, usuario, hipótesis y lado del ATS. Respuesta en el chat. Nota: el nivel de esfuerzo de la entrada 1 también fue medio.

### Prompt 3

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code (skill `/opsx:explore`)
- **Prompt:**

  ```markdown
  Sí, soy yo; me duelen más (a), (b) y (e); Es personal pero a largo plazo estaría bien un híbrido; un puntaje de encaje con una explicación; se recomienda que el proyecto se desarrolle en 30 horas asistido por AI;
  ```

- **Resultado:** Borrador de hipótesis y del flujo central del MVP, análisis de opciones para obtener ofertas (dolor a) dentro de 30 horas y reparto tentativo de horas. Nuevas preguntas sobre fuentes de ofertas, criterios de encaje, seguimiento y stack. Respuesta en el chat.

### Prompt 4

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code (skill `/opsx:explore`)
- **Prompt:**

  ```markdown
  1. Estados Unidos, híbrido de preferencia pero también acepto remoto o presencial.
  2. Habilidades, experiencia y filtros duros (podemos comenzar con lo mencionado).
  3. Pues el historial está dentro de mi correo electrónico solamente y no es fácil localizar los hilos.
  4. Claude API está bien. No soy experto en el stack que se usó en el curso (AdonisJS 7, PostgreSQL/Lucid, React 19, Vite, Transcript, Tuyau y Railway) pero no hay problema, lo leo y entiendo sin problema.
  Como nota adicional, preferiría que el idioma base del sistema sea en inglés, es decir, la interfaz puede tener dos lenguages (español e inglés) pero en si, las clases, tablas, campos que estén en inglés. Para cualquier otra interacción español está bien.
  ```

- **Resultado:** Análisis de fuentes de ofertas para EE. UU., separación entre filtros duros y puntaje con IA, opciones para el historial de correo (pegar correo con clasificación por IA en el MVP, Gmail en v1.1), recomendación de usar el stack del curso y convención de idioma (código en inglés, UI bilingüe). Respuesta en el chat; convención guardada en la memoria del asistente.

### Prompt 5

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code (skill `/opsx:explore`)
- **Prompt:**

  ```markdown
  Es TypeScript; documentos del curso en español; no necesito visa; un solo currículum pero a largo plazo uno por tipo de rol para aumentar las posibilidades; redacta vision.md
  ```

- **Resultado:** Se creó `docs/vision.md` (borrador v0.1) con problema, usuario, hipótesis y métricas, propuesta de valor, alcance etiquetado `MVP`/`v1.1`/`futuro`, exclusiones, restricciones, riesgos y preguntas abiertas para la arquitectura.

### Prompt 6

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  HU5 se queda como should-have, i18n también pero usando el inglés como lenguaje principal; arranca el PRD
  ```

- **Resultado:** Se actualizó `docs/vision.md` (correos, alertas y traducción al español como `should-have`; interfaz en inglés) y se creó `docs/prd.md` (borrador v0.1) con objetivos, flujo principal, 4 historias must-have y 2 should-have, requisitos funcionales y no funcionales, criterios de aceptación de alto nivel, entidades del dominio y decisiones pendientes.

### Prompt 7

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  1. Está bien
  2. Sí
  3. Sí
  4. Está bien
  5. Eso sería lo ideal
  ```

- **Resultado:** Se actualizó `docs/prd.md`: estado `withdrawn` en el pipeline (RF-31), metas de costo y tiempo aceptadas como objetivos, y nueva sección 10.1 con las decisiones confirmadas.

### Prompt 8

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  commit cambios
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con `docs/vision.md`, `docs/prd.md` y `docs/ai-log.md`.

### Prompt 9

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code (WebSearch)
- **Prompt:**

  ```markdown
  Empresas FAANG/MANGO.
  ```

- **Resultado:** Investigación de qué plataformas de empleo usan las empresas objetivo y de las condiciones de la API de Adzuna. Conclusión: la mayoría usa portales propios sin API pública, lo que cambia la estrategia de importación de ofertas (RF-04). Respuesta en el chat. Corrección de la entrada 8: el commit `8a5ad6e` incluyó solo `docs/prd.md` y `docs/ai-log.md`; `docs/vision.md` ya estaba en commits anteriores.

### Prompt 10

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code (WebSearch)
- **Prompt:**

  ```markdown
  Me faltó mencionar Walmart, ServiceNow, PayPal, eBay, Venmo pero también me interesan medianas empresas.
  ```

- **Resultado:** Investigación de las plataformas de empleo de las empresas adicionales y de la Posting API pública de SmartRecruiters. Propuesta de importación por conectores (un adaptador por plataforma) con una lista de empresas objetivo; ofertas de empresas grandes por texto pegado y alertas por correo. Respuesta en el chat.

### Prompt 11

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code (WebFetch)
- **Prompt:**

  ```markdown
  Sí, acepto Greenhouse; no tengo empresas medianas concretas
  ```

- **Resultado:** Se verificó que la Greenhouse Job Board API de Anthropic responde sin clave. Se actualizaron `docs/prd.md` (RF-04 con adaptadores, nuevo RF-09 de empresas objetivo, entidad `TargetCompany`, dependencias y decisiones) y `docs/vision.md` (alcance de adaptadores, alertas por correo y Workday; pregunta abierta de la fuente resuelta).

### Prompt 12

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Sí, haz commit solamente
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con los cambios de `docs/prd.md`, `docs/vision.md` y `docs/ai-log.md` (empresas objetivo e importación por adaptadores).

### Prompt 13

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code (skill `claude-api`, WebSearch)
- **Prompt:**

  ```markdown
  Empecemos con la fase 2
  ```

- **Resultado:** Investigación para la arquitectura: AdonisJS v7 estable (kits de inicio, Node.js 24), modelos y precios actuales de Claude, structured outputs y entrada PDF nativa. Propuesta de decisiones (estilo de aplicación, modelos de Claude, procesamiento en segundo plano, lectura del PDF) con estimación de costo, pendiente de aprobación. Respuesta en el chat.

### Prompt 14

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  D1. Opción B - Monorepo, 2 apps separadas: API REST + SPA con despliegue en un solo contenedor (backend + frontend)
  D2. Opción económica por defecto durante desarrollo y pruebas, y la opción de calidad para productivo.
  D3. Está bien
  D4. Está bien. Como nota adicional pudieramos considerar el uso de un documento markdown para reducir costos
  D5. Está bien
  ```

- **Resultado:** Se creó `docs/architecture.md` (diagramas, componentes, estructura, despliegue, seguridad, pruebas, modelo de datos y API) y cinco ADRs en `docs/adr/` (monorepo en un contenedor, adaptadores, modelos por entorno, integración de IA con Markdown canónico y cola en PostgreSQL). Se actualizó `docs/prd.md` (currículum en PDF o Markdown; decisiones pendientes resueltas).

### Prompt 15

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  haz commit
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con `docs/architecture.md`, los cinco ADRs de `docs/adr/`, `docs/prd.md` y `docs/ai-log.md`.

### Prompt 16

- **Categoría:** `📏 Reglas del proyecto`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  sigamos con CLAUDE.md
  ```

- **Resultado:** Se creó `CLAUDE.md` en la raíz con el contexto del proyecto, los documentos de referencia, el stack, los comandos previstos, las convenciones (idioma, código, IA, seguridad), las reglas de pruebas, el flujo de trabajo con OpenSpec y la definition of done.

### Prompt 17

- **Categoría:** `📏 Reglas del proyecto`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  llena openspec/config.yaml y haz commit
  ```

- **Resultado:** Se llenó `openspec/config.yaml` con el contexto del proyecto y reglas por artefacto (proposal, specs, design, tasks). Commit en la rama `feature/entrega-1-jr` junto con `CLAUDE.md` y `docs/ai-log.md`.

### Prompt 18

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  sigamos con las historias de usuario
  ```

- **Resultado:** Se creó `docs/user-stories.md` con el orden de construcción y la estimación, y las historias HU1 a HU6 con contexto, criterios de aceptación en formato Dado/Cuando/Entonces, reglas de negocio y lo que queda fuera de alcance.

### Prompt 19

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  registra los tickets en docs/tickets.md
  ```

- **Resultado:** Se creó `docs/tickets.md` con 24 tickets técnicos (walking skeleton, HU1 a HU6 y cierre del MVP), cada uno con tipo, estimación, requisitos, dependencias, tareas y criterios de aceptación; must-have ≈ 28 h y should-have ≈ 5 h.

### Prompt 20

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Corrige los puntos 1 y 3
  ```

- **Resultado:** Se alinearon las estimaciones de `docs/user-stories.md` con `docs/tickets.md` (walking skeleton 6.5 h, HU1 6 h, HU4 3.5 h; MVP imprescindible 28 h) y se agregó `PATCH /auth/me` a la tabla de la API en `docs/architecture.md`.

### Prompt 21

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  haz commit
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con `docs/user-stories.md`, `docs/tickets.md`, `docs/architecture.md` y `docs/ai-log.md`.

### Prompt 22

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Esto se debió haber hecho antes.

  PRD adversarial
  Cambia de sombrero: sé un revisor de producto adversarial. Critíca el PRD: ¿qué requerimientos están ambiguos o nomás no se pueden probar? ¿Qué suposición, si resulta ser falsa, se trae abajo todo el MVP? ¿En dónde hay desviación del alcance escondido? ¿Qué métrica nomás no hay forma de medir bien en la vida real? Priorízalo todo por nivel de riesgo.
  ```

- **Resultado:** Revisión adversarial de `docs/prd.md` priorizada por riesgo: suposiciones que invalidan el MVP, requisitos ambiguos o no comprobables, alcance escondido y métricas no medibles, con una corrección propuesta para cada hallazgo. Respuesta en el chat; sin cambios en archivos.

### Prompt 23

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code (WebSearch)
- **Prompt:**

  ```markdown
  El recolectar ofertas de diferentes portales automáticamente es tan importante como copiar y pegar la oferta. Se tienen 30 hrs pero no hay problema si nos pasamos un 20% más.
  ```

- **Resultado:** Investigación de agregadores de ofertas (JSearch, SerpApi Google Jobs) y propuesta de fuentes automáticas adicionales para el MVP (adaptadores de Ashby y Lever, agregador por búsqueda, alertas por correo) con estimación dentro del nuevo tope de 36 horas. Respuesta en el chat; pendiente de decisión.

### Prompt 24

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  A, y aplica el resto de las correcciones
  ```

- **Resultado:** Se guardó la revisión en `docs/prd-review.md` y se aplicaron sus correcciones: `docs/prd.md` v0.2 (filtro de roles, reglas de filtros, decisión apply/skip, verificación de evidencia, métricas medibles, OBJ-5 y fuentes automáticas Greenhouse/Ashby/Lever + agregador), `docs/vision.md`, `docs/architecture.md`, ADR-0002, `docs/user-stories.md` (42 escenarios) y `docs/tickets.md` (30 tickets; must-have ≈ 33 h, tope 36 h).

### Prompt 25

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  haz commit
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con la revisión adversarial y sus correcciones en PRD, visión, arquitectura, ADR-0002, historias, tickets y `docs/ai-log.md`.

### Prompt 26

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  llena readme.md y prompts.md
  ```

- **Resultado:** Se llenó `readme.md` (secciones 0 a 7, generadas a partir de `docs/`: diagramas, ERD, tablas de entidades, OpenAPI de 3 endpoints, 3 historias y 3 tickets) y `prompts.md` (herramientas, modelos, ajustes humanos y prompts clave por sección). Quedan pendientes el nombre completo, el nombre final del proyecto, la URL de despliegue, las capturas y las pull requests.

### Prompt 27

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  haz commit
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con `readme.md`, `prompts.md` y `docs/ai-log.md`; el nombre completo y el nombre final del proyecto siguen marcados como pendientes.

### Prompt 28

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Dónde quedaron las épicas?
  ```

- **Resultado:** Se confirmó que las épicas se omitieron, aunque la guía (`docs/ai-sdlc-claude-code-openspec.md`, paso 7) y las reglas del curso (3 a 5 épicas) las piden. Propuesta de 5 épicas mapeadas a capabilities de OpenSpec y a las historias existentes, con dos opciones de incorporación. Respuesta en el chat; sin cambios en archivos.

### Prompt 29

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  B, y haz commit
  ```

- **Resultado:** Se reestructuraron las historias en 5 épicas (E1 `job-intake`, E2 `resume-profile`, E3 `job-matching`, E4 `application-tracking`, E5 `platform`) y 10 historias con 44 escenarios. Se actualizaron `docs/prd.md` (v0.3), `docs/user-stories.md`, `docs/tickets.md`, `readme.md`, `prompts.md`, `CLAUDE.md` y `openspec/config.yaml`, y se hizo commit en la rama `feature/entrega-1-jr`.

### Prompt 30

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Dado que las historias quedaron del tamaño de un cambio de OpenSpec, no hay necesidad de cambiarles de prioridad o sí?
  ```

- **Resultado:** Análisis de prioridades tras dividir las historias: el tamaño no cambia la prioridad, pero se detectaron dos inconsistencias (HU3 must-have marcada como la primera en recortarse; adaptador de Lever sin empresas objetivo conocidas). Propuesta de bajar el adaptador de Lever a should-have y cambiar el orden de recorte. Respuesta en el chat; sin cambios en archivos.

### Prompt 31

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Sí, aplícalo y pero no hagas commit
  ```

- **Resultado:** El adaptador de Lever (T-26) pasó a should-have y cambió el orden de recorte (Lever primero; después, HU3 se reduce a una búsqueda fija). Se actualizaron `docs/prd.md`, `docs/vision.md`, ADR-0002, `docs/user-stories.md`, `docs/tickets.md` (must-have ≈ 31.25 h, should-have ≈ 7 h) y `readme.md`. Sin commit, por indicación del usuario.

### Prompt 32

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Dado que se han hecho cambios a destiempo, revisa toda la documentación en búsqueda de inconsistencias o cambios que se tengan que hacer. Compáralo con el AI SDLC de nuevo y asegúrate que no nos hayamos saltado ningún paso.
  ```

- **Resultado:** Revisión de consistencia contra `docs/ai-sdlc-claude-code-openspec.md` y las reglas del curso. Se corrigieron referencias a Lever, el endpoint de currículum, los trabajos de la cola (ADR-0005), preguntas abiertas de la visión, requisitos de HU6 y HU7 y dependencias de tickets. Se agregaron los pasos faltantes: plan de entregas, mapeo de épicas a módulos, medición de la línea base (T-31), etiquetado previo de golden sets (T-32) y hook de lint y pruebas. Total: 32 tickets, must-have ≈ 31.5 h. Sin commit.

### Prompt 33

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  haz commit
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con el cambio de prioridad de Lever (prompt 31) y la revisión de consistencia contra el AI SDLC (prompt 32).

### Prompt 34

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Muéstrame los ADR que se han modificado desde que se les hizo check in por primera vez.
  ```

- **Resultado:** Diff de `docs/adr/` desde el commit `a01be6c`: se modificaron ADR-0002, ADR-0004 y ADR-0005. Se señaló que ADR-0002 quedó con contradicciones internas y que la práctica recomendada es no reescribir un ADR aceptado sino reemplazarlo con uno nuevo. Respuesta en el chat; sin cambios en archivos.

### Prompt 35

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Sí, aplíca los cambios propuestos
  ```

- **Resultado:** ADR-0002 se restauró a su texto original con el estado "reemplazada parcialmente por ADR-0006"; se creó `docs/adr/0006-fuentes-automaticas-y-agregador.md`; ADR-0004 y ADR-0005 recibieron una sección "Historial de cambios" (y ADR-0005 alineó el tiempo con RNF-06). Se actualizaron las referencias en `docs/architecture.md`, `docs/tickets.md`, `prompts.md`, `CLAUDE.md` y `readme.md`. Sin commit.

### Prompt 36

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  haz commit
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con ADR-0006, la restauración de ADR-0002, el historial de cambios de ADR-0004 y ADR-0005, y las referencias actualizadas.

### Prompt 37

- **Categoría:** `📏 Reglas del proyecto`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Basado en lo que hemos trabajado hasta ahora, qué cambiarías o añadirías al AI SDLC para que no nos saltemos pasos como las épicas, las modificaciones a los ADR, etc. También ten en cuenta el PRD adversarial.
  ```

- **Resultado:** Propuesta de mejoras al AI SDLC basada en los errores de la sesión: compuertas con criterios de salida por fase, revisiones adversariales, épicas dentro del PRD, ciclo de vida de los ADR, propagación de cambios, plan de entregas, tareas de producto y una regla de Claude Code que haga cumplir las compuertas. Respuesta en el chat; sin cambios en archivos.

### Prompt 38

- **Categoría:** `📏 Reglas del proyecto`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Sí, aplica los cambios pero no hagas commit
  ```

- **Resultado:** Se actualizó `docs/ai-sdlc-claude-code-openspec.md` (diagrama con compuertas, paso 0 de restricciones, épicas en el PRD, revisiones adversariales, plan de entregas, secciones 3.1, 5.1, 5.2 y 5.3). Se crearon `docs/sdlc-checklist.md`, `.claude/rules/sdlc-gates.md`, tres plantillas en `docs/prompts/`, `scripts/check_docs.py` y `scripts/readme.template.md`; se actualizaron `CLAUDE.md` y `prompts.md`. `check_docs.py` en verde. Queda abierta la revisión adversarial de la arquitectura (G2). Sin commit.

### Prompt 39

- **Categoría:** `📏 Reglas del proyecto`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  haz commit
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con las mejoras al AI SDLC (guía, checklist de compuertas, regla `sdlc-gates`, plantillas de prompts y `scripts/check_docs.py`).

### Prompt 40

- **Categoría:** `📏 Reglas del proyecto`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  sí, incluye el .gitignore y haz commit
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con `.gitignore` (sistemas operativos, lenguajes, editores, archivos temporales y secretos) y `docs/ai-log.md`.

### Prompt 41

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  hagamos la revisión adversarial de la arquitectura
  ```

- **Resultado:** Se creó `docs/architecture-review.md` con 12 hallazgos priorizados (2 críticos: credenciales del evaluador sobre datos personales y falta de control de gasto de IA; 3 altos; 5 medios; 2 bajos), cada uno con evidencia y corrección propuesta. Resoluciones pendientes de la decisión del usuario; G2 sigue abierta. Sin commit.

### Prompt 42

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Instancia de demostración, puntuar a pedido, acepto riesgo; aplica el resto
  ```

- **Resultado:** Se crearon ADR-0007 (instancia de demostración) y ADR-0008 (control de gasto de IA y puntaje a pedido, topes de 1 USD/día y 10 USD/mes), con notas de historial en ADR-0001, 0003, 0004, 0005 y 0006. Se propagaron los cambios a PRD (RF-05, RF-23, RNF-01, RNF-07, RNF-12, RNF-15, RNF-16), arquitectura (v0.3: `ai_usage`, `dedupe_key`, observabilidad, instancias), historias (48 escenarios), tickets (T-33 a T-36; must-have 35.5 h, should-have 7.5 h), visión, `CLAUDE.md`, `prompts.md` y `readme.md`. Todos los hallazgos de `docs/architecture-review.md` resueltos; G2 cerrada. `check_docs.py` en verde. Sin commit.

### Prompt 43

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  haz commit
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con la revisión adversarial de la arquitectura, ADR-0007, ADR-0008 y la propagación de sus decisiones.

### Prompt 44

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  nombre del proyecto: ATS (Applicant Tracking System) personal
  ```

- **Resultado:** Se registró el nombre del proyecto en la ficha del `readme.md` (sección 0.2, vía `scripts/readme.template.md`) y en `docs/vision.md`. Sin commit.

### Prompt 45

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Para nombre del proyecto
  - Título: AI Job Match
  - Subtítulo: Un ATS (Applicant Tracking System) personal impulsado por Inteligencia Artificial para la búsqueda y calificación automatizada de empleo.
  ```

- **Resultado:** Se aplicó el nombre "AI Job Match" y su subtítulo en el encabezado y la sección 0.2 del `readme.md` (vía `scripts/readme.template.md`), el título de la OpenAPI, los títulos de visión, PRD, arquitectura, historias y tickets, `CLAUDE.md` y `openspec/config.yaml`. Sin commit.

### Prompt 46

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  haz commit
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con el nombre del proyecto "AI Job Match" y su subtítulo en la documentación.

### Prompt 47

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Si quiero hacer el cambio de mi nombre completo, donde tengo que hacer el cambio?
  ```

- **Resultado:** Se indicó que el nombre se edita en `scripts/readme.template.md` (sección 0.1) y que después se regenera `readme.md` con `python3 scripts/check_docs.py --build-readme`. Respuesta en el chat; sin cambios en archivos.

### Prompt 48

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  haz commit
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con el nombre completo que el usuario agregó a la ficha (sección 0.1) en `scripts/readme.template.md` y `readme.md`.

### Prompt 49

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  hagamos la revisión de consistencia
  ```

- **Resultado:** Revisión de consistencia (G3) con `docs/prompts/consistency-review.md` y `scripts/check_docs.py`. Se corrigieron el conteo de escenarios (49; los conteos informados en las entradas 18, 24, 29 y 42 omitían el "Esquema del escenario"), la doble cuenta de T-31 en el orden de construcción, los requisitos de HU1 y HU6 en el PRD, el paso 6 del flujo principal (puntaje a pedido), la tabla de funcionalidades del `readme.md` y la tabla de documentos de `CLAUDE.md`. Se marcó G3 en `docs/sdlc-checklist.md`. Se detectó que el fork apunta a `LIDR-academy-temp/AI4Devs-finalproject`, no al repositorio oficial que citan las reglas. Sin commit.

### Prompt 50

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  El fork de `LIDR-academy-temp/AI4Devs-finalproject` es correcto y aceptado debido a los problemas que LIDR tiene con GitHub y su organización original; cierra la casilla del formulario de Typeform. Ya se completó
  ```

- **Resultado:** Se cerró la casilla del formulario de Typeform en `docs/sdlc-checklist.md` y se agregó una nota en `docs/reglas-proyecto-final-ai4devs.md` sobre el fork aceptado de `LIDR-academy-temp`. Sin commit.

### Prompt 51

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  haz commit
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con la revisión de consistencia (G3), el cierre del checklist y la nota del fork. Sin push: la rama sigue sin publicarse en GitHub.

### Prompt 52

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Revisa una vez más y busca inconsistencias con la documentación del sistema
  ```

- **Resultado:** Segunda revisión de consistencia, con verificación cruzada de endpoints entre tickets y arquitectura. Se corrigieron: golden set de ADR-0004 (historial), versión de AdonisJS e indicador secundario en `docs/vision.md`, tipo `producto` en `docs/tickets.md`, puntaje a pedido en T-28, comandos `metrics` y `db:seed --demo` y `AI_DRIVER=fake` en `CLAUDE.md`, resumen de la arquitectura (instancias y control de gasto) y el endpoint `/health` sin sesión en arquitectura, PRD (RNF-01) y T-03. `check_docs.py` en verde. Sin commit.

### Prompt 53

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  haz commit
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con la segunda revisión de consistencia. Sin push.

### Prompt 54

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Revisa una vez más y busca inconsistencias más a fondo en la documentación del sistema
  ```

- **Resultado:** Tercera revisión con cruces automáticos (estimaciones por historia, dependencias de tickets, versiones de documentos). Hallazgo principal: el control de gasto (T-33) iba después de todas las tareas que llaman a la IA, en contra de ADR-0008 y del plan de entregas; se movió justo después del walking skeleton y T-07, T-10, T-16, T-17, T-22 y T-30 pasaron a depender de él. También se actualizaron el orden de construcción del PRD, las versiones de visión, PRD, historias y tickets, y el conteo de tickets en `prompts.md`. Sin commit.

### Prompt 55

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  haz commit
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con la tercera revisión de consistencia. Sin push.

### Prompt 56

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Revisa una vez más y busca inconsistencias más a fondo y minuciosamente en la documentación del sistema en general
  ```

- **Resultado:** Cuarta revisión, con lectura completa del PRD y de los tickets. Se corrigieron dependencias ocultas (el botón "puntuar seleccionadas" de T-11 y el recálculo de T-07/T-08 dependían del endpoint de T-16 y pasaron a T-18), la prueba E2E sin currículum (pasos del flujo y T-21), el caso sin currículum activo (RF-23, T-16), la URL "pública" de la instancia personal en T-05, la entidad `AiUsage` en el PRD, el riesgo de costo de Railway, la nota de Lever en el log de decisiones, la trazabilidad de costo y operación, y la ubicación de T-33 en `docs/tickets.md`. Horas: HU1 3.5 h, HU6 4.5 h; totales sin cambio (35.5 h). Sin commit.

### Prompt 57

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  haz commit de los cambios existentes para podernos enfocar las comprobaciones recomendadas
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con la cuarta revisión de consistencia; después se agregaron a `scripts/check_docs.py` las comprobaciones de dependencias, tickets de IA, uso de endpoints y horas por historia, con pruebas en `scripts/test_check_docs.py`.

### Prompt 58

- **Categoría:** `🧪 Pruebas`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Sí
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con las comprobaciones nuevas de `scripts/check_docs.py` (dependencias, control de gasto, uso de endpoints y horas por historia), sus 7 pruebas en `scripts/test_check_docs.py`, las convenciones en `docs/tickets.md` y el comando de pruebas en `CLAUDE.md`.

### Prompt 59

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Revisa una vez más y busca inconsistencias más a fondo y minuciosamente en la documentación del sistema en general. Veamos si ésta vez no hay errores
  ```

- **Resultado:** Quinta revisión, con lectura completa de visión e historias y cruce de la tabla de la API contra los tickets. Se encontraron 13 inconsistencias, sobre todo en `docs/vision.md` (filtro de rol, estado retirada, fila obsoleta "segunda fuente", línea base, golden set, riesgos de costo y tiempo, pregunta resuelta desactualizada), además del escenario faltante "sin currículum activo" (HU6), el flujo E2E y las variables de entorno en la arquitectura, la estructura del proyecto, el plan de entregas y el contexto de OpenSpec. El conteo de escenarios (50) y de tickets del `readme.md` ahora lo calcula `check_docs.py`. Sin commit.

### Prompt 60

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  haz commit
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con la quinta revisión de consistencia y los conteos automáticos del `readme.md`. Sin push.

### Prompt 61

- **Categoría:** `📏 Reglas del proyecto`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Basado en los últimos cambios, qué se añadiría o cambiaría en el AI SDLC?
  ```

- **Resultado:** Propuesta de cambios al AI SDLC a partir de las cinco revisiones de consistencia: identificadores de decisión para propagar cambios, propagación también hacia documentos de origen, contratos de tickets (expone/consume), orden de construcción derivado de dependencias, criterio de parada de las revisiones, verificación del propio verificador, quitar versiones manuales de los documentos y verificar la publicación antes de entregar. Respuesta en el chat; sin cambios en archivos.

### Prompt 62

- **Categoría:** `📏 Reglas del proyecto`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Aplica los cambios 1, 2, 3, 4, 5 y 6 solamente
  ```

- **Resultado:** Se aplicaron seis mejoras al AI SDLC: log de decisiones con identificadores D-01 a D-21 citados en PRD, visión, historias, tickets y `CLAUDE.md`; propagación hacia arriba y abajo (guía §5.1); contratos `Expone` / `Consume` en los 37 tickets; orden de construcción verificado contra las dependencias; criterio de parada (guía §5.3); y 20 pruebas de mutación en `scripts/test_check_docs.py`. Los contratos revelaron dependencias ocultas y dos ciclos (decisión ↔ pipeline y filtros ↔ puntaje), resueltos con el nuevo ticket T-37 y moviendo el encolado del puntaje a T-16. Totales sin cambio (must-have 35.5 h). Sin commit.

### Prompt 63

- **Categoría:** `📏 Reglas del proyecto`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  haz commit
  ```

- **Resultado:** Commit en la rama `feature/entrega-1-jr` con las seis mejoras al AI SDLC (decisiones D-xx, propagación bidireccional, contratos de ticket, orden verificado, criterio de parada y pruebas de mutación) y el ticket T-37. Sin push.
