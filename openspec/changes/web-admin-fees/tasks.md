# Tasks — web-admin-fees

Rama `feat/web-admin-fees`, rebasada sobre `origin/feat/admin-fees`. El PR va hacia `feature/entrega-3-MVP` después del de `admin-fees`. Solo frontend: si alguna tarea pide cambiar un esquema de `@recon/shared` o el API, se para y se avisa (es de `admin-fees`); no se duplican esquemas en el front.

## 1. Base

- [x] 1.1 `git fetch` y comprobar que `feat/web-admin-fees` está sobre `origin/feat/admin-fees` (`git merge-base --is-ancestor origin/feat/admin-fees HEAD`); si `admin-fees` subió commits nuevos, rebasar. Verificar con `pnpm typecheck`, `pnpm lint` y `pnpm --filter @recon/frontend test` en verde antes de tocar nada.

## 2. Utilidades de fechas y porcentajes (test-first)

- [x] 2.1 Ampliar `frontend/src/lib/format.test.ts` con `newYorkToday` (relojes fijos: `2026-11-04T03:30:00Z` → `2026-11-03`, `2026-11-04T05:00:00Z` → `2026-11-04`, y los dos cambios de horario) y con `percentToRate` / `rateToPercent` (`"2.75"` ⇄ `"0.027500"`, `"0"`, `"100"`, `"0.0001"`, ceros a la izquierda, rechazo de 5 decimales y de texto no numérico), y crear `features/fees/fee-display.test.ts` (valor `2.900 %` / `15.0000`, `always` / `open`, a qué aplica: `E · Successful`, `batch · preset`, `batch · free amount`). Comprobar que fallan porque las funciones no existen.
- [x] 2.2 Commit: test(web): hoy en Nueva York, porcentajes como texto y formato de los fees
- [x] 2.3 Implementar `newYorkToday`, `percentToRate` y `rateToPercent` en `lib/format.ts` (design D5, D6; sin `parseFloat` ni `Number` sobre importes) y `features/fees/fee-display.ts`. Verificar con `pnpm --filter @recon/frontend test format fee-display`.
- [x] 2.4 Commit: feat(web): hoy en Nueva York, porcentajes como texto y formato de los fees

## 3. API falsa de fees

- [x] 3.1 Escribir `frontend/src/test/msw/fees.test.ts` (design D8) y comprobar que falla: `GET /fees` valida con `FeesQuery` (`pageSize=0` → `400`), pagina sin reordenar, filtra por alcance (`viewer` no recibe merchant 2; `merchantId=2` → `404`), `kind`, `status` y `q`; `POST` exige `fee.manage` (`analyst` → `403`) y valida con `FeeCreate` (número JSON → `400`); `PATCH` comprueba el permiso antes que el alcance, aplica corrección y cambio desde una fecha (cierre + sucesor) y valida con `FeePatch`; el historial se guarda por escritura y respeta `scope`; `respondNextFee` guiona `fee_overlap` / `fee_in_use`; toda respuesta pasa el `parse` de `AccountFee`, `FeePage`, `FeeUpdateResult` y `FeeHistoryEntry`.
- [x] 3.2 Commit: test(web): API falsa de la administración de fees
- [x] 3.3 Crear `test/msw/fees.ts` con fixtures transaccionales y no transaccionales de las cuentas (en el orden del API, con fees activos, programados, cerrados, en uso y sin uso), mover allí `GET /accounts/{id}/fees` y `GET /fee-types` desde `settlements.ts` (con `transactional` filtrando de verdad) y registrarlo en `handlers.ts` y `resetDb`. Verificar con `fees.test.ts` en verde y **toda** la suite de `features/settlements` sin cambios en verde.
- [x] 3.4 Commit: feat(web): API falsa de la administración de fees

## 4. Aviso de espera del pago en el Settlement Summary (test-first)

