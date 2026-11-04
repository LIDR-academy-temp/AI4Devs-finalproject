# Tasks — web-admin-accounts

Rama `feat/web-admin-accounts`, avanzada por fast-forward hasta `origin/feat/admin-accounts` (63a88ae). El PR va hacia `feature/entrega-3-MVP` después del de `admin-accounts`. Solo frontend: si una tarea pide cambiar un esquema de `@recon/shared` o el API, se para y se avisa (eso es de `admin-accounts`); no se duplican esquemas en el front. Integración con `admin-accounts`: cuando suba cambios en `@recon/shared` u OpenAPI (su grupo 4 quita el `501` de `matching-rule-sets`), `git rebase origin/feat/admin-accounts`, y el force push lo hace la persona con `--force-with-lease=feat/web-admin-accounts:<hash del remoto>`, que se le pasa ya escrito.

## 1. Base

- [x] 1.1 Ejecutar `git fetch` y comprobar con `git merge-base --is-ancestor origin/feat/admin-accounts HEAD` que la rama contiene `origin/feat/admin-accounts`. Si `admin-accounts` subió commits nuevos, integrarlos como dice la cabecera. Verificar con `pnpm typecheck`, `pnpm lint` y `pnpm --filter @recon/frontend test` en verde antes de tocar nada.

## 2. Account Detail como contenedor y pestaña Fees extraída (refactor protegido por los tests de fees)

- [x] 2.1 Actualizar la suite de fees y el menú a las delta specs `fees` y `web-shell`, y comprobar que fallan:
  - En `AccountFeesPage.test.tsx` (renombrado a `AccountFeesPanel.test.tsx`) y `fee-writes.test.tsx`, el `h1` pasa a ser el nombre de la cuenta, con la pestaña **Fees** seleccionada (`role="tab"`, `aria-selected`).
  - Escenarios "Ver todas las cuentas" y "Add fee en la pestaña".
  - En `AppLayout.test.tsx` y en el test de `nav-config`: Accounts activa en `/accounts/<id>` y en `/accounts/<id>/fees`, Fees no; Channel Assignment como enlace para `viewer`, `analyst` y `admin`; Channel Assignment activa en `/channel-assignment?merchantId=1`.
- [x] 2.2 Commit: test(web): los fees de la cuenta como pestaña de su ficha y Accounts activa en la ficha
- [x] 2.3 Extraer `features/fees/AccountFeesPanel.tsx` de `AccountFeesPage.tsx` (design D3) y borrar la página.
  - Crear en `features/accounts` un `AccountDetailPage.tsx` mínimo: `h1`, jerarquía, pestañas como enlaces y `Outlet`, con el `404` como `This account is not available.`
  - Crear las rutas padre e hijas de design D2 (Overview vacía de momento) y la ruta `/channel-assignment` con una página mínima.
  - En `nav-config.ts`: `activeWhen` de Accounts, Fees sin `activeWhen`, Channel Assignment con `to`.
  - Ajustar `e2e/screenshots/web-admin-fees.ts` al nuevo `h1`.
  - Verificar con los tests de 2.1, **toda** la suite de `features/fees` y `features/settlements` en verde, `pnpm typecheck` y `pnpm lint`.
- [x] 2.4 Commit: refactor(web): la página de fees de una cuenta pasa a ser una pestaña de Account Detail

## 3. Utilidades puras (test-first)

- [x] 3.1 Escribir los tests de las utilidades puras y comprobar que fallan porque no existen:
  - `lib/format.test.ts` con `canonicalDecimal` (`"50000"` = `"50000.0000"`, `"015.10"` → `"15.1"`, `"0"`, negativos).
  - `features/accounts/channel-display.test.ts`:
    - `termReserve` → `14 d · 10 % / 180 d` y `7 d · 0 % / 0 d`, sin `Number`;
    - `roleOf` → `primary`, `historical · primary in ProviderA-USD`, `historical · no primary`;
    - `batchLabel` → `batch 68` y `—`.
  - `features/accounts/account-form.test.ts` (design D5):
    - `createBody` completo con `null` por defecto y el tope como string;
    - `patchBody` solo con los cambios: escala del tope, cambio solo de mayúsculas, desenlazar a `null`, quitar el tope a `null`, motivo solo si hay cambios, sin cambios → `Nothing to save.`;
    - rechazo local de nombre vacío o de 51 caracteres, de tope `-1`, `1.23456` y `abc`, y de motivo de 501 caracteres.
  - `features/accounts/account-errors.test.ts` (design D6): `account_name_taken` en `name`; `details.field` en cada uno de los tres campos; `400` con lista de Fastify; `403`, `404`, red.
