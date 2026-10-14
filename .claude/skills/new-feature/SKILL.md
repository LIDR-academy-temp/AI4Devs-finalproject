---
name: new-feature
description: Arranca una feature de Recon Tool 2.0 de la forma acordada â€” change de OpenSpec, rama, tests primero, PR. Usar cuando K pida "empezar", "arrancar" o "implementar" una feature, historia o ticket.
---

# Nueva feature

Sigue este orden sin saltarte pasos. Si algo no estÃ¡ claro en el README, pregunta antes de
escribir cÃ³digo; no inventes reglas de negocio.

1. **Localiza la regla.** Lee en `README.md` la secciÃ³n que gobierna la feature (1.2 reglas de
   negocio, 3.2 entidad, 3.3 validaciÃ³n, 4 endpoint, 5 historia, 6 ticket) y la spec viva en
   `openspec/specs/<modulo>/spec.md`. Resume en 5 lÃ­neas quÃ© cambia y quÃ© no.
2. **Proposal.** Ejecuta `/opsx:propose <nombre-kebab>`. El proposal debe citar las secciones
   del README que implementa, listar los archivos que tocarÃ¡ y los `expected.json` de
   `data/samples/` que servirÃ¡n de orÃ¡culo. Para y espera la aprobaciÃ³n humana.
3. **Rama.** `git checkout -b feat/<modulo>-<tema>` desde `feature/entrega-2-MVP`.
4. **Tests primero.** Escribe los tests de dominio (Vitest) que fallan. EjecÃºtalos y confirma
   que fallan por la razÃ³n correcta. Solo entonces `/opsx:apply`.
5. **Implementa** en el mÃ³dulo hexagonal correspondiente: dominio puro sin Prisma; casos de uso
   con puertos; adaptadores Prisma/Fastify fuera del dominio. Dinero como string decimal en la
   API y `Decimal` en el dominio.
6. **Verifica.** `pnpm lint && pnpm typecheck && pnpm test`. Luego `/opsx:verify` y resuelve
   los warnings (corrigiendo cÃ³digo o actualizando la spec, nunca ignorÃ¡ndolos).
7. **PR.** Commit convencional, `gh pr create` hacia `feature/entrega-2-MVP` con la plantilla
   del repo. No hagas merge: lo hace K tras el review.
8. **Archiva** con `/opsx:archive` solo despuÃ©s del merge.
