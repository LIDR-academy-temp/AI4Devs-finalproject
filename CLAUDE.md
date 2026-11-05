# CLAUDE.md

Contrato de trabajo para agentes de IA en este repositorio. Si una instrucción de aquí contradice un documento de `docs/`, avisa en lugar de elegir una.

## Proyecto

AI Job Match, un ATS (Applicant Tracking System) personal: panel web para buscar empleo en EE. UU. Concentra ofertas, aplica filtros duros sin IA, calcula con Claude un puntaje de encaje explicado contra el currículum y gestiona las candidaturas en un pipeline. Proyecto final del Master AI4Devs; un solo usuario.

Lee antes de proponer o implementar:

| Documento | Contenido |
| --- | --- |
| `docs/vision.md` | Problema, hipótesis, alcance `MVP` / `v1.1` / `futuro` y lo que el producto no hará |
| `docs/prd.md` | Épicas E1-E5, historias HU1-HU10, requisitos RF-xx y RNF-xx |
| `docs/user-stories.md` y `docs/tickets.md` | Criterios de aceptación y tickets técnicos |
| `docs/architecture.md` | Componentes, estructura, modelo de datos y API |
| `docs/adr/` | Decisiones de arquitectura (un ADR aceptado no se reescribe: se reemplaza con uno nuevo) |
| `docs/prd-review.md`, `docs/architecture-review.md` | Revisiones adversariales y su resolución |
| `docs/sdlc-checklist.md` | Estado de las compuertas G0-G3 |
| `openspec/specs/` | Comportamiento vigente (fuente de verdad) |

No implementes nada etiquetado `v1.1` o `futuro` sin un cambio de OpenSpec aprobado.

## Stack

- Monorepo pnpm: `apps/api` (AdonisJS v7, Node.js 24, Lucid, VineJS, Japa) y `apps/web` (React 19, Vite, TanStack Query, Tuyau, react-i18next).
- PostgreSQL para datos y cola de trabajos. Claude API con `@anthropic-ai/sdk`.
- Pruebas E2E con Playwright en `e2e/`. Despliegue en Railway con un solo contenedor (`Dockerfile` multi-etapa).

## Comandos

> Se confirman al crear el walking skeleton. Actualiza esta sección si cambian.

```bash
pnpm install                         # dependencias de todo el monorepo
docker compose up -d db              # PostgreSQL local
pnpm --filter api exec node ace migration:run
pnpm dev                             # API y SPA en modo desarrollo
pnpm lint && pnpm typecheck          # calidad estática
pnpm --filter api test               # Japa: unitarias y funcionales
pnpm --filter web test               # pruebas de la SPA
pnpm e2e                             # Playwright (requiere la app en marcha)
pnpm --filter api evals              # golden set contra la API real de Claude (cuesta dinero; solo a mano)
pnpm build                           # build de producción de ambas apps
python3 scripts/check_docs.py        # compuerta G3: totales, referencias, ADRs y readme al día
python3 scripts/check_docs.py --build-readme   # regenera readme.md desde docs/
```

## Convenciones

**Idioma**
- Código, identificadores, tablas, columnas, rutas de API y tipo de commit (`feat`, `fix`…): inglés.
- Interfaz: inglés como idioma principal; todas las cadenas en archivos de i18n (`apps/web/src/locales/`), nunca escritas en los componentes.
- Documentación del curso (`docs/`, `readme.md`, `prompts.md`), specs y propuestas de OpenSpec: español.
- En textos en español escribe "currículum", no "CV".

**Código**
- TypeScript estricto. Sin `any` salvo justificación en un comentario.
- Tablas y columnas en `snake_case`; propiedades de modelos y JSON de la API en `camelCase`.
- Backend por capas: controladores delgados → servicios de dominio → modelos Lucid. La lógica de dominio no importa de controladores.
- Integraciones externas detrás de interfaces: `JobSourceAdapter` para plataformas de empleo, un cliente de IA inyectable para Claude.
- Validar toda entrada con VineJS en el borde de la API.
- Respuestas de la API con la forma `{ data, error, meta }` (ver `docs/architecture.md`, sección 4).
- Funciones de menos de 50 líneas y archivos de menos de 800; preferir objetos inmutables.

