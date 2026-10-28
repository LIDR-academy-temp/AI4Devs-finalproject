# Delta: ANM-BE-027 — Anuncios y comunicados (API Cuarta)

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- `GET /ANM/Anuncios` — lista paginable de comunicados vigentes; admins pueden pasar `?incluirNoVigentes=true`.
- `GET /ANM/Anuncios/{id}` — detalle individual; residentes solo ven vigentes.
- `PATCH /ANM/Anuncios/{id}/visto` — registra lectura en bitácora (idempotente, `UPDLOCK HOLDLOCK`).
- `POST /ANM/Anuncios` (SoloAdministrador) — crea anuncio; tipo resuelto por nombre; envía `AvisoGeneralAsync` sin bloquear si falla.
- `PUT /ANM/Anuncios/{id}` (SoloAdministrador) — actualización parcial; `vigenteHasta` solo pisado si viene en el body.
- `DELETE /ANM/Anuncios/{id}` (SoloAdministrador) — soft delete.
- `GET /ANM/TiposAnuncio` — catálogo de tipos (JWT, sin rol especial).
- Endpoints `*/legacy` conservados para scaffold anterior.

## Comportamiento modificado

- `AnunciosController`: rutas legacy movidas a `*/legacy`; rutas Cuarta ahora en raíz con JWT.
- `TiposAnuncioController`: misma separación legacy/Cuarta.

## Comportamiento eliminado

- Ninguno (scaffold legacy intacto).

## Objetos SQL afectados

| Objeto | Esquema | Tipo | Acción |
|--------|---------|------|--------|
| `anm.TiposAnuncio` | `anm` | tabla | DML seed (DB-003) — valores `General`, `Urgente`, `Mantenimiento` |
| `anm.Anuncios` | `anm` | tabla | Sin DDL — solo DML vía servicio |
| `anm.LogVisualizacionAnuncios` | `anm` | tabla | Sin DDL — INSERT en `PATCH /visto` |

## Archivos backend modificados/creados

| Archivo | Acción |
|---------|--------|
| `GraphApi/Models/ANM/Anuncios/CuartaAnunciosDtos.cs` | Creado |
| `GraphApi/Repositories/ANM/ICuartaAnunciosRepository.cs` | Creado |
| `GraphApi/Repositories/ANM/CuartaAnunciosRepository.cs` | Creado |
| `GraphApi/Services/ANM/Anuncios/ICuartaAnunciosService.cs` | Creado |
| `GraphApi/Services/ANM/Anuncios/CuartaAnunciosService.cs` | Creado |
| `GraphApi/Controllers/ANM/Anuncios/AnunciosController.cs` | Modificado (legacy → `*/legacy`; Cuarta en raíz) |
| `GraphApi/Controllers/ANM/TiposAnuncio/TiposAnuncioController.cs` | Modificado |
| `GraphApi/Infrastructure/ServiceCollectionExtensions.cs` | Modificado (DI) |
| `GraphApi.Tests/ANM/CuartaAnunciosServiceTests.cs` | Creado |
| `GraphApi.Tests/ANM/AnunciosAuthorizationTests.cs` | Creado |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| `/ANM/Anuncios` | GET | Nuevo (Cuarta JWT) |
| `/ANM/Anuncios/{id}` | GET | Nuevo |
| `/ANM/Anuncios/{id}/visto` | PATCH | Nuevo |
| `/ANM/Anuncios` | POST | Nuevo (SoloAdministrador) |
| `/ANM/Anuncios/{id}` | PUT | Nuevo |
| `/ANM/Anuncios/{id}` | DELETE | Nuevo |
| `/ANM/TiposAnuncio` | GET | Nuevo |

## Frontend afectado

Ninguno — consumidor: [FE-043](../tkt-fe-043/delta.md).

## Para el reviewer

- **Qué se hizo**: capa REST Cuarta completa para Anuncios (HU-ANM-01 / HU-ANM-02).
- **Por qué**: FE-043 requiere contrato JWT; scaffold legacy no usable en FE.
- **Riesgo**: Bajo — DDL existente; sin SP; transacciones Dapper parametrizadas.
- **Qué probar**: `dotnet test --filter CuartaAnuncios|AnunciosAuthorization` (7/7); SQL `DB-003` + `20261019_ANM-BE-027_PruebasUnitarias.sql` (4/4 CQ500).
- **Rollback**: Revertir PR backend; legacy sigue respondiendo.

## Pruebas ejecutadas

| Suite | Resultado |
|-------|-----------|
| xUnit `CuartaAnunciosServiceTests` (6) + `AnunciosAuthorizationTests` (1) | **7/7 PASS** |
| T-SQL `20261019_ANM-BE-027_PruebasUnitarias.sql` (CQ500) | **4/4 PASS** |
| `.http` endpoints | PARCIAL — login 401 local sin hash seed; auth cubierto por xUnit |

## Aprendizajes / ADR

- `JsonElement` en PUT para detectar `vigenteHasta` explícito (flag `VigenteHastaEspecificado`); evita borrar fecha si campo omitido.
- `UPDLOCK HOLDLOCK` en `MarcarVistoAsync` previene doble INSERT concurrente.
- `AvisoGeneralAsync` (Should): fire-and-forget post-commit; fallo → log warning, sin rollback.
