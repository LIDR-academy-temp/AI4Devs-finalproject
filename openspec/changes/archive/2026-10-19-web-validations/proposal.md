# Proposal — web-validations

Issue: #10 · T3 · HU2 · pantalla **Analysis & Validations**. Depende de #9 (`validation-runs`, en curso: hoy solo su proposal y su design están en la rama `feat/validation-runs`) y se apoya en `web-shell` (sesión, guarda por permiso, textos por pantalla) y `web-import` (espacio del import, TanStack Query/Table, MSW, guarda de doble envío, cliente generado), ambos archivados. El issue dice "puede empezar con mocks": este change se construye contra el contrato publicado en `validation-runs/design.md` ("Contrato para #10") y se cierra con un rebase sobre #9.

## Why

El paso Analysis del import (`web-import`) termina en el resultado del cruce: contadores, aviso de canales y filas. El analista no puede ver las ocho validaciones, abrir un hallazgo ni decidir. Sin esta pantalla, ningún import llega a `validated` desde la aplicación y Settlement Review (#13) no tiene de dónde arrancar. Cierra HU2 en el frontend: criterios 1–8, con el 9 visible solo como estado del hallazgo.

## Secciones del README que implementa

- **§5 HU2**, criterios 1, 2 y 5–8 en pantalla. El 3 y el 4 se ven en los datos que el API ya trae: duplicado con una aparición incluida, colisiones sin bloqueo y `not_applicable` como n/a. El 9 (faltante resuelto por un batch posterior) es de #11, y la pantalla solo pinta `resolutionStatus`.
- **§1.3**: fila **Analysis & Validations** del mapa de pantallas, "Presentación de validaciones y resultados parciales" (una sola decisión de conjunto, acciones opcionales dentro del detalle, Continue deshabilitado con `provider_mismatch`) y el paso 3 del recorrido.
- **§3.3**: vocabulario de resultados (`passed`, `warning`, `blocked`, `not_applicable` como n/a, `not_implemented`), rangos APP/DEC/I/R, contadores informativos y estado no resuelto como colisión. La pantalla los pinta y no recalcula ninguno.
- **§4.4**: consume las siete rutas de validaciones de #9 y `POST /imports/{id}/cancel`. **Ningún endpoint nuevo ni modificado.**

## What Changes

- **Bloque de validaciones dentro del paso Analysis** de `/imports/$importId`, debajo del resultado del análisis y encima de la tabla de filas (design D1):
  - **Cabecera de la corrida**: estado global (`Blocked` / `Warnings` / `Passed`), corrida (número, fecha y usuario), rangos APP/DEC/I/R usados y contadores informativos (`pendingInRangeCount`, `undatedAdjustmentCount`, `undatedCandidateCount`). Sin corrida vigente, un texto que invita a ejecutar las validaciones.
  - **Run validations** / **Run again**, deshabilitado mientras corre (guarda síncrona contra el doble clic). Ante `409 import_changed` o `import_not_analyzed`, relee la corrida y el import y lo dice. Si `manualChangeCount > 0` o el import está `validated`, pide confirmación antes y dice cuántos cambios manuales se pierden y que la revisión quedará invalidada.
  - **Tabla de las ocho validaciones** en el orden del API: resultado, número de hallazgos, si bloquea y desglose (APP/DEC/I/R en faltantes, `non_recorded_adjustment`/`status_mismatch` en la segunda). Una validación con hallazgos abre su lista.
  - **Lista de hallazgos** paginada en el servidor (TanStack Table), filtrada por la validación elegida, con ID, ciclo, tipo y alcance, estado reportado y estado del gateway, rango del faltante, apariciones incluidas sobre el total y resolución. La validación, la página y el hallazgo abierto van en la búsqueda de la ruta.
  - **Drawer del hallazgo**, con todas las apariciones: archivo, hoja y fila, o batch e intento con su estado actual; estado (`Unresolved status` si es NULL); `CHB 2`; incluida por defecto e incluida ahora; quién y cuándo la cambió. Debajo, la resolución y el historial completo con usuario y fecha. Lleva las acciones completas:
    - **Cambiar la inclusión** de una aparición cuando `editable`. Si no es `includable`, solo se puede excluir, con el motivo a la vista. Sobre un import `validated` pide confirmación, porque la revisión quedará invalidada.
    - **Marcar resuelto** un `non_recorded_adjustment` o un `status_mismatch` con nota obligatoria (1–500 caracteres) cuando `resolvable`.
  - **Aviso de revisión invalidada** (criterio 4 del issue) a partir de `lastInvalidatedReview`: quién revisó y cuándo, quién la invalidó, cuándo y por qué (re-ejecución o cambio de inclusión).
  - **Decisión de conjunto**: **Continue to settlement review** (`POST review` con el `runId` mostrado). Está deshabilitado sin corrida o con la corrida bloqueada, con el motivo visible (`provider_mismatch: cancel the import and process it under the correct provider`) y enlace al hallazgo bloqueante. **Cancel and reprocess** reutiliza el diálogo de cancelación de `web-import`. Ya `validated`, muestra quién y cuándo aprobó, y el acceso a Settlement Review como entrada deshabilitada hasta #13 (design D9).
- **Permisos en pantalla**: Run y Continue dependen de `settlement.process` y del estado del import, como en `web-import` D10. Los controles del drawer dependen solo de `editable`, `includable` y `resolvable` del API, sin reglas propias. `viewer` ve todo en solo lectura.
- **Contrato aislado**: los tipos y las llamadas de las siete rutas viven en un único módulo, el API falso de MSW en otro, y en ningún otro sitio. Cuando #9 se fusione, el rebase cambia esos dos ficheros por el cliente generado y los tipos generados (design D2, último grupo de tareas).
- **Fechas en hora de Nueva York con sufijo `ET`**, con la convención de la sección siguiente: `formatBusinessDate` / `formatBusinessDateTime` y `formatAuditDateTime` en `lib/format.ts` (design D11).
- Componentes shadcn nuevos: `sheet` (drawer), `switch`, `textarea`.
- **Capturas del PR con Playwright**: un script en `e2e/`, fuera de `pnpm test:e2e` y de CI, que entra como `analyst` y guarda los PNG en `docs/wireframes/web-validations/` (design D13).

## Convención de fechas (decidida en la revisión del 2026-10-18)

- **Fechas de negocio**: `transactionDate`, `lastStatusChangedAt`, rangos APP/DEC/I/R, `relevantDate`, `txnDate`, `eventDate` y fechas de batch. Son la hora de pared de America/New_York tal como llega del gateway principal y se guardan sin zona (`DATETIME2`). El API las serializa con `Z` por el formato de transporte, pero **no son instantes UTC**: la pantalla las muestra sin convertir.
- **Fechas de auditoría**: `createdAt`, `updatedAt`, `runAt`, `changedAt`, `reviewedAt`, `resolvedAt`, `invalidatedAt` y `at` del historial. Son instantes UTC reales: la pantalla las convierte a America/New_York.
- Todas se muestran con sufijo `ET`. La zona de presentación es una constante, nunca la del navegador.
- **Deuda para la Entrega 3** (#48): serializar las fechas de negocio sin `Z` en el API y quitar del frontend el formateo sin conversión.
- **Pendiente de roadmap**: averiguar la zona horaria del gateway UUID antes de incorporarlo a la reconciliación. Esta convención solo vale para el gateway principal.

## Huecos del contrato detectados (no se cambia el backend)

Seguimiento: el motivo al cancelar va en #47 y la serialización de las fechas de negocio en #48, ambos abiertos en la revisión; el hueco 3 va en #55; el 4 no lleva issue, porque es la decisión D10; y el 5 quedó resuelto contra el API real.

1. **Cancelar sin motivo.** El issue pide "Cancel import con confirmación y motivo", pero `POST /imports/{id}/cancel` no acepta cuerpo, y #9 no lo cambia. **Decidido en la revisión**: el 23 de octubre se cancela sin motivo, solo con confirmación, como en `web-import`. El motivo (`{ reason }` en el cancel, su `AuditLog` y el textarea en `CancelImportDialog`) va en #47, en la Entrega 3.
2. **Settlement Review no existe todavía** (#13). Tras `validated`, el acceso se pinta como entrada deshabilitada con `Settlement Review is not available yet.`, siguiendo la convención del menú para pantallas sin construir. La ruta se fija en una sola constante que #13 rellena (design D9).
3. **`includable = false` no dice por qué.** El motivo (`reserve_already_included` / `reserve_already_released`) solo llega en el `409`. Para no duplicar la regla de R, la pantalla muestra un texto genérico junto a la aparición y el específico si el `409` ocurre. El campo `includableReason` en el contrato y su texto en el drawer van en #55 (Entrega 3).
4. **Sin indicadores `canRun` / `canReview`** en `ValidationRunView`. Run y Continue se ofrecen por permiso y estado del import (`analyzed`, o también `validated` para Run), como el resto del espacio del import (`web-import` D10). Es presentación y el API decide. Sin issue: es la decisión D10 del design, documentada allí.
5. **`batch-blocked` sin oráculo completo.** Su `expected.json` solo fija `provider_mismatch: 1`. Resuelto contra el API real en el rebase: además del `provider_mismatch`, `missing_in_range` trae diez faltantes APP y el resto pasa. La fixture del falso lleva esos datos.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `validation`: se añaden los requisitos de la pantalla Analysis & Validations: cabecera y ejecución de la corrida, tabla de validaciones, lista y detalle de hallazgos, acciones del drawer, aviso de revisión invalidada, decisión de conjunto y solo lectura. Los requisitos existentes no cambian y ya tienen escenario. Los de #9 son otros (`ADDED` con nombres distintos), así que los dos deltas no chocan al archivar.

## Fuera de alcance

- **Resumen previo por ciclo** (conteos e importes): es de #13 (Settlement Review), por decisión de alcance ya recogida en #9.
- Settlement Review; resolver filas ambiguas desde la UI; heredar acciones manuales entre corridas (deuda de la Entrega 3 en #9); suite E2E de validaciones (Entrega 3, README §2.6); comunicaciones al proveedor.
- Cambios de backend, de OpenAPI o de la colección Bruno: no hay endpoints nuevos ni modificados.

## Impact

- **Código nuevo**: `frontend/src/features/validations/` (bloque, tabla, lista, drawer, decisión, consultas, mutaciones, textos y tests), `frontend/src/features/validations/contract.ts` (tipos y llamadas del contrato, temporal hasta #9) y `frontend/src/test/msw/validations.ts` (API falso con estado).
- **Código modificado**: `features/imports/analysis/AnalysisStep.tsx` (monta el bloque), `features/imports/validate-search.ts` (búsqueda `validation`, `issue`, `ipage`), `features/imports/CancelImportDialog.tsx` (etiqueta configurable del botón), `test/msw/handlers.ts` (registra el falso), `test/msw/imports.ts` (expone el estado del import al falso de validaciones), `lib/format.ts` (formateadores de negocio y de auditoría, `DISPLAY_TIME_ZONE`), `components/ui/` (tres componentes shadcn).
- **E2E**: un script de capturas en `e2e/`, excluido de `pnpm test:e2e` y de CI. No añade escenarios Gherkin.
- **Dependencias nuevas**: ninguna de npm salvo las que traiga `shadcn add` para `sheet`, `switch` y `textarea`, que son primitivas de `radix-ui`, ya instalado.
- **Backend, base de datos, OpenAPI, Bruno**: sin cambios. Tras el merge de #9, `frontend/src/lib/api/schema.gen.ts` llega regenerado con #9.
- **Pruebas**: componentes con MSW. Mientras #9 esté en curso, no se ejecuta integración ni E2E contra la base, porque se comparte. La prueba contra el API real va en el último grupo.

## Insumos que necesito de la persona

Revisión del 2026-10-18: D1–D10, D13 y D14 aprobadas; D11 (fechas) y D12 (API falso guionizado) ajustadas; motivo al cancelar decidido (#47). Quedan:

1. **Para la prueba contra el API real y las capturas** (último grupo): base local libre de las pruebas de #9, migración `0006` aplicada y seed (`! pnpm db:migrate`, `! pnpm db:seed`) y `pnpm dev` levantado.
2. **Mirar la ejecución del script de capturas**: aviso antes de lanzarlo.
