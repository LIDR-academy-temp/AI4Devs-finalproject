# Wireframes — prototipo navegable de Recon Tool 2.0

Exportación del prototipo de 29 pantallas que se revisó y aprobó con la empresa antes de la Entrega 2 (README §1.3, doc 03 «Mapa del sitio y navegación»). Sirve de referencia para implementar las pantallas del frontend; **no es código del producto**.

## Qué es y qué no es

- **Baja fidelidad a propósito**: grises, sin marca. Lo que vale es qué hay en cada pantalla, qué decisión cierra cada paso y a dónde lleva cada botón. El aspecto final lo dan shadcn/ui y Tailwind (`CLAUDE.md`).
- **Convención de color** que sí conviene conservar: azul = acción que avanza o confirma; borde rojo = bloqueo; ámbar = advertencia que no bloquea. Las acciones irreversibles (Cancel, Undo, Unpay) piden motivo.
- **Los datos del prototipo son ilustrativos** (`ProviderC-EUR`, `ProviderA-MerchantB`, batch 119, importes). Los datos reales de desarrollo y test son los del seed (`backend/prisma/synthetic.ts`); si el prototipo y el README discrepan en una regla, manda el README.
- **La barra lateral muestra el producto completo.** En cada tramo solo se implementan las entradas que existen; el menú se filtra además por los permisos del rol.

## Archivos

- `png/`: una captura por pantalla (1280 px de ancho). Es lo más rápido de mirar y lo que conviene darle al agente como referencia visual.
- `prototype/*.dc.html`: el HTML fuente de cada pantalla, con sus textos, tablas y enlaces exactos. Se abre directamente en el navegador (los enlaces entre pantallas funcionan; `support.js` no existe fuera del editor y se puede ignorar). Útil para copiar textos y estructura.
- `prototype/canvas.json`: el índice del lienzo original (orden, títulos y notas de grupo).

## Pantallas, en el orden del flujo

| Pantalla | Fuente | Captura |
|---|---|---|
| Login | `prototype/Main.dc.html` | `png/Login.png` |
| Dashboard | `prototype/Dashboard.dc.html` | `png/Dashboard.png` |
| New Reconciliation | `prototype/NewReconciliation.dc.html` | `png/NewReconciliation.png` |
| Upload Files | `prototype/UploadFiles.dc.html` | `png/UploadFiles.png` |
| Column Mapping | `prototype/ColumnMapping.dc.html` | `png/ColumnMapping.png` |
| Analysis & Validations | `prototype/Analysis.dc.html` | `png/Analysis.png` |
| Issue Detail (drawer) | `prototype/AnalysisIssue.dc.html` | `png/AnalysisIssue.png` |
| Settlement Review | `prototype/SettlementReview.dc.html` | `png/SettlementReview.png` |
| Settlement Summary | `prototype/SettlementSummary.dc.html` | `png/SettlementSummary.png` |
| In Progress | `prototype/InProgress.dc.html` | `png/InProgress.png` |
| Settlement List | `prototype/SettlementList.dc.html` | `png/SettlementList.png` |
| Settlement Detail | `prototype/SettlementDetail.dc.html` | `png/SettlementDetail.png` |
| Payments | `prototype/Payments.dc.html` | `png/Payments.png` |
| Transaction Search | `prototype/TransactionSearch.dc.html` | `png/TransactionSearch.png` |
| Transaction Detail | `prototype/TransactionDetail.dc.html` | `png/TransactionDetail.png` |
| Missing & Duplicates | `prototype/MissingDuplicates.dc.html` | `png/MissingDuplicates.png` |
| Unsettled per Channel | `prototype/UnsettledPerChannel.dc.html` | `png/UnsettledPerChannel.png` |
| Reports · roadmap | `prototype/ReportsRoadmap.dc.html` | `png/ReportsRoadmap.png` |
| Merchants & Providers | `prototype/MerchantsProviders.dc.html` | `png/MerchantsProviders.png` |
| Accounts | `prototype/Accounts.dc.html` | `png/Accounts.png` |
| New Account (dialog) | `prototype/AccountNew.dc.html` | `png/AccountNew.png` |
| Account Detail | `prototype/AccountDetail.dc.html` | `png/AccountDetail.png` |
| Fees · all accounts | `prototype/FeesAll.dc.html` | `png/FeesAll.png` |
| Fees · Fee History | `prototype/Fees.dc.html` | `png/Fees.png` |
| Matching Rules | `prototype/MatchingRules.dc.html` | `png/MatchingRules.png` |
| Channel Assignment | `prototype/ChannelAssignment.dc.html` | `png/ChannelAssignment.png` |
| Users & Roles | `prototype/UsersRoles.dc.html` | `png/UsersRoles.png` |
| Audit Log | `prototype/AuditLog.dc.html` | `png/AuditLog.png` |
| Interpretation Rules · roadmap | `prototype/InterpretationRules.dc.html` | `png/InterpretationRules.png` |

