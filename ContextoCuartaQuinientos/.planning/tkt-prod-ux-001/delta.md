[← impl](impl.md) | [index](_index.md)

# delta.md — PROD-UX-001

## ADDED

- `Web/src/features/admin/visitas/PaseEstadoBadge.tsx`
- `Web/src/features/admin/visitas/AdminPasesQrTable.tsx`, `pasesQrTableFilter.ts`, `PaseQrAdminMobileCard.tsx`
- `GraphApi/Models/FNZ/MorasBatchDtos.cs`, `AplicarMorasRequestValidator`, `CondonarMorasRequestValidator`
- `GraphApi/GraphApi.Tests/FinanzasServiceMorasTests.cs`
- `SQL/20261030_vts_visitas_una_ocasion.sql`
- `SQL/20261029_fnz_cuotas_monto_mora.sql`
- `SQL/20261030_PROD-UX-001_INVENTARIO_CAMBIOS.md`

## MODIFIED

- **VTS**: `CuartaVisitasGeneradasService`, repository, controller, DTOs; admin pases + usar → visita.
- **SGR**: `CuartaUsuarioAdminService`, `UsuarioAdminRepository` (ocupante + fix PUT).
- **FNZ**: moras lote, morosos UI/API, `MontoMora` en cuotas.
- **Web**: `AdminGenerarPaseQrSection`, `AdminUsuariosPage`, `MorososTable`, `FinanzasAdminPage`, hooks/schemas visitas pase.
- **Specs**: `visitas-areas.md`, `usuarios.md`, `finanzas.md`, `dashboard.md` (changelog).

## REMOVED

- (ninguno)

## Comportamiento sistema

- Admin ve estado pase QR con badges visibles en tema `cq-admin`.
- Editar residente envía perfil + casaId; API crea ocupante sin duplicar vigente.
- Morosos admin puede aplicar/condonar moras en lote.
- Dashboard ocupación sigue regla `CasaOcupantes` (sin cambio de fórmula).
