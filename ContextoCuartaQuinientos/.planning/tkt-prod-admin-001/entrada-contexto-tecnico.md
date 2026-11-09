# Contexto técnico — PROD-ADMIN-001

## Stack afectado

| Capa | Repo | Convenciones |
|------|------|--------------|
| BD | `SQL/` | Sin SP de negocio; scripts idempotentes `DB-00N_*`; vistas `vs*` |
| API | `GraphApi/` | REST JWT `/{Dominio}/{Controller}`; `ProblemDetails` + `code` |
| Web | `Web/` | Admin Bootstrap + pestañas; hooks `use*Catalog`; Vitest |

## Evidencia verificada (MCP `user-CQ500hub`, 2026-10-29)

| Hallazgo | Evidencia |
|----------|-----------|
| Archivos 500 | `OBJECT_DEFINITION(arc.vsArchivos)` **no** expone `FechaCreacion`; `CuartaArchivosRepository.ListarAsync` la selecciona → error SQL |
| Almacén 400 | `CuartaAlmacenRepository` devuelve mensaje explícito si falta `wms.*` → falta `SQL/DB-005_wms_schema.sql` en prod |
| Tipos anuncio | `GET /ANM/TiposAnuncio` existe; **no** hay POST/PUT/DELETE JWT (solo `legacy`) |
| Perfiles admin | `GET /SGR/Perfiles/admin` + permisos menú; **no** CRUD JWT en ruta Cuarta |
| Encuestas resultados | `CuartaEncuestasRepository.ObtenerResultadosAsync` agrega con `COUNT` y castea filas dinámicas a `(int)` → riesgo **InvalidCastException** con `bigint` |
| Vehículos / mascotas 500 | Servicios hacen `catch { throw; }` sin mapear `SqlException` → cualquier FK/columna desalineada = 500 |
| Prod desalineada | Script `SQL/DB-009_fix_views_y_tablas.sql` (2026-10-29) documenta vistas `usr.*` y `sgr.RefreshTokens` rotas en prod |

## Scripts SQL relevantes (orden lógico)

1. `DB-001_alineacion_modelo.sql` (si prod nunca se alineó)
2. `DB-005_wms_schema.sql` (+ `DB-005_wms_prestamos_notas.sql` si aplica)
3. `DB-006_arc_vsarchivos_fechacreacion.sql`
4. `DB-009_fix_views_y_tablas.sql` (bundle prod mascotas/vehículos/login)
5. Seeds según módulo: `DB-003`, `DB-004`, `DB-008` (idempotentes)

## Referencias SDD previas

- [[FE-ADMIN-CAT-001]] — patrón pestañas catálogo (no cubrió anuncios, perfiles, archivos tabs)
- [[ANM-BE-027]] — anuncios JWT (tipos solo lectura)
- [[ARC-*]] / [[ENC-*]] / [[WMS-BE-029]] — dominios individuales en `.planning/`

## Targets en scope

`database:CuartaQuinientos` · `backend:GraphApi` · `frontend:cuartaquinientos-web`
