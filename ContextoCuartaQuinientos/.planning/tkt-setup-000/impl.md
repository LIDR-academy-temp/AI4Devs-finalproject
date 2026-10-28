[← index](_index.md) | [← design](design.md)

# impl.md — SETUP-000

## Verificación

| CA | Estado | Notas |
|----|--------|-------|
| CA-1 build API | Hecho | `dotnet build` + test 38/40 (integración sin BD) |
| CA-2 JWT + políticas | Hecho | `RoleClaimType=perfil`, `SoloAdministrador`, `AdminOAsignado`, rate limit `login` |
| CA-3 health | Existente | `MapHealthChecks("/health")` |
| CA-4 ProblemDetails | Hecho | `Result` + `SetupDiagnosticsController` |
| CA-5 Testcontainers | Parcial | Test smoke Docker + placeholders `DB-001`/`DB-002` |
| CA-6 Web build | Hecho | `npm test` + `npm run build` OK |
| CA-7 PrivateRoute | Hecho | Vitest 2 tests |
| CA-8 CI | Hecho | `.github/workflows/ci.yml` |

## Archivos clave

- `Web/` — Vite React 18/19, Tailwind 4, Apollo, Router, Auth en memoria (scaffold).
- `GraphApi/Infrastructure/Common/Result*.cs`, `Controllers/Setup/SetupDiagnosticsController.cs`.
- `SQL/DB-001_alineacion_modelo.sql`, `SQL/DB-002_seeds_catalogos.sql` — placeholders hasta tickets DB.

## Siguiente ticket

DB-000 → DB-001 → DB-002 en hosting `db24572`, luego USR-BE-007.
