# Proposal — web-ambiguous-rows

Issue #38, lo último que queda de lo recortado de la Entrega 2: resolver filas ambiguas desde la interfaz. Solo frontend: `PATCH /api/v1/imports/{id}/rows/{sheetId}/{rowNo}` existe desde #36/#37 y no cambia, ni en contrato ni en reglas. El gate se aprobó en `import-in-progress` y se completó al proponer este change (aviso condicional, capturas con una corrida real, candidatas de otro merchant elegibles, rama desde `feature/entrega-3-MVP` tras #129).

## Why

- **HU1 CA6 no se puede cumplir desde la pantalla.** "Dado una fila ambigua, cuando elijo el gateway entre las candidatas, entonces pasa a asociada y la elección queda registrada": el API lo hace y lo audita (`import.row.resolve_gateway`), pero la tabla de filas muestra las candidatas "sin acción" (spec `import`, "Resultado del análisis: tabla de filas"). Una ambigua no se procesa, así que hoy la única salida desde la interfaz es cancelar el import.
- **Resolver tiene un efecto que el analista debe ver antes.** En `analyzed`, resolver supera la corrida vigente sin sustituta (README P7): `GET validations` pasa a `run: null` y Continue exige validar otra vez. En `validated` el `PATCH` responde `409 import_not_editable`; la pantalla debe decir qué hacer en lugar de ofrecer algo que falla.

## What Changes

**Pantalla (paso Analysis, tabla de filas)**

- Con `settlement.process` y el import en `analyzed`, una fila `ambiguous` ofrece elegir una de sus candidatas. Las candidatas de otro merchant (`outOfScope`) son elegibles como las demás, con su gateway y `(another merchant)`, sin más datos.
- Elegir abre una confirmación: la fila pasará a `Matched` con ese gateway y la elección queda registrada. Si hay corrida de validaciones vigente (o aún no se sabe), el diálogo avisa de que se descarta y hay que validar otra vez; con `run = null` conocido no lo dice.
- Al confirmar se llama al `PATCH` con `{ gatewayId }`. Después se vuelven a pedir el detalle del import (contadores), sus filas y sus validaciones. Errores: `409 import_not_editable` y `409 row_not_ambiguous` muestran un mensaje y recargan; `400 validation_error`, un mensaje.
- En `validated`, las candidatas se ven y el control está deshabilitado, con un texto que explica que para elegir hay que validar de nuevo (el import vuelve a `analyzed`). Sin `settlement.process`, o en `processed` y `cancelled`, las candidatas se ven sin control, como hoy.

**Pruebas y documentación**

- Fake MSW del `PATCH` con los esquemas de `@recon/shared` (`ResolveRowBody`, `ImportRowItem`): aplica la respuesta del contrato y supera la corrida del fake de validaciones; no decide reglas nuevas.
- Capturas a 1280 y 1024 px con `pnpm screenshots:web-ambiguous-rows`: el seed no produce ambiguas, así que el script intercepta `GET rows` con `page.route` y sirve una fila ambigua sintética; el import, la corrida y el paso a `validated` son reales. Se dice en el README de wireframes.
- README §1.5: la resolución de ambiguas pasa a hecha (#38).

**Fuera de alcance:** cambios en el backend, en el contrato o en la colección Bruno (el endpoint no cambia y ya tiene sus casos); resolver en lote; deshacer una resolución.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `import`: la tabla de filas deja de mostrar las ambiguas "sin acción" y se añade la resolución de una fila ambigua desde la pantalla (control por estado y permiso, confirmación con aviso de la corrida, refresco y errores).

## Impact

- **Frontend:** `features/imports/analysis` (`RowsTable` y un componente nuevo para elegir la candidata con su diálogo), `features/imports/mutations.ts` (mutación del `PATCH`), `strings.ts`. De `features/validations` solo se importa `validationRunKey`.
- **Fake MSW:** `frontend/src/test/msw/imports.ts` (handler del `PATCH`) y `validations.ts` (superar la corrida vigente sin sustituta, como `supersedeRunOnUndo`).
- **e2e:** script nuevo `e2e/screenshots/web-ambiguous-rows.ts` y su entrada en `package.json` (raíz y `e2e/`); capturas en `docs/wireframes/web-ambiguous-rows/`.
- **Docs:** `docs/wireframes/README.md`, README §1.5.
- **Sin cambios:** backend, `packages/shared`, `docs/openapi.yaml`, `schema.gen.ts`, base de datos, colección Bruno.
