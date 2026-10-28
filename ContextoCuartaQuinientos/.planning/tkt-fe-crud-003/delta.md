# Delta: tkt-fe-crud-003-registro-admin

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- **API admin vehículos** (`SoloAdministrador`): `GET /USR/Automoviles/padron`, `POST /USR/Automoviles/admin`, `PUT /USR/Automoviles/{id}/admin`, `DELETE /USR/Automoviles/{id}/admin` — CRUD sobre cualquier vehículo activo; alta con `usuarioId` propietario; validación usuario activo y placas duplicadas (códigos `VEH_*`).
- **Web admin registro**: cuatro rutas al patrón `cq-admin` — visitas (split + Zod + `usuarioVisitadoId`), vehículos (padrón + CRUD admin), mascotas (`AdminFilterableTable`), almacén (tabs Bootstrap + split + `ConfirmDialog`).
- Tests: xUnit `CuartaAutomovilesServiceTests`; Vitest en las cuatro páginas admin; `FE-CRUD-003_api_tests.http` y [FE-CRUD-003-APIS.md](FE-CRUD-003-APIS.md).

## Comportamiento modificado

- **(Antes)** Admin visitas: modal Tailwind; salida con `alert`; sin `usuarioVisitadoId` en UI.
- **(Después)** Split panel + filtros fecha/casa; `PATCH …/salida` con `ConfirmDialog`.

- **(Antes)** Admin vehículos: solo búsqueda por placa; sin alta/edición/baja admin en API.
- **(Después)** Padrón + panel CRUD vía rutas `/admin`; residente sin cambio en `POST/PUT/DELETE` sin sufijo.

- **(Antes)** Admin mascotas: tabla Tailwind simple.
- **(Después)** `AdminFilterableTable` + estados carga/error/vacío.

- **(Antes)** Admin almacén: modales Tailwind sueltos.
- **(Después)** Tabs Bootstrap + split; **sin** `AdminFilterableTable`/Zod en inventario/préstamos (residual CA-1).

- **(Antes)** Hooks `useVisitas` / `useVehiculos` / `useAlmacen` / `useMascotas` desalineados con `apiGet`.
- **(Después)** Contrato `{ data, problem, status }` unificado.

## Comportamiento eliminado

- `window.alert` / `window.confirm` en flujos de negocio de las cuatro páginas admin del ticket.

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| — | — | Ninguno |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| `/USR/Automoviles/padron` | GET | Creado |
| `/USR/Automoviles/admin` | POST | Creado |
| `/USR/Automoviles/{id}/admin` | PUT | Creado |
| `/USR/Automoviles/{id}/admin` | DELETE | Creado |

## Para el reviewer

- **Qué se hizo**: Registro admin (visitas, vehículos, mascotas, almacén) + API CRUD vehículos administrador.
- **Por qué**: FE-CRUD-003 — patrón FE-PAT-002 y gaps de registro operativo.
- **Riesgo**: Medio-bajo — nuevos endpoints admin (auth `SoloAdministrador`); rutas residente intactas.
- **Qué probar**: `/admin/visitas` (alta con residente, salida confirmada); `/admin/vehiculos` (padrón, crear para otro usuario, editar/borrar); `/admin/mascotas`; `/admin/almacen`; `dotnet test` filtro Automoviles; `npm test` páginas admin.
- **Rollback**: Revertir `GraphApi` + `Web`; sin DDL.

## Aprendizajes

- Sufijo `/admin` en REST desacopla mutaciones administrador de las del residente (misma tabla `usr.Automoviles`).
- Tests Vitest en páginas con filtros duplican textos de badges — acotar por `heading`, `cell` o clase `badge`.

## Decisiones (ADR)

- **Dual-path vehículos**: mutaciones admin solo en rutas `…/admin`; dueño sigue en rutas sin sufijo (INV-3 spec).
- **Almacén v1**: split + confirm sin tabla filtrable — deuda documentada vs DoD patrón completo.
