# Recon Tool 2.0 â€” instrucciones para el agente

AplicaciÃ³n web de reconciliaciÃ³n de settlements de proveedores de pago (reemplaza una
herramienta interna sobre SSRS). Proyecto final del mÃ¡ster AI4Devs. La **fuente de verdad del
producto es `README.md`** (reglas de negocio 1.2, modelo de datos 3, validaciones 3.3, API 4,
historias 5). Si el cÃ³digo y el README discrepan, el README manda y el cambio se discute antes
de programar.

## Stack y estructura

- Monorepo pnpm: `backend/` (Node 22, TypeScript, Fastify 5, Zod 4, Prisma 7 + `@prisma/adapter-mssql`),
  `frontend/` (React 19, Vite, Tailwind, shadcn/ui, TanStack Query/Table, React Hook Form),
  `packages/shared` (tipos y esquemas Zod compartidos), `e2e/` (Playwright + playwright-bdd),
  `data/samples/` (archivos de prueba + `expected.json`), `infra/` (Docker Compose, SQL Server 2022), `openspec/` (specs), `docs/` (ADR, diagramas, OpenAPI).
- Backend hexagonal por mÃ³dulo: `src/modules/<modulo>/{domain,application,infrastructure,http}`.
  MÃ³dulos del MVP: `catalog`, `accounts`, `fees`, `matching`, `imports`, `validation`, `settlement`, `auth`, `audit`.
- Base de datos: SQL Server 2022, usuario `recon_app` (nunca `sa`). Importes `DECIMAL(19,4)`, porcentajes `DECIMAL(9,6)`; **nunca `MONEY`, `FLOAT` ni `number` de JS para dinero**: en la API el dinero viaja como string decimal y en el dominio se usa `Decimal` de Prisma o `decimal.js`.
- Linter y formato: Biome (no Prettier ni ESLint). Commits: Conventional Commits.
- **Idiomas.** DocumentaciÃ³n (`README.md`, `prompts.md`, `docs/`, specs de OpenSpec, `CLAUDE.md`, skills, plantilla de PR) y **mensajes de commit en espaÃ±ol**. Todo lo que es cÃ³digo o configuraciÃ³n en **inglÃ©s**: identificadores, comentarios, docstrings, mensajes que emiten scripts y hooks, comentarios de SQL/YAML/JSON/shell/.env, textos de la interfaz de usuario y datos sembrados. Un comentario en espaÃ±ol dentro de un `.ts` es un hallazgo de revisiÃ³n.

## Vocabulario fijo (Ãºsalo tal cual en cÃ³digo, specs y UI)

- `cycle` âˆˆ `E` (transacciÃ³n) Â· `I` (ajuste) Â· `R` (reserva). **El ciclo lo fija la hoja o la regla de pareo, no el estado.** R no tiene estado: la rolling reserve es una etapa, no un estado.
- Estados del gateway: `Pending`, `Successful`, `Declined`, `Chargeback`, `Refund`, `RDR`. `CHB 2` es solo un alias legacy de `Chargeback` con `excludeAmount`.
- JerarquÃ­a: Gateway â†’ Merchant â†’ Provider â†’ Channel (solo lectura) y Account (lo Ãºnico que la app posee). `AccountChannel.isPrimary` = Ãºltima cuenta que procesÃ³ un settlement con ese canal.
- ImportaciÃ³n: `Import` â†’ `ImportFile` â†’ `ImportSheet` (`kind` âˆˆ transactions | batch_fees | ignore) â†’ `ImportRow` (`matchResult` âˆˆ matched | unmatched | ambiguous | ignored).
- Validaciones (8, en este orden): `provider_mismatch` (la **Ãºnica bloqueante**), `non_recorded_adjustment`, `duplicate_in_batch`, `status_collision_in_batch`, `duplicate_across_batches`, `status_collision_across_batches`, `missing_previous_to_batch`, `missing_in_range`. Clave de duplicado/colisiÃ³n: `(transactionId, cycle)`.
- Settlement: `SettlementBatch` (intento; `status` processed â†’ paid; undone), `SettlementTransaction` (un movimiento por ciclo). **Settled solo cuando el batch estÃ¡ `paid`.**
- Fees: `Fee.startDate NULL` = desde siempre, `endDate NULL` = sin fin; no se borran, se cierran. Fees no transaccionales de la hoja `Other Fees` llegan **prellenados** al Settlement Review.
- Plantilla de entrada: hojas `APP/DEC/CHB/REF/RDR/RR` con `ID, Amount, Currency`; solo `ID` es obligatorio; importes siempre positivos; IDs se leen y exportan como texto; uno o varios archivos por batch.

## CÃ³mo trabajamos

1. **Una feature = un change de OpenSpec** (`/opsx:propose` â†’ revisiÃ³n humana â†’ `/opsx:apply` â†’ `/opsx:verify` â†’ `/opsx:archive`). Sin proposal aprobado no se escribe cÃ³digo de feature.
2. **TDD en el dominio**: validaciones, motor de pareo, cÃ¡lculo de fees y summary se escriben test-first con Vitest, usando `data/samples/*/expected.json` como orÃ¡culo. Rompe el test a propÃ³sito una vez para comprobar que falla.
3. **Rama por feature** (`feat/<modulo>-<tema>`), PR hacia `feature/entrega-2-MVP` con la plantilla; CI verde obligatorio.
4. **SesiÃ³n nueva por paso** (explorar â†’ planificar â†’ ejecutar). Antes de tocar el esquema o una migraciÃ³n, para y pide confirmaciÃ³n.
5. **Nunca**: datos reales o identificadores reales (todo es sintÃ©tico), `prisma migrate reset` o `deploy` contra una base que no sea la local, secretos en el repo, `console.log` en cÃ³digo de producciÃ³n (usa el logger de Fastify), `any` sin justificaciÃ³n en el PR.

## Comandos

- `pnpm db:up` Â· `pnpm db:migrate` Â· `pnpm db:seed` (idempotente; recrea todo el mundo sintÃ©tico)
- `pnpm dev` Â· `pnpm lint` Â· `pnpm typecheck` Â· `pnpm test`
- `pnpm samples:plan && python data/samples/build-samples.py` regenera los archivos de muestra

## DÃ³nde mirar

- Reglas de negocio y decisiones: `README.md` Â§1.2, Â§3.3; ADR en `docs/adr/`.
- Contrato de la plantilla: `data/samples/README.md` y README Â§1.2 "Plantilla estandarizada".
- ParÃ¡metros del dataset sintÃ©tico: `backend/prisma/synthetic.ts` (comentario de cabecera).
- Specs vivas: `openspec/specs/<modulo>/spec.md`.
