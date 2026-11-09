[← design](design.md) | [index](_index.md) | [delta →](delta.md)

# impl.md — PROD-UX-001

## Implementación (resumen)

Código ya presente en rama de trabajo; este ticket retro-justifica y cierra SDD.

### API (GraphApi)

- `Services/SGR/Usuarios/CuartaUsuarioAdminService.cs` — fix transacción; guard ocupante duplicado.
- `Repositories/SGR/UsuarioAdminRepository.cs` — `TieneCasaOcupanteVigenteAsync`.
- `Services/VTS/CuartaVisitasGeneradas/*` — admin pases, usar + bitácora, `unaOcasion`.
- `Services/FNZ/FinanzasService.cs`, `Controllers/Reports/FinanzasMorososController.cs` — moras lote.
- `Models/FNZ/MorasBatchDtos.cs`, validadores aplicar/condonar.

### Web

- `features/admin/visitas/AdminPasesQrTable.tsx`, `PaseEstadoBadge.tsx`, `AdminGenerarPaseQrSection.tsx`, `pasesQrTableFilter.ts`.
- `pages/AdminUsuariosPage.tsx`, `features/admin/usuarios/usuariosAdminSchemas.ts`.
- `features/admin/finanzas/MorososTable.tsx`, `FinanzasAdminPage.tsx`, `finanzasAdmin.api.ts`.

### SQL

- `20261030_vts_visitas_una_ocasion.sql`
- `20261029_fnz_cuotas_monto_mora.sql`

## Verificación (/revisar)

| Check | Resultado |
|-------|-----------|
| `dotnet build` GraphApi | OK |
| `dotnet test` GraphApi.Tests | **175/176** OK; 1 smoke integration (API local apagada) |
| `vitest` AdminUsuarios + MorososTable | **10/10** OK |
| `tsc --noEmit` Web | OK (sesión previa) |

## Auditoría

- **auditor-sql**: scripts idempotentes revisados en inventario; desplegar en prod manualmente.
- **auditor-codigo**: fix transacción alineado a patrón `UsuarioPerfilRepository.EnsureColumnNames` (no HasColumn dentro de tx).
- **Veredicto**: **APROBADO** para cierre documental; deploy prod pendiente humano.

## Riesgos residuales

- Prod sin SQL `bUnaOcasion` / `MontoMora` → fallos runtime en pases/moras.
- Ocupación 0% si solo hay propietario en Casas sin `CasaOcupantes` (comportamiento documentado).