- [x] 4.1 Añadir a `features/settlements/lifecycle-actions.test.tsx` los escenarios de la delta spec `settlement` (`processed`: la ven `analyst` y `viewer`, no `payments` ni `admin`; también en **Movements**; `paid` y `undone`: nadie). Comprobar que fallan.
- [x] 4.2 Commit: test(web): aviso de espera del pago para quien no paga
- [x] 4.3 Implementar la línea en `SummaryHeader.tsx` con su texto en `settlements/strings.ts` (design D10). Verificar con `pnpm --filter @recon/frontend test settlements`.
- [x] 4.4 Commit: feat(web): aviso de espera del pago en el Settlement Summary

## 5. Menú, rutas y acceso desde Accounts

- [x] 5.1 Actualizar los tests de navegación (`AppLayout.test.tsx`, `guards.test.tsx` y el de `nav-config`) con los escenarios de la delta spec `web-shell` (Fees enlace para `viewer`, `analyst` y `admin`; oculta sin `fee.view`; activa en `/accounts/<id>/fees` sin activar Accounts; `/fees` sin `fee.view` → `You don't have access to this page` sin llamar a `GET /fees`) y `AccountsPage.test.tsx` con el enlace **Fees** por cuenta. Comprobar que fallan.
- [x] 5.2 Commit: test(web): entrada Fees del menú y enlace desde Accounts
- [x] 5.3 Implementar (design D2): rutas `/fees` y `/accounts/$accountId/fees` en `router.tsx` con páginas mínimas, `to: '/fees'` y `activeWhen` en `nav-config.ts` / `Sidebar.tsx` (New Reconciliation sin cambios de comportamiento), y el enlace **Fees** en `ProviderAccounts.tsx` con sus textos. Verificar con los tests de 5.1 y `pnpm typecheck`.
- [x] 5.4 Commit: feat(web): entrada Fees del menú y rutas de fees

## 6. Vista global `/fees` (test-first)

- [x] 6.1 Escribir `features/fees/fees-search.test.ts` (dirección: valores inválidos descartados, `status=all`, `page` ≤ 1 fuera) y `features/fees/FeesPage.test.tsx` con los escenarios de la delta spec `fees` "Pantalla Fees": acceso y solo lectura (`viewer`, `admin`), columnas (`always`, `open`, `2.900 %`, `Scheduled`, sin cabeceras de grupo), filtros (por defecto `status=active`, `All statuses`, cascada que borra los niveles inferiores, búsqueda con espera, recarga, valor inválido, merchant fuera del alcance sin pedir `GET /fees`), paginación (**Next**, página que ya no existe con `replace`), vacío, error con **Retry** y enlace de la cuenta. Comprobar que fallan.
- [x] 6.2 Commit: test(web): vista global de fees
- [x] 6.3 Implementar `fees-search.ts`, `contract.ts` (tipos de `schema.gen.ts`), `queries.ts`, `FeeFilters.tsx`, `FeesTable.tsx` y `FeesPage.tsx` con `Pager`, `useLastPageLimit` y `ListHeading` (design D3, D9), y sus textos en `strings.ts`. Verificar con los tests de 6.1, `pnpm lint` y `pnpm typecheck`.
- [x] 6.4 Commit: feat(web): vista global de fees

## 7. Fees de una cuenta: lista, acciones según permiso e historial (test-first)

- [x] 7.1 Escribir `features/fees/AccountFeesPage.test.tsx` con los escenarios "Pantalla Account Fees: acceso y contenido" (desde Accounts, desde `/fees`, cuenta de otro merchant e inexistente con el mismo mensaje, cerrado sin **Close…**), "acciones según permiso y uso" (`analyst` sin acciones; `admin` con fee sin uso / en uso; sin retirar) e "historial" (cadena del tipo con `scope=type`, diff `before → after`, motivo, fecha `ET`, Escape devuelve el foco a **History**). Comprobar que fallan.
- [x] 7.2 Commit: test(web): fees de una cuenta e historial
- [x] 7.3 Implementar `permissions.ts`, `AccountFeesTable.tsx`, `AccountFeesPage.tsx` y `FeeHistorySheet.tsx` (con `Sheet`), con los botones de acción aún sin formulario. Verificar con los tests de 7.1.
- [x] 7.4 Commit: feat(web): fees de una cuenta e historial

## 8. Alta, corrección, cambio desde una fecha y cierre (test-first)

