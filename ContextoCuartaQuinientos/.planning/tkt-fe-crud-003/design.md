[← spec](spec.md) | [← index](_index.md)

# design.md — FE-CRUD-003

[Patrón canónico](../PATRON_CRUD_ADMIN.md) · Referencia: `AdminCasasPage.tsx`, form vehículo: `MisVehiculosPage.tsx`

## Estrategia técnica

Migración **Web + API acotada** en `USR/Automoviles` para CRUD admin (hoy solo `buscar` y mutaciones de residente). Resto: solo frontend.

**Orden:** API vehículos admin → Visitas → Vehículos UI → Mascotas → Almacén.

### Escalera de decisión

| Capacidad | Peldaño | Objeto |
|-----------|---------|--------|
| Admin CRUD vehículo ajeno | 5 | Rutas `…/admin` + métodos servicio sin `EsDuenio` |
| Layout / tablas admin | 3 | Componentes FE-PAT-002 |
| Visitas / almacén / mascotas | 3–4 | Hooks y DTOs existentes |

## Contratos API

### Existentes (sin cambio de semántica)

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/VTS/Visitas?casaId&desde&hasta` | SoloAdministrador |
| POST | `/VTS/Visitas` | Guardia/Admin |
| PATCH | `/VTS/Visitas/{id}/salida` | Guardia/Admin |
| GET | `/USR/Automoviles/buscar?placas=` | AdminOGuardia |
| GET | `/USR/Mascotas/padron` | SoloAdministrador |
| WMS Artículos / Préstamos | (actual) | SoloAdministrador |

### Nuevos — vehículos admin (`SoloAdministrador`)

| Método | Ruta | Body | Response |
|--------|------|------|----------|
| GET | `/USR/Automoviles/padron` | — | `AutomovilListItemDto[]` |
| POST | `/USR/Automoviles/admin` | `AutomovilCrearAdminRequest` (`usuarioId` + campos crear) | 201 + item |
| PUT | `/USR/Automoviles/{id}/admin` | `AutomovilActualizarRequest` | 204 |
| DELETE | `/USR/Automoviles/{id}/admin` | — | 204 |

Códigos reutilizados: `VEH_PLACAS_REQUERIDAS`, `VEH_PLACAS_DUPLICADAS`, `VEH_NOT_FOUND`, `VEH_USUARIO_INVALIDO` (422 si `usuarioId` ≤ 0 o usuario inactivo).

**Visitas:** `RegistrarVisitaRequest.UsuarioVisitadoId` obligatorio — selector residente en form.

## backend:cuartaquinientos-api

| Archivo | Acción |
|---------|--------|
| `Models/USR/CuartaAutomoviles/CuartaAutomovilDtos.cs` | + `AutomovilCrearAdminRequest` |
| `Repositories/USR/ICuartaAutomovilesRepository.cs` | + `ListarPadronAsync`, `ExisteActivoAsync`, `UsuarioActivoAsync` |
| `Repositories/USR/CuartaAutomovilesRepository.cs` | Implementar |
| `Services/USR/CuartaAutomoviles/ICuartaAutomovilesService.cs` | + admin CRUD |
| `Services/USR/CuartaAutomoviles/CuartaAutomovilesService.cs` | `CrearParaUsuarioAsync`, `ActualizarComoAdminAsync`, `EliminarComoAdminAsync` |
| `Controllers/USR/Automoviles/AutomovilesController.cs` | 4 acciones admin |
| `GraphApi.Tests/CuartaAutomovilesServiceTests.cs` | + TC admin (crear, duplicado, update sin dueño, delete) |

Lógica admin:

- **Crear:** validar placas + `usuarioId` propietario; `InsertAsync` con ese `usuarioId`; auditoría con correo admin.
- **Actualizar / eliminar:** `ExisteActivoAsync` en lugar de `EsDuenioAsync`; mismas reglas de placas duplicadas.

## database:CuartaQuinientos

No aplica (sin DDL).

## frontend:cuartaquinientos-web

| Archivo | Acción |
|---------|--------|
| `features/admin/vehiculos/vehiculosAdminSchemas.ts` | Zod create/edit + `usuarioId` |
| `features/admin/vehiculos/vehiculosTableFilter.ts` | Columnas |
| `features/admin/vehiculos/useVehiculosAdmin.ts` | `padron`, `buscar`, mutaciones admin |
| `pages/AdminVehiculosPage.tsx` | Split CRUD (reusar `useMarcas`/`useModelos`) |
| `shared/types/vehiculos.ts` | + `AutomovilCrearAdminRequest` |
| Visitas / mascotas / almacén | (sin cambio de alcance vs design previo) |

### Vehículos UI

- Carga inicial: `GET /USR/Automoviles/padron`.
- Toolbar: KPI + búsqueda API opcional (`buscar`) que **reemplaza** filas o fusiona (implementación: reemplazar dataset al buscar; botón “Ver todos” recarga padron).
- Split: alta (`usuarioId` select `usePadronUsuarios`), edición fila, delete `ConfirmDialog`.
- `apiPost('/USR/Automoviles/admin')`, `apiPut('…/admin')`, `apiDelete('…/admin')`.

## Contenido configurable

Sin cambios (marcas/modelos desde catálogo API).

## Revisión adversarial

| Riesgo | Mitigación |
|--------|------------|
| Confundir rutas residente vs admin | Sufijo `/admin` explícito; tests servicio |
| Alta vehículo a usuario inactivo | `UsuarioActivoAsync` en servicio |
| Estimación >400 líneas | Orden fijo; BE vehículos primero y acotado |

## Orden de implementación

| # | Paso | Target | Verificación | Estado |
|---|------|--------|--------------|--------|
| 0 | Ramas `feature/fe-crud-003-registro-admin` (API + Web) | git | branch activa | Pendiente |
| 1 | API vehículos admin + tests xUnit | backend | `dotnet test` CuartaAutomoviles* | Pendiente |
| 2 | Visitas split + schemas | frontend | `npm test AdminVisitasPage` | Pendiente |
| 3 | Vehículos admin UI | frontend | `npm test AdminVehiculosPage` | Pendiente |
| 4 | Mascotas tabla | frontend | tests | Pendiente |
| 5 | Almacén tabs + split | frontend | manual smoke | Pendiente |
| 6 | Global | ambos | tsc + vite + dotnet test | Pendiente |

## Plan de pruebas

### Backend (xUnit)

| ID | Tipo | Entrada | Expected |
|----|------|---------|----------|
| TC-ERR-VEH-1 | negativo | Crear admin `usuarioId=0` | 422 `VEH_USUARIO_INVALIDO` |
| TC-ERR-VEH-2 | negativo | Crear placas duplicadas | 409 |
| TC-VEH-1 | happy | Crear admin usuario válido | 201 |
| TC-VEH-2 | happy | Actualizar como admin sin ser dueño JWT | 204 |
| TC-INV-VEH-1 | regresión | Residente `ActualizarAsync` no dueño | 404 (sin cambio) |

### Frontend (Vitest)

| ID | Cubre |
|----|-------|
| TC-4 | Panel crear vehículo abre |
| TC-ERR-1 | Visitas Zod visitado |
| TC-INV-1 | Sin `window.confirm` en delete vehículo |

SQL `*PruebasUnitarias.sql`: **No aplica** (sin SP).

## Estimación

~500–650 líneas (BE ~120 + FE ~400). Supera 400 — aceptado por alcance CRUD vehículos acordado; no dividir ticket.
