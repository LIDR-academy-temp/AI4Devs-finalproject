# design.md — PROD-ADMIN-001

[← index](_index.md) | [spec](spec.md)

> Retro-documentación al cierre (implementación ya en rama `feature/entrega-2-AFS`).

## Orden de ejecución

1. **SQL prod** — `20261029_PROD-ADMIN-001_VALIDAR_GAPS.sql` → `APLICAR_FALTANTES.sql` (WMS + `arc.vsArchivos.FechaCreacion`); **no** `DB-001` en legacy. Ver [SQL/20261029_PROD-ADMIN-001_DESPLIEGUE_PROD.md](../../../SQL/20261029_PROD-ADMIN-001_DESPLIEGUE_PROD.md).
2. **API** — fixes ENC agregación; CRUD ANM tipos; CRUD SGR perfiles admin; SqlException 547 → 422 USR veh/mascotas.
3. **Web** — pestañas archivos/anuncios; CRUD perfiles admin.
4. **Deploy** — GraphApi → Web; smoke manual admin (2026-10-30 OK).

## Backend (peldaño 3–4)

| Área | Estrategia |
|------|------------|
| ANM tipos | Replicar `TiposArchivoController` en `TiposAnuncioController` + `ICuartaAnunciosService` |
| SGR perfiles | `CuartaNavegacionService` insert/update/soft delete + `PerfilesController` rutas `*/admin` |
| ENC resultados | Fix `GROUP BY` / casts en `CuartaEncuestasRepository` |
| USR veh/mascotas | `catch SqlException 547` → 422 con `code` de negocio |

## Frontend

- `AdminArchivosPage` — tabs Archivos | Tipos (`?tab=tipos`).
- `AdminAnunciosPage` — `AdminTiposAnuncioSection`.
- `AdminPerfilesPage` — Nuevo / editar / eliminar + permisos menú.

## Plan de pruebas

- SQL: scripts VALIDAR_* en prod (MCP/smoke).
- API: tests servicios Cuarta (encuestas, mascotas, anuncios donde existan).
- FE: Vitest páginas admin archivos/anuncios/perfiles.
- Smoke prod: CA spec § CA-1..CA-12 verificados manualmente 2026-10-30.

## Rollback

- Revert deploy API/Web; scripts SQL idempotentes (no DROP destructivo en ticket).