**IA**
- Modelos solo por variables de entorno (`CLAUDE_MODEL_EXTRACTION`, `CLAUDE_MODEL_MATCH`, `CLAUDE_MODEL_EMAIL`); nunca escritos en el código (ADR-0003).
- Respuestas estructuradas validadas con esquema; los esquemas viven en `apps/api/app/ai/schemas/` y los prompts en `apps/api/app/ai/prompts/`, con versión.
- Un cambio de prompt sube su versión y se evalúa con el golden set antes de mergear.
- El texto externo (ofertas, correos, currículum) va delimitado como dato, nunca como instrucción.
- Envía Markdown a la IA, no PDF ni HTML, salvo la conversión inicial del currículum en PDF (ADR-0004).
- Revisa `stop_reason` antes de leer la respuesta.
- Toda llamada a la IA pasa por el control de gasto (`ai_usage` y topes `AI_DAILY_BUDGET_USD` / `AI_MONTHLY_BUDGET_USD`, ADR-0008). Las ofertas importadas solo se puntúan a pedido.
- Nunca uses datos reales en la instancia de demostración (ADR-0007).

**Seguridad**
- Ningún secreto en el repositorio; solo variables de entorno. Mantén `.env.example` al día.
- No registres en los logs el contenido completo del currículum ni de los correos.
- Ningún cambio de estado de una candidatura se aplica por la IA sin confirmación del usuario.

## Pruebas

- TDD: escribe primero la prueba que falla, luego el código mínimo, luego refactoriza.
- Cada escenario de una spec de OpenSpec tiene una prueba de aceptación con el mismo nombre.
- Cobertura mínima del 80 % en la lógica de dominio (`apps/api/app/services/`, filtros, pipeline).
- Las pruebas nunca llaman a la API real de Claude ni a Greenhouse: usa el doble de prueba del cliente de IA y respuestas grabadas.
- Patrón Arrange-Act-Assert y nombres que describan el comportamiento.
- Un hook de Claude Code ejecuta lint y pruebas después de cada edición (se configura en T-01).

## Flujo de trabajo

1. Cada épica es una capability de OpenSpec (`openspec/specs/<capability>/`) y cada historia es un cambio de OpenSpec: `/opsx:propose` → aprobación humana → `/opsx:apply` → PR → `/opsx:archive`.
2. Un cambio = una rama = un PR. Si `tasks.md` supera unas 15 tareas, divide el cambio.
3. Inicia `/opsx:apply` en una sesión nueva, con contexto limpio.
4. Las decisiones de arquitectura nuevas se registran como ADR en `docs/adr/`; no se toman como ediciones sueltas.
5. Commits en formato Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`). Haz commit o push solo cuando el usuario lo pida.
6. Registra cada prompt en `docs/ai-log.md` según `.claude/rules/ai-log.md`.
7. Respeta las compuertas y la gestión de cambios de `.claude/rules/sdlc-gates.md` y `docs/sdlc-checklist.md`. `readme.md` se genera; no lo edites a mano, edita `scripts/readme.template.md` o `docs/`.

## Definition of done (por cambio)

- [ ] Propuesta de OpenSpec aprobada por el usuario.
- [ ] Todas las tareas de `tasks.md` completadas.
- [ ] Cada escenario nuevo o modificado tiene su prueba de aceptación.
- [ ] Pruebas unitarias escritas primero (TDD); cobertura ≥ 80 % en el dominio.
- [ ] `pnpm lint`, `pnpm typecheck`, pruebas y build en verde, local y en CI.
- [ ] Textos nuevos de la interfaz en los archivos de i18n.
- [ ] ADR creado si hubo una decisión de arquitectura.
- [ ] Documentación actualizada (`docs/`, `readme.md`, este archivo si cambiaron comandos).
- [ ] PR revisado y mergeado; cambio archivado con `/opsx:archive`.
