# Delta: tkt-fe-mod-enc-001-modulo-encuestas

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Admin **bandeja** `/admin/encuestas`: solo metadatos (crear/editar borrador), filtro «Solo activas», KPIs, publicar, eliminar borrador con `ConfirmDialog`, enlace a detalle y resultados.
- Admin **detalle** `/admin/encuestas/:id`: CRUD preguntas y opciones (JWT admin); tipos desde `GET /ENC/TiposPregunta` por `tipoPreguntaId`.
- Admin **resultados**: hero KPI + barras de porcentaje por opción.
- API Cuarta: `PUT`/`DELETE /ENC/Encuestas/{id}` (solo borrador); CRUD anidado preguntas/opciones bajo `/ENC/Encuestas/...`; publicar con validación `SIN_PREGUNTAS` si 0 preguntas.
- Crear encuesta admite `preguntas: []` (borrador sin preguntas).

## Comportamiento modificado

- **(Antes):** `AdminEncuestasPage` capturaba una pregunta en el panel de alta.
- **(Después):** Panel solo metadatos; preguntas en ruta de detalle dedicada.

- **(Antes):** Alta de pregunta solo por nombre de tipo (frágil vs catálogo BD).
- **(Después):** Resolución por `tipoPreguntaId` (+ nombre) en `CuartaEncuestasRepository`.

## Comportamiento eliminado

- Flujo admin «encuesta + pregunta en un solo formulario» en bandeja.
- `window.confirm` en eliminación de pregunta (reemplazado por `ConfirmDialog`).
- Controlador duplicado `TiposPregunta` bajo carpeta `Encuestas/` (queda uno en `ENC/TiposPregunta`).

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| — | — | Sin cambios DDL (solo lectura/escritura Dapper sobre tablas `enc.*` existentes) |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| `/ENC/TiposPregunta` | GET | Expuesto admin (catálogo Cuarta) |
| `/ENC/Encuestas/{id}` | PUT | Modificado (metadatos borrador) |
| `/ENC/Encuestas/{id}` | DELETE | Creado (borrador) |
| `/ENC/Encuestas/{encuestaId}/preguntas` | POST | Creado |
| `/ENC/Encuestas/preguntas/{preguntaId}` | PUT | Creado |
| `/ENC/Encuestas/preguntas/{preguntaId}` | DELETE | Creado |
| `/ENC/Encuestas/preguntas/{preguntaId}/opciones` | POST | Creado |
| `/ENC/Encuestas/opciones/{opcionId}` | PUT | Creado |
| `/ENC/Encuestas/opciones/{opcionId}` | DELETE | Creado |
| `/ENC/Encuestas/{id}/publicar` | PUT | Modificado (exige ≥1 pregunta) |
| `/ENC/Encuestas` | POST | Modificado (`preguntas` vacío OK) |

## Aprendizajes

- Catálogo `enc.TiposPregunta` en BD puede no coincidir con labels del mockup; el FE debe enviar **id**, no asumir nombres.
- Tests de páginas con `<Link>` requieren `MemoryRouter` en Vitest.

## Decisiones (ADR)

- Rutas de preguntas/opciones anidadas bajo `EncuestasController` (no controllers `Preguntas`/`Opciones` separados) para alinear con un solo agregado «encuesta borrador».

## Para el reviewer

- **Qué se hizo:** Módulo admin encuestas alineado a flujo bandeja → detalle → publicar → resultados, con API CRUD Cuarta.
- **Por qué:** FE-MOD-ENC-001 / paridad `Web_diseño`.
- **Riesgo:** Bajo — cambios acotados a ENC admin + tests; residente sin cambio de contrato.
- **Qué probar:** Crear borrador → agregar 2 preguntas (opción múltiple + texto) → publicar → ver resultados; editar metadatos borrador; eliminar borrador; publicar sin preguntas → 422.
- **Rollback:** Revertir PR; no hay migración SQL.