## Qué pantallas usa cada tramo de la Entrega 2

| Tramo / issue | Pantallas |
|---|---|
| T1 · #3 (frontend Login y Accounts) | Login, Dashboard (armazón), Accounts |
| T2 · #6 (pantallas Upload y Column Mapping) | New Reconciliation, Upload Files, Column Mapping, In Progress |
| T3 · #10 (pantalla Analysis & Validations) | Analysis & Validations, Issue Detail (drawer) |
| T4 · #13 (pantallas Settlement Review y Summary) | Settlement Review, Settlement Summary |

El resto es de la Entrega 3 o roadmap: Merchants & Providers y Account Detail (tramo 5, junto con la gestión de cuentas), pagos, búsquedas, informes, administración de fees, reglas, usuarios y auditoría.

## Desvíos del prototipo

- **Fees** (`web-admin-fees`, #80): la vista global no agrupa por merchant › proveedor con filas de cabecera, porque la paginación en servidor las cortaría; el merchant y el proveedor van bajo la cuenta, en la misma celda de cada fila (así la tabla cabe a 1024 px). Sin **Export CSV** ni simulación (roadmap). La página de fees de una cuenta lleva el alta y la edición en un panel lateral, no en una columna fija, y el historial en otro panel; no hay acción de retirar un fee programado (#109).
- **Cuentas y canales** (`web-admin-accounts`, #80): Accounts conserva la elección merchant › proveedor (el API no tiene una lista global con filtros y búsqueda) y no muestra fees activos ni último batch por cuenta. El diálogo New account dice que el nombre es único en todo el sistema, no por proveedor. Account Detail tiene dos pestañas, **Overview** y **Fees** (la página de fees de la cuenta es esa pestaña, y en el menú se marca Accounts); no hay pestañas de reglas de pareo (`admin-matching`), settlements (un enlace en la cabecera) ni actividad, ni la tarjeta de resumen de fees ni el último batch o import abierto. Editar va en un panel lateral. Channel Assignment no tiene filtro de canal ni recuentos de transacciones o primera vista.
- **Pagar, retirar el pago y deshacer** (`settlement-lifecycle`, #78, #79): las acciones van en la cabecera de la pantalla del intento (`/settlements/$batchId`, común a Settlement Summary y a sus pestañas), no en una pantalla **Payments**. Esa pantalla y `GET /providers/{id}/pending-payments` siguen fuera de alcance: `payments` llega al intento por Settlement List filtrando `processed`. Quien no tiene el permiso de una acción no la ve.

## Capturas de la implementación

`impl/`: capturas de las pantallas ya construidas, a 1280 px, con datos del seed. T1 · #3: `impl/Login.jpg` y `impl/Accounts.jpg` (`viewer`, Provider A, con el aviso de RAM-07). T3 · #6 y #7: `impl/UploadFiles.jpg` (`batch-split` con sus dos archivos), `impl/ColumnMapping.jpg` (`batch-clean` recién subido, con las hojas compactas y la readiness por archivo) y `impl/Analysis.jpg` (`batch-clean` analizado, con el aviso de RAM-07); `analyst`, ProviderA-USD.

`web-validations/`: T3 · #10, pantalla Analysis & Validations contra el API real, `analyst`, ProviderB-Main, generadas con `pnpm screenshots:web-validations`. `batch-issues-validations.png` (las ocho validaciones de `batch-issues`), `batch-issues-duplicate-drawer.png` y `batch-issues-duplicate-drawer-1024.png` (drawer del duplicado con la segunda aparición incluida y su historial, a 1280 y 1024 px), `batch-issues-missing-drawer.png` (drawer de un faltante `Missing in range` con `Batch range (E/APP)` y por qué es faltante), `batch-issues-invalidated-review.png` (aviso de revisión invalidada tras continuar y re-ejecutar) y `batch-blocked-continue-disabled.png` (Continue deshabilitado con el motivo de `provider_mismatch`).

`web-settlement/`: T4 · #13, pantallas Settlement Review y Settlement Summary contra el API real de #11, `analyst`, ProviderA-USD, `batch-clean`, generadas con `pnpm screenshots:web-settlement`. `settlement-review.png` (número propuesto 123, fecha, los dos fees de `Other Fees`, `Chargeback over 1%` solo porcentaje con su importe escrito a mano, resumen previo con las nueve líneas y RAM-07 por asociar), `settlement-review-batch-taken.png` (el 122 sembrado, con su intento activo en el campo y Process deshabilitado con su motivo), `settlement-review-1024.png` (a 1024 px; el resumen previo va debajo del formulario hasta 1536 px) y `settlement-summary.png` (el intento recién procesado: estado, totales, desglose del amount payable, fees con su usuario, RAM-07 asociado y descargas deshabilitadas hasta #12). Sin desplazamiento horizontal ni tablas recortadas a 1280 y 1024 px.

`settlements-browse/`: #64, Settlement List y la pestaña Movements del Settlement Summary contra el API real, `analyst`, ProviderA-USD, con `batch-clean` ya procesado como batch 123, generadas con `pnpm screenshots:settlements-browse` (solo lee). `settlement-list.png` y `settlement-list-1024.png` (el 123 `Processed · pending payment` primero y los 22 pagados del seed en dos páginas, con quién y cuándo, los canales partidos solo tras una coma y el amount payable entero), `settlement-movements-e.png` (ciclo E con los contadores de la vista, la fila de origen de cada movimiento y la columna **Reserves**) y `settlement-movements-i.png` y `settlement-movements-i-1024.png` (los diez ajustes con su ronda y el desglose de un fee abierto, a 1280 y 1024 px). Sin desplazamiento horizontal ni tablas recortadas a 1280 y 1024 px: el script termina con error si alguna medición lo encuentra.

`web-admin-fees/`: #80, la vista global de fees y la página de fees de una cuenta contra el API real de `admin-fees`, ProviderA-USD, generadas con `pnpm screenshots:web-admin-fees` sobre una base recién sembrada (procesa `batch-clean` como batch 123, que es lo que deja en uso los fees de la cuenta: hay que volver a sembrar después). Cada una a 1280 px y con sufijo `-1024` a 1024 px. `fees-global` (`admin`, Merchant A y Transactional, con el merchant y el proveedor bajo la cuenta), `account-fees-admin` (con **Fees** activo en el menú y las acciones según uso) y `account-fees-analyst` (solo **History**), `add-fee` y `add-fee-overlap` (el `409 fee_overlap` con el MDR sembrado, en el formulario), `edit-in-use` (MDR en uso: **Valid from** y el porcentaje deshabilitados, con el aviso), `change-from-date`, `close-minimum` (por defecto hoy en Nueva York y el mínimo `Applied up to 2026-10-07` del API), `history` y `summary-waiting-analyst` (batch 123 `Processed · pending payment` visto por `analyst`, con la línea de espera del pago). Ningún fee cambia: el `409` lo rechaza el API y los demás diálogos se cancelan. Sin desplazamiento horizontal, tablas recortadas ni diálogos fuera de la pantalla a 1280 y 1024 px: el script termina con error si alguna medición lo encuentra. Son anteriores a `web-admin-accounts`: hoy la página de fees de una cuenta es la pestaña **Fees** de Account Detail y el menú marca Accounts.

`web-admin-accounts/`: #80, las pantallas de cuentas y canales contra el API real de `admin-accounts`, generadas con `pnpm screenshots:web-admin-accounts` sobre una base recién sembrada. Cada una a 1280 px y con sufijo `-1024` a 1024 px. `accounts-admin` (Provider C con **New account**), `new-account` (nombre `bruno-ProviderC-EUR`, fees copiados de ProviderC-USD y el conjunto `Provider C legacy`), `new-account-name-taken` (el `409 account_name_taken` con `ProviderA-USD`, en el formulario y sin perder valores), `close-dialog` y `account-closed` (la cuenta creada, que queda cerrada), `overview-admin` y `overview-analyst` (ProviderA-USD con y sin `account.manage`), `edit-sheet` (cancelado), `account-fees-tab` (la pestaña **Fees** de ProviderA-USD) y `channel-assignment-viewer` (`viewer`, Merchant A). Crea una sola cuenta, con prefijo `bruno-` y cerrada: hay que volver a sembrar después. Sin desplazamiento horizontal, tablas recortadas ni diálogos fuera de la pantalla a 1280 y 1024 px, también con un nombre de cuenta de 50 caracteres en la tabla de Accounts (medido en la página, sin guardarlo): el script termina con error si alguna medición lo encuentra.

Tras `ui-polish` se regeneraron las tres carpetas con los mismos scripts (lo que quedó fuera de su alcance está en #85, #86 y #87): tarjetas con sombra, colores de estado, cabecera de Validations con `Overall result` y la tabla de rangos en su tarjeta, y la columna **Date range** de `Totals by type` en Settlement Review y Summary en lugar de la tabla `Date ranges of this batch`. `settlements-browse` mide además la tarjeta del Login (relleno, borde del tema y sombra) sin capturarla.