- [x] 8.1 Escribir `features/fees/fee-form.test.ts` (valores → `FeeCreate` / `FeeCorrection` / `FeeChange` con solo los campos cambiados, `"15"` y `"15.0000"` iguales, porcentaje a fracción, rechazo local de un porcentaje con 5 decimales y de uno fuera de 0–100, `always` / `no end date` a `null`, sin cambios → error local) y `fee-errors.test.ts` (`validation_error` con `details.field` y con lista de Fastify, `fee_overlap` con conflictos, `fee_in_use` con `fields` y con `lastAppliedEventDate`, `details` que no validan). Comprobar que fallan.
- [x] 8.2 Escribir `features/fees/fee-writes.test.tsx` con los escenarios de alta, corrección en el sitio, cambio desde una fecha, cierre (valor por defecto con el reloj fijado a las 22:30 de Nueva York, mínimo `lastAppliedEventDate`, botón deshabilitado con el motivo asociado) y errores del API (solape con su conflicto, campo de dominio, fee que pasó a estar en uso que vuelve a pedir la lista, formulario abierto con lo escrito, doble clic = una petición). Comprobar que fallan.
- [x] 8.3 Commit: test(web): alta, edición, cambio desde una fecha y cierre de fees
- [x] 8.4 Implementar `fee-form.ts`, `fee-errors.ts`, `mutations.ts` (caché e invalidaciones de design D9), `FeeFormSheet.tsx` (tres modos, design D4) y `CloseFeeDialog.tsx`, con sus textos. Verificar con los tests de 8.1 y 8.2 y con la suite de `features/settlements` en verde (comparte la caché de los fees de la cuenta).
- [x] 8.5 Commit: feat(web): alta, edición, cambio desde una fecha y cierre de fees

## 9. Documentación y revisión

- [x] 9.1 Actualizar README §1.3 (filas **Fees**: filtros con estado activo por defecto, paginación en servidor y merchant / proveedor como columnas; **Account Fees / Fee History**: se llega también desde Accounts, sin retirada ni simulate) y `docs/wireframes/README.md` con la carpeta `web-admin-fees/`. Verificar releyendo que README y delta specs dicen lo mismo.
- [x] 9.2 Pasar la skill `review-diff` sobre el diff de la rama y resolver lo que encuentre. Verificar con `pnpm lint`, `pnpm typecheck` y `pnpm test` en verde.
- [x] 9.3 Commit: docs(web): pantallas de fees en el mapa de pantallas

## 10. Capturas contra el backend real

Requiere que `admin-fees` haya terminado sus grupos 4 y 5 (rutas sin `501`).

- [x] 10.1 `git fetch` y rebasar sobre `origin/feat/admin-fees`; `pnpm typecheck` y `pnpm test` en verde. Si cambió algún esquema, ajustar el front y el fake en el mismo commit.
- [x] 10.2 Con la base local, ejecutado por la persona con `! pnpm db:seed` dentro de la sesión, y `pnpm dev` levantado: escribir `e2e/screenshots/web-admin-fees.ts` (design D11) y generar las capturas en `docs/wireframes/web-admin-fees/`. Verificar abriéndolas: vista global a 1280 y 1024, cuenta como `admin` y como `analyst`, `409 fee_overlap`, **Close…** con el mínimo e historial.
- [x] 10.3 Commit: docs(web): capturas de las pantallas de fees
- [x] 10.4 Lo que encontraron las medidas a 1024 px, arreglado antes de versionar: las celdas de shadcn no parten el texto, así que las dos tablas se salían de su tarjeta. En la de la cuenta parten el tipo y las acciones; en la vista global el merchant y el proveedor pasan bajo la cuenta (decidido con la persona) y solo se parte el tipo. El seed no deja ningún fee en uso (su historial no referencia fees), por eso el script procesa `batch-clean` primero.

## Workflow follow-up

- `/opsx:verify web-admin-fees`.
- Cuando `admin-fees` se mergee: `git rebase --onto feature/entrega-3-MVP origin/feat/admin-fees` y PR con la plantilla hacia `feature/entrega-3-MVP`.
- `/opsx:archive web-admin-fees` tras el merge.
