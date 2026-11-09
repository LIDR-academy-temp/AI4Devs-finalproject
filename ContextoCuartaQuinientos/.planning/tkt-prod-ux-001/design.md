[← spec](spec.md) | [index](_index.md) | [impl →](impl.md)

# design.md — PROD-UX-001

## Estrategia

Retro-documentación + fixes mínimos ya aplicados en código; sin nuevo contrato REST salvo moras batch y admin pases ya definidos en tickets previos.

## Backend

| Área | Cambio | Riesgo |
|------|--------|--------|
| `CuartaUsuarioAdminService.ActualizarAdminExtrasAsync` | Resolver `PerfilID` **antes** de `BeginTransaction` | Alto si no despliega — PUT 400/500 |
| `UsuarioAdminRepository` | `TieneCasaOcupanteVigenteAsync` — no duplicar ocupante al re-guardar misma casa | Bajo |
| `CuartaVisitasGeneradasService` | Admin CRUD, `usar` → `InsertVisitaAsync`, `bUnaOcasion` | Medio — requiere SQL columna |
| `FinanzasService` + `FinanzasMorososController` | Moras lote + columna `MontoMora` | Medio — script mora |

## Frontend

| Área | Cambio |
|------|--------|
| `AdminPasesQrTable`, `PaseEstadoBadge`, `pasesQrTableFilter` | Badges BS5 + `resolveEstadoLista` |
| `AdminGenerarPaseQrSection` | Split panel Nuevo/compartir/editar |
| `AdminUsuariosPage` | Edit: perfil, casa, activo; `GET` perfil para unidad |
| `MorososTable`, `FinanzasAdminPage` | Lote moras + UI |

## Ocupación (operación)

- Alta ocupante: **Residentes** → vincular casa **o** backfill `CasaOcupantes` desde propietarios.
- **Casas** → propietario: cuotas/legacy; no alimenta `%` dashboard.

## Orden despliegue

Ver [release.md](release.md) e inventario SQL.

## Pruebas

| Capa | Suite |
|------|--------|
| API | `CuartaVisitasGeneradasServiceTests`, `FinanzasServiceMorasTests`, `CuartaUsuarioAdminServiceTests` |
| Web | `AdminUsuariosPage.test`, `MorososTable.test`, `visitasPaseSchemas.test` |
