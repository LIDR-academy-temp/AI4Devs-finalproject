[← spec](spec.md) | [← index](_index.md)

# design.md — FE-CRUD-002

[Patrón canónico](../PATRON_CRUD_ADMIN.md)

## Orden

| # | Pantalla | Estado |
|---|----------|--------|
| 1 | AdminAnunciosPage | ✓ Hecho |
| 2 | AdminArchivosPage | ✓ Hecho |
| 3 | AdminJuntasPage | ✓ Hecho |
| 4 | AdminEncuestasPage + ResultadosEncuestaPage | ✓ Hecho |

## Artefactos por pantalla

| Página | TableFilter | Mock MVC |
|--------|-------------|----------|
| AdminAnunciosPage | `anunciosTableFilter.ts` | `Web_diseño` anuncios si existe |
| AdminArchivosPage | opcional (pocos filtros) | upload en panel |
| AdminJuntasPage | `juntasTableFilter.ts` | split |
| AdminEncuestasPage | `encuestasTableFilter.ts` | publicar → `ConfirmDialog` |

Resultados encuesta: solo lectura — `PageHeader` + tablas simples (sin split).

Revisar `EncuestaDetallePage` / `ResultadosEncuestaPage` si bug `apiGet` (documentar en `impl.md`).
