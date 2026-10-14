# Tramo 0 â€” quÃ© hay en este paquete y cÃ³mo ponerlo en verde

Contenido del paquete (se copia encima del repositorio, en `C:\Projects\recon-tool-2`, rama
`feature/entrega-2-MVP`; no toca `README.md`):

| Ruta | QuÃ© es |
|---|---|
| `backend/prisma/schema.prisma` | Modelo de datos completo (38 tablas) derivado del README Â§3.2 |
| `backend/prisma/migrations/0001_init/` | DDL base en el formato de Prisma para SQL Server |
| `backend/prisma/migrations/0002_constraints/` | CHECK de dominios, Ã­ndices Ãºnicos filtrados y trigger de no solapamiento de fees |
| `backend/prisma/synthetic.ts` | Mundo sintÃ©tico determinista (catÃ¡logos, cuentas, ~24 k transacciones, 68 batches pagados) |
| `backend/prisma/seed.ts` | Seed idempotente (vacÃ­a y recarga) |
| `backend/prisma.config.ts`, `backend/package.json`, `backend/tsconfig.json` | ConfiguraciÃ³n de Prisma 7 con `@prisma/adapter-mssql` |
| `data/samples/` | Cinco conjuntos de muestra (`.xlsx` + `expected.json`) y los scripts que los regeneran |
| `infra/docker-compose.yml`, `infra/mssql/` | SQL Server 2022 con `recon_app` (mÃ­nimos) y `recon_reader` (solo lectura) |
| `.env.example` | Variables; copiar a `.env` y cambiar contraseÃ±as |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.node-version`, `biome.json`, `.husky/`, `.editorconfig`, `.gitattributes`, `.gitignore` | Monorepo, linter, hooks de git |
| `CLAUDE.md` / `AGENTS.md`, `.claude/settings.json`, `.claude/hooks/`, `.claude/skills/` | Instrucciones del agente, permisos, 3 hooks, 3 skills |
| `openspec/project.md`, `openspec/specs/*/spec.md` | Seis specs base (import, matching, validation, settlement, fees, accounts) |
| `.github/workflows/ci.yml`, `.github/dependabot.yml`, `.github/pull_request_template.md` | CI (lint, typecheck, tests, migraciÃ³n + seed contra SQL Server, gitleaks), Dependabot, plantilla de PR |
| `packages/shared/` | Vocabulario fijo como esquemas Zod |

## Pasos (PowerShell, dentro del repo)

```powershell
copy .env.example .env          # y edita las contraseÃ±as
pnpm install
pnpm db:up                      # SQL Server; espera ~30 s. pnpm db:logs para ver "ready for client connections"
pnpm db:generate                # cliente Prisma
pnpm db:migrate                 # aplica 0001_init y 0002_constraints
pnpm db:seed                    # ~1-2 min; termina con "[seed] listo en N s"
pnpm lint; pnpm typecheck; pnpm test
```

ComprobaciÃ³n en SSMS (`localhost,1433`, usuario `recon_app`):

```sql
SELECT COUNT(*) FROM dbo.[Transaction];            -- â‰ˆ 23 700
SELECT name, batchNo FROM dbo.Account a JOIN dbo.SettlementBatch b ON b.accountId = a.accountId WHERE b.status = 'paid' ORDER BY 1, 2;
SELECT * FROM dbo.MatchingSheetRule WHERE ruleSetId IS NULL ORDER BY priority;
```

Primer commit: `chore: bootstrap tramo 0 (prisma schema, seed, samples, infra, tooling)`.

## QuÃ© se validÃ³ y quÃ© no

- `schema.prisma` validado con el motor de Prisma (sin errores); el DDL de `0001_init` se generÃ³
  a partir del DMMF con la convenciÃ³n de nombres de Prisma para SQL Server.
- `0002_constraints` estÃ¡ escrito y revisado a mano; **no se ha ejecutado contra un SQL Server**
  (el entorno donde se preparÃ³ el paquete no tiene Docker). La primera ejecuciÃ³n real es la tuya:
  si `pnpm db:migrate` falla, pega el error completo y se corrige en minutos.
- `seed.ts` compila salvo por el cliente generado (que aparece con `pnpm db:generate`); la
  lÃ³gica de batches reproduce la de `data/samples/plan.ts`, que sÃ­ se ejecutÃ³ y produjo los
  `expected.json`.
- Biome y typecheck de `packages/shared` en verde; lockfile resuelto con pnpm 10.18.

## DespuÃ©s de que estÃ© en verde

1. `git add -A && git commit` (el hook de commit exige Conventional Commits).
2. Abrir los issues del tramo 1â€“4 (README Â§6 y roadmap).
3. Primer change de OpenSpec: `/opsx:propose auth-login` (tramo 1).