- [x] 3.2 Commit: test(web): formato de canales, cuerpos y errores de los formularios de cuenta
- [x] 3.3 Implementar las utilidades puras:
  - Mover `canonical` de `fee-form.ts` a `lib/format.ts` como `canonicalDecimal` y hacer que `fee-form.ts` la importe.
  - Implementar `channel-display.ts`, `account-form.ts` y `account-errors.ts`, con los textos en `features/accounts/strings.ts`.
  - Rotura deliberada: hacer que `patchBody` compare el tope sin `canonicalDecimal` debe hacer fallar el caso de la escala; después se revierte.
  - Verificar con `pnpm --filter @recon/frontend test format channel-display account-form account-errors fee-form`.
- [x] 3.4 Commit: feat(web): formato de canales, cuerpos y errores de los formularios de cuenta

## 4. API falsa de cuentas

- [x] 4.1 Escribir `test/msw/accounts.test.ts` (design D9) y comprobar que falla. Debe cubrir:
  - `POST /providers/{id}/accounts`: `analyst` → `403`; `viewer` en el proveedor 201 → `403` (el permiso va antes que el alcance); `admin` en el proveedor 999 → `404`; tope numérico o campo desconocido → `400` (`AccountCreate`); `201` con un `AccountDetail` que pasa su `parse` y aparece después en `GET /providers/{id}` y `GET /accounts/{id}`.
  - `PATCH /accounts/{id}`: los mismos `403` y `404`; `{}` y `{ providerId }` → `400` (`AccountPatch`); `200` con los campos aplicados y `updatedAt` posterior.
  - `GET /providers/{id}/matching-rule-sets`: Provider C con "Provider C legacy" (y ProviderC-Alt en `accounts`) y el conjunto inactivo; Provider A, lista vacía; `viewer` en el 201 → `404`. Cada respuesta pasa `MatchingRuleSetSummary`.
  - El fake no responde `409 account_name_taken` por sí mismo ante un nombre repetido.
- [x] 4.2 Commit: test(web): API falsa de la administración de cuentas
- [x] 4.3 Implementar `test/msw/accounts.ts` con los fixtures `RULE_SETS` y registrarlo en `handlers.ts` y `resetDb`. Verificar con `accounts.test.ts` y toda la suite del frontend en verde.
- [x] 4.4 Commit: feat(web): API falsa de la administración de cuentas

## 5. Account Detail: cabecera, Overview y canales (test-first)

- [x] 5.1 Escribir `features/accounts/AccountDetailPage.test.tsx` con los escenarios de la delta `accounts` y comprobar que fallan:
  - "acceso y cabecera": ProviderA-USD; otro merchant, uuid inexistente y `not-a-uuid`; migas.
  - "acciones de la cabecera": `admin`, `analyst` con el enlace de New reconciliation, `viewer`, cuenta cerrada.
  - "pestañas": cambiar de pestaña y enlace directo.
  - "Overview": tope `50,000.0000`, `None · global rules`, `by admin`, ProviderC-Alt con `Provider C legacy`.
  - "canales": principales, histórico, `—` sin batch, cuenta sin canales.
  - "carga y errores": reintento de los canales; conjunto no disponible → `Rule set 3`.
- [x] 5.2 Commit: test(web): ficha de la cuenta con sus datos y sus canales
- [x] 5.3 Implementar lo necesario hasta dejar en verde los tests de 5.1 (design D4):
  - la cabecera completa de `AccountDetailPage`, `AccountOverview.tsx` y `AccountChannels.tsx`;
  - `matchingRuleSetsQuery` en `queries.ts`, `useCanManageAccounts` en `permissions.ts` y `ACCOUNT_STATUS_TONE` en `lib/status-tone.ts`;
  - en `ProviderAccounts.tsx`, el nombre como enlace a la ficha.
  - Verificar con los tests de 5.1, `AccountsPage.test.tsx` ampliado con el escenario "Enlace a la ficha", `pnpm typecheck` y `pnpm lint`.
- [x] 5.4 Commit: feat(web): ficha de la cuenta con sus datos y sus canales

## 6. Crear, editar, cerrar y reabrir (test-first)

- [x] 6.1 Escribir `features/accounts/account-writes.test.tsx` con los escenarios de la delta `accounts` y comprobar que fallan:
  - "New account: formulario": sin `account.manage`, cuenta mínima con el cuerpo exacto y la navegación a la ficha, tope como texto, validación local con el foco en el primer error, cancelar con el foco de vuelta, doble clic = una petición.
  - "fees y reglas de pareo": copia y conjunto en Provider C, Provider A sin conjuntos, cambio de proveedor que vacía los campos.
  - "Edit account": política y tope, misma escala → `Nothing to save.`, desenlazar, quitar el tope, renombrar con motivo, conjunto actual inactivo que se conserva.
  - "Close / Reopen": cerrar con motivo, reabrir sin motivo, cancelar, diálogo abierto con la petición en curso.
  - "errores del API": nombre en uso, conjunto no válido, cuenta origen no válida, `403` y red con lo escrito intacto.
  - "Pantalla Accounts": **New account** solo para `admin`.
