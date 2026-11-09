# Documentos de entrada — FE-MOD-ENC-001

## Contexto del requerimiento

- Las encuestas son un **módulo** (encuesta → preguntas → opciones → publicar → responder → resultados), no un CRUD de una sola fila con pregunta/opciones en textarea.
- Fuente funcional y visual: **`Web_diseño/Web/Views/Encuestas/`** y controllers `Web_diseño/Web/Controllers/Encuestas/`.
- Comportamiento de dominio: [specs/encuestas.md](../../specs/encuestas.md) (INV-1..INV-7).
- Estado actual React: `AdminEncuestasPage` mezcla listado PAT con **creación simplificada** (1 pregunta + líneas de opciones) — **no cumple** el diseño legacy ni el flujo admin.

## Contexto técnico

- API Cuarta: `GraphApi/Controllers/ENC/Encuestas/EncuestasController.cs` — `Crear` anida preguntas; `Publicar`; `GET detalle/resultados`; **sin** `PUT` metadata ni CRUD incremental de preguntas/opciones JWT.
- Legacy ENC (`PreguntasController`, headers UserID/WindowName): **no** usar en SPA; migrar lógica a servicio Cuarta si hace falta.
- Front stack: React 18, `cq-admin.css`, `AdminListToolbar`, `AdminSplitLayout`, RHF+Zod, `apiClient` con JWT.
- Residente: `EncuestasPage`, `EncuestaDetallePage` (revisar paridad con `EncuestasResidente.cshtml` / `ResponderEncuesta.cshtml` en fase 2 del design).

## Mockup / diseño visual

| Pantalla referencia | Archivo |
|---------------------|---------|
| Listado admin + panel metadata | `Web_diseño/Web/Views/Encuestas/Encuestas.cshtml` |
| Editor preguntas/opciones | `Web_diseño/Web/Views/Encuestas/EncuestaDetalle.cshtml` |
| Resultados | `Web_diseño/Web/Views/Encuestas/ResultadosEncuesta.cshtml` |
| Residente lista | `Web_diseño/Web/Views/Encuestas/EncuestasResidente.cshtml` |
| Residente responder | `Web_diseño/Web/Views/Encuestas/ResponderEncuesta.cshtml` |

Adaptar a **shell actual** (AppShell, breadcrumbs, tokens PAT) manteniendo jerarquía, acciones y densidad del mock.
