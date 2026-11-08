# Tasks — business-dates-no-z

Corte: si el domingo por la noche el PR no está fusionado, el change vuelve a roadmap y el #48 sigue abierto. No hace falta base local: integración, Bruno y E2E corren en la CI de la rama `fix/business-dates-no-z`. Los archivos se escriben solo con Edit y Write.

## 1. Esquema compartido (D1, D2)

- [x] 1.1 Pruebas primero en `packages/shared` para `BusinessDateTime`:
  - acepta `"2026-10-24T13:05:00"`;
  - rechaza `"2026-10-24T13:05:00Z"`, `"2026-10-24T13:05:00.000"`, `"2026-10-24T13:05"` y `"2026-02-30T00:00:00"`.

  Verlas en rojo (el esquema no existe), y una vez con una rotura deliberada (quitar el `.regex`) para ver que la de la `Z` falla por esa razón.
- [x] 1.2 `BusinessDateTime` en `vocabulary.ts` y en los 7 campos de `imports.ts`, `validation.ts`, `settlement.ts` y `settlement-reads.ts`. Verificar `pnpm --filter @recon/shared test` y `typecheck`.

## 2. Backend (D3, D4)

- [x] 2.1 Pruebas primero:
  - `businessDateTime` devuelve los 19 primeros caracteres sin `Z`;
  - `businessTime` del CSV con `"2026-10-07T23:58:40"` da `"2026-10-07 23:58:40"` también con `process.env.TZ = 'America/New_York'`.

  Verlas en rojo.
- [x] 2.2 `businessDateTime` en `backend/src/shared/` y en los 7 sitios (`import-service.ts`, `validation-service.ts`, `prisma-validation-run-repository.ts` y su fake, `settlement-service.ts`, `prisma-settlement-reader.ts`, `prisma-settlement-queries.ts`). `businessTime` corta el texto. Ningún instante de auditoría cambia: `git diff` solo toca esos sitios.
- [x] 2.3 Actualizar las pruebas unitarias y de rutas que esperan `.000Z` en fechas de negocio. Verificar `pnpm --filter @recon/backend test` y `typecheck`.
- [x] 2.4 Actualizar las pruebas de integración que comparan fechas de negocio (en la CI). Verificar `pnpm --filter @recon/backend typecheck` en local.

## 3. Contrato

- [x] 3.1 `pnpm openapi:export` y `pnpm --filter @recon/frontend api:generate`; `pnpm openapi:check` queda limpio después del commit. Verificar que `docs/openapi.yaml` y `frontend/src/lib/api/schema.gen.ts` solo cambian en los 7 campos.

## 4. Frontend (D5)

- [x] 4.1 Pruebas primero en `format.test.ts`: con fechas sin `Z`, `formatBusinessDate` da `2026-09-28` y `formatBusinessDateTime` da `2026-09-28 00:04 ET`, también con el proceso en otra zona. Verlas en rojo.
- [x] 4.2 `formatBusinessDate` y `formatBusinessDateTime` parten el texto, sin `Date` ni `Intl`. Comentario de cabecera y tipo `BusinessDate` sin la `Z` ni el #48.
- [x] 4.3 Fixtures de fechas de negocio de MSW y de las pruebas de componentes de validations y settlements al formato nuevo. Comprobar con `grep` que ninguna fecha de negocio de `frontend/src` lleva `Z`; las de auditoría la conservan. Verificar `pnpm --filter @recon/frontend test` y `typecheck`.

## 5. Bruno (D6)

- [ ] 5.1 Aserción `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$` en una lectura de validations con `ranges` y en `20-flows/settlements/batch-clean/13 Transactions I.bru` (`eventDate`). Se verifica en la CI.

## 6. Documentación

- [ ] 6.1 README:
  - §3.2 "Fechas y zona horaria": las fechas de negocio salen sin zona;
  - §4, la línea de formatos;
  - la fila de #48 en la tabla de pendientes.

## 7. CI, rotura y PR (D7)

- [ ] 7.1 Commits por bloque (shared, backend, contrato, frontend, Bruno y docs) y `git push -u origin fix/business-dates-no-z`. Abrir el PR en borrador hacia `feature/entrega-3-MVP`. Verificar los cinco jobs en verde, `e2e` incluido: la tabla de rangos sigue cumpliendo `<día> HH:MM <zona>`.
- [ ] 7.2 Rotura deliberada del `serializerCompiler`: un commit temporal devuelve `validation-service.ts` a `toISOString()` en los rangos. Verificar en la CI que la integración de validaciones da `500` en esa ruta. Revertirlo con `git revert` y ver la CI en verde otra vez. Los dos commits se quedan en el historial.
- [ ] 7.3 En verde: `pnpm lint`, `pnpm typecheck`, `pnpm test` y `openspec validate business-dates-no-z --strict`.
- [ ] 7.4 PR listo para revisar, con la plantilla:
  - `Closes #48`;
  - **BREAKING** en "Qué cambia";
  - los runs de la rotura.

## Workflow follow-up

- `/opsx:verify business-dates-no-z` y `/review-diff` cuando lo pida la persona.
- `/opsx:archive business-dates-no-z` después del merge.