- [x] 6.2 Commit: test(web): crear, editar, cerrar y reabrir cuentas
- [x] 6.3 Implementar lo necesario hasta dejar en verde los tests de 6.1 (design D5–D7):
  - añadir `components/ui/dialog.tsx` (shadcn, sobre `radix-ui`, sin dependencias nuevas);
  - `contract.ts` y `mutations.ts` (caché e invalidaciones de D7);
  - `NewAccountDialog.tsx`, `EditAccountSheet.tsx` y `AccountStatusDialog.tsx`;
  - el botón **New account** en `AccountsPage.tsx`;
  - sus textos, incluido `Name must be unique`.
  - Verificar con los tests de 6.1 y con toda la suite del frontend en verde.
- [x] 6.4 Commit: feat(web): crear, editar, cerrar y reabrir cuentas

## 7. Channel Assignment (test-first)

- [x] 7.1 Escribir `features/accounts/channel-assignment-search.test.ts` (ids inválidos descartados; elegir merchant borra el proveedor) y `features/accounts/ChannelAssignmentPage.test.tsx` con los escenarios de la delta `accounts`, y comprobar que fallan:
  - "acceso y filtros": `viewer` sin filtros y sin acciones; filtro por Provider B en la dirección; proveedor fuera del alcance.
  - "canales sin asignar": los dos del seed, Provider C sin ninguno.
  - "cuenta principal por canal": principales de Provider A con `batch <n>` y sin RAM-07, canal con histórica, enlace a la ficha.
  - "carga y errores": reintento.
- [x] 7.2 Commit: test(web): Channel Assignment de solo lectura
- [x] 7.3 Implementar `channel-assignment-search.ts`, `channelsQuery` y `channelAccountsQuery` en `queries.ts` y `ChannelAssignmentPage.tsx` (design D8), con sus textos. Verificar con los tests de 7.1, `pnpm typecheck` y `pnpm lint`.
- [x] 7.4 Commit: feat(web): Channel Assignment de solo lectura

## 8. Cuenta cerrada al subir (test-first)

- [ ] 8.1 Añadir a `features/imports/files/upload.test.tsx` el escenario "Cuenta cerrada entre la elección y la subida" de la delta `import`, con `409 account_inactive` guionado en el fake: motivo `This account is closed. Choose another account.`, ningún import y la pantalla sigue en New Reconciliation. Comprobar que falla.
- [ ] 8.2 Commit: test(web): subida a una cuenta cerrada
- [ ] 8.3 Añadir el caso `account_inactive` a `rejectionText` y su texto en `imports/strings.ts` (design D10). Verificar con `pnpm --filter @recon/frontend test imports`.
- [ ] 8.4 Commit: feat(web): motivo de la subida a una cuenta cerrada

## 9. Documentación y revisión

- [ ] 9.1 Actualizar la documentación y verificar releyendo que README y delta specs dicen lo mismo:
  - README §1.3: fila **Accounts / Account Detail** (pestañas Overview y Fees, nombre único en todo el sistema, cerrar y reabrir, sin pestaña de reglas de pareo ni actividad); fila **Channel Assignment** (solo lectura, filtros, "since" e históricas); fila **Account Fees** (pestaña de Account Detail). Mencionar la carpeta `docs/wireframes/web-admin-accounts/`.
  - `docs/wireframes/README.md`: la carpeta nueva.
- [ ] 9.2 Verificar con `pnpm lint`, `pnpm typecheck` y `pnpm test` en verde.
- [ ] 9.3 Commit: docs(web): pantallas de cuentas y canales en el mapa de pantallas

## 10. Capturas contra el backend real

Requiere que `admin-accounts` haya terminado su grupo 4 (`GET /providers/{id}/matching-rule-sets` y `409 account_inactive` sin `501`) y turno de base.

- [ ] 10.1 `git fetch` e integrar `origin/feat/admin-accounts` como dice la cabecera (rebase y force push de la persona). Verificar con `pnpm typecheck` y `pnpm test` en verde. Si cambió algún esquema, ajustar el front y el fake en el mismo commit.
- [ ] 10.2 Generar las capturas en `docs/wireframes/web-admin-accounts/`, con la base local sembrada por la persona (`! pnpm db:seed` dentro de la sesión) y `pnpm dev` levantado:
  - Escribir `e2e/screenshots/web-admin-accounts.ts` y el script `screenshots:web-admin-accounts` (design D11).
  - Las cuentas que se crean usan el prefijo `bruno-` y quedan cerradas.
  - Verificar abriéndolas: cada captura de D11 a 1280 y a 1024 px, sin tablas que se salgan de su tarjeta ni elementos solapados.
- [ ] 10.3 Commit: docs(web): capturas de las pantallas de cuentas y canales

## 11. Revisión

- [ ] 11.1 `review-diff` en una sesión nueva (la pide la persona), antes del PR. Lo que encuentre se arregla con su test y su commit en esta rama.

## Workflow follow-up

- `/opsx:verify web-admin-accounts`.
- PR hacia `feature/entrega-3-MVP` con la plantilla, después del de `admin-accounts`, y CI en verde (vigilado con `gh … --jq`).
- `/opsx:archive web-admin-accounts` tras el merge.
