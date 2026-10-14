# Tramo 0 — qué hay en este paquete y cómo ponerlo en verde

Contenido del paquete (se copia encima del repositorio, en `C:\Projects\recon-tool-2`, rama
`feature/entrega-2-MVP`; no toca `README.md`):

| Ruta | Qué es |
|---|---|
| `backend/prisma/schema.prisma` | Modelo de datos completo (38 tablas) derivado del README §3.2 |
| `backend/prisma/migrations/0001_init/` | DDL base en el formato de Prisma para SQL Server |
| `backend/prisma/migrations/0002_constraints/` | CHECK de dominios, índices únicos filtrados y trigger de no solapamiento de fees |
| `backend/prisma/synthetic.ts` | Mundo sintético determinista (catálogos, cuentas, ~24 k transacciones, 68 batches pagados) |
| `backend/prisma/seed.ts` | Seed idempotente (vacía y recarga) |
| `backend/prisma.config.ts`, `backend/package.json`, `backend/tsconfig.json` | Configuración de Prisma 7 con `@prisma/adapter-mssql` |
| `data/samples/` | Cinco conjuntos de muestra (`.xlsx` + `expected.json`) y los scripts que los regeneran |
| `infra/docker-compose.yml`, `infra/mssql/` | SQL Server 2022 con `recon_app` (mínimos) y `recon_reader` (solo lectura) |
| `.env.example` | Variables; copiar a `.env` y cambiar contraseñas |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.node-version`, `biome.json`, `.husky/`, `.editorconfig`, `.gitattributes`, `.gitignore` | Monorepo, linter, hooks de git |
| `CLAUDE.md` / `AGENTS.md`, `.claude/settings.json`, `.claude/hooks/`, `.claude/skills/` | Instrucciones del agente, permisos, 3 hooks, 3 skills |
| `openspec/project.md`, `openspec/specs/*/spec.md` | Seis specs base (import, matching, validation, settlement, fees, accounts) |
| `.github/workflows/ci.yml`, `.github/dependabot.yml`, `.github/pull_request_template.md` | CI (lint, typecheck, tests, migración + seed contra SQL Server, gitleaks), Dependabot, plantilla de PR |
| `packages/shared/` | Vocabulario fijo como esquemas Zod |

## Pasos (PowerShell, dentro del repo)

```powershell
copy .env.example .env          # y edita las contraseñas
pnpm install
pnpm db:up                      # SQL Server; espera ~30 s. pnpm db:logs para ver "ready for client connections"
pnpm db:generate                # cliente Prisma
pnpm db:migrate                 # aplica 0001_init y 0002_constraints
pnpm db:seed                    # ~1-2 min; termina con "[seed] listo en N s"
pnpm lint; pnpm typecheck; pnpm test
```

Comprobación en SSMS (`localhost,1433`, usuario `recon_app`):

```sql
SELECT COUNT(*) FROM dbo.[Transaction];            -- ≈ 23 700
SELECT name, batchNo FROM dbo.Account a JOIN dbo.SettlementBatch b ON b.accountId = a.accountId WHERE b.status = 'paid' ORDER BY 1, 2;
SELECT * FROM dbo.MatchingSheetRule WHERE ruleSetId IS NULL ORDER BY priority;
```

Primer commit: `chore: bootstrap tramo 0 (prisma schema, seed, samples, infra, tooling)`.

## Qué se validó y qué no

- `schema.prisma` validado con el motor de Prisma (sin errores); el DDL de `0001_init` se generó
  a partir del DMMF con la convención de nombres de Prisma para SQL Server.
- `0002_constraints` está escrito y revisado a mano; **no se ha ejecutado contra un SQL Server**
  (el entorno donde se preparó el paquete no tiene Docker). La primera ejecución real es la tuya:
  si `pnpm db:migrate` falla, pega el error completo y se corrige en minutos.
- `seed.ts` compila salvo por el cliente generado (que aparece con `pnpm db:generate`); la
  lógica de batches reproduce la de `data/samples/plan.ts`, que sí se ejecutó y produjo los
  `expected.json`.
- Biome y typecheck de `packages/shared` en verde; lockfile resuelto con pnpm 10.18.

## Después de que esté en verde

1. `git add -A && git commit` (el hook de commit exige Conventional Commits).
2. Abrir los issues del tramo 1–4 (README §6 y roadmap).
3. Primer change de OpenSpec: `/opsx:proposal auth-login` (tramo 1).
