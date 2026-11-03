# Tasks — admin-fees

Rama `feat/admin-fees`. El PR va hacia `feature/entrega-3-MVP`.

El grupo 1 es el contrato del que parte `web-admin-fees`. Al terminarlo se hace push y se avisa a la persona; no se sigue hasta que lo confirme. Sin migraciones: si al implementar resulta que hace falta tocar el esquema, se para y se pregunta.

## 1. Contrato en `@recon/shared` y export de OpenAPI

- [x] 1.1 Escribir `packages/shared/src/fees.test.ts` con los esquemas de D2 y comprobar que falla porque los exports no existen. Debe cubrir:
  - `AccountFee` ampliada, con `lastAppliedEventDate` nullable;
  - `FeeCreate`: rechaza un número JSON en `fixedAmount`, `percentage` con 7 decimales, una fecha no ISO y una clave desconocida;
  - `FeePatch` en sus dos formas: rechaza cuerpo vacío, `effectiveFrom` sin valores, `effectiveFrom` con `startDate` o `endDate`, `feeTypeId`, y `reason` vacío, de solo espacios o de 501 caracteres;
  - `FeesQuery`: rechaza `pageSize` 0 y 501, usa 50 por defecto y rechaza `status=withdrawn`;
  - `FeeHistoryEntry`, `FeePage` y `FeeUpdateResult`.
- [x] 1.2 Commit: test(shared): contrato de la administración de fees
- [x] 1.3 Implementar los esquemas en `packages/shared/src/fees.ts` y exportarlos desde `index.ts`. Verificar con `pnpm --filter @recon/shared test` y `pnpm typecheck`.
- [x] 1.4 Ampliar `toStoredFee` y `feeSelect` del repositorio de lectura con los campos nuevos de `AccountFee`: variantes, `status` (con reloj inyectado, D7), `inUse` y `lastAppliedEventDate` (D5), `createdBy`, `createdAt` y `updatedAt`. Ajustar `fee-read-service.test.ts`, `fee-routes.test.ts` y `test/integration/fees.int.test.ts`, añadiendo los escenarios "Campos ampliados" y "Fee del seed con settlements procesados". Verificar que siguen en verde. `statusOf` y `newYorkDay` se adelantan aquí, en `domain/fee-validity.ts` con su test; la 2.1 añade el resto.
- [x] 1.5 Declarar en `http/fee-admin-routes.ts` las rutas `POST /accounts/:accountId/fees`, `PATCH /fees/:feeId`, `GET /fees` y `GET /fees/:feeId/history`, cada una con su esquema y su `preHandler` de permiso. Los handlers provisionales responden `501 not_implemented` (D11). Registrar las rutas en `fees-module.ts`. Verificar con un test de rutas que cubra `401`, `403` antes que el alcance y `400` de esquema.
- [x] 1.6 Ejecutar `pnpm openapi:export` y `pnpm --filter @recon/frontend api:generate`, y ampliar `app.test.ts` con las rutas nuevas y añadir los campos nuevos al fixture `preset` de `frontend/src/test/msw/settlements.ts` (contrato de la API falsa). Verificar con `pnpm openapi:check`, `pnpm lint` y `pnpm typecheck`.
- [x] 1.7 Commit: feat(fees): contrato de la administración de fees y export de OpenAPI
- [x] 1.8 Hacer `git push` de `feat/admin-fees` y avisar a la persona de que el contrato está publicado, porque `web-admin-fees` parte de aquí. No seguir hasta su confirmación.

## 2. Dominio de vigencias, solapes y edición (TDD)

- [x] 2.1 Escribir `domain/fee-validity.test.ts` y comprobar que falla. Debe cubrir:
  - `statusOf`: los tres estados y los bordes del día de hoy (escenario "Programado, cerrado y activo");
  - `findOverlaps`: NULL…NULL contra NULL…NULL, abierto contra cerrado, bordes contiguos (…10-31 y 11-01…), tipos distintos y la propia fila ignorada;
  - `previousDay`: fin de mes, 1 de marzo de un año bisiesto y 1 de enero.
- [x] 2.2 Escribir `domain/fee-patch.test.ts` con las dos formas de D3 y comprobar que falla. Debe cubrir:
  - corrección completa de un fee sin uso (`updated`);
  - campos no editables en uso (`fee_in_use` con `fields`);
  - `description` en uso;
  - cierre `closed`, igual o posterior al último evento y anterior a él (`fee_in_use` con `lastAppliedEventDate`);
  - cambio desde una fecha: sucesor con valores fusionados y `endDate` heredado;
  - `effectiveFrom` igual a `startDate` o posterior a `endDate` (`400` con `field`);
  - `effectiveFrom − 1` anterior al último evento;
  - reglas de un fee válido: ni importe ni porcentaje, y `endDate < startDate`.
- [x] 2.3 Escribir `domain/fee-snapshot.test.ts` y comprobar que falla. Debe cubrir el paso de fila a `FeeSnapshot` y vuelta, y la lectura del formato del seed: `"percentage":0.1` → `"0.100000"` y `"fixedAmount":0.65` → `"0.6500"`.
- [x] 2.4 Commit: test(fees): reglas de vigencia, solape y edición
- [x] 2.5 Implementar `fee-validity.ts`, `fee-patch.ts`, `fee-snapshot.ts` y `domain/errors.ts` (D9) hasta dejar los tres tests en verde. Rotura deliberada: hacer que `findOverlaps` trate como solapados los bordes contiguos debe hacer fallar su caso; después se revierte.
- [x] 2.6 Commit: feat(fees): reglas de vigencia, solape y edición como funciones puras

## 3. Crear, corregir, cerrar y cambiar desde una fecha

- [x] 3.1 Escribir `application/fee-admin-service.test.ts` con un repositorio en memoria en `__fakes__` y comprobar que falla. Debe cubrir:
  - creación (`inUse = false`, `lastAppliedEventDate = null`);
  - las dos formas del `PATCH`;
  - `fee_overlap` al crear y al corregir;
  - `404` del fee y de la cuenta;
  - el historial y la auditoría de cada acción (D10).
- [x] 3.2 Escribir `test/integration/fee-admin.int.test.ts` contra la base local con los escenarios de la delta spec y comprobar que falla. Cada test limpia sus filas. Escenarios:
  - "Fee creado con vigencia abierta", "Ni importe ni porcentaje", "Tipo inactivo o inexistente" y "Fee programado junto al vigente";
  - "Corrección completa de un fee sin uso", "Cambiar el valor de un fee en uso" y "Descripción de un fee en uso";
  - "Cierre posterior al último evento aplicado" y "Cierre que dejaría fuera eventos ya aplicados";
  - "Cambiar un fee cierra el vigente y abre el nuevo", "Cambio con fecha anterior a eventos ya aplicados" y "Los movimientos procesados no cambian";
  - "Solapamiento rechazado", "Solapamiento al corregir" y "Bordes contiguos";
  - "Corrección auditada", "Cambio desde una fecha auditado" y "Fallo a mitad";
  - "Respaldo del trigger" y "Sin permiso de administración".
  - Hecho: con `backend/` como en `1f7ff4b` el fichero falla al cargar (no existe aún el repositorio); después, 17 escenarios en verde. "Fallo a mitad" se prueba con el repositorio real y una unidad de trabajo que lanza tras escribir. El `404` fuera de alcance va en los tests de servicio y de rutas, porque solo `admin` tiene `fee.manage` y su alcance es `all`. Se añadió luego "Corrección sin cambios".
- [x] 3.3 Commit: test(fees): crear y editar fees con historial y auditoría
- [x] 3.4 Implementar `PrismaFeeAdminRepository` siguiendo el orden de D6: bloqueo `UPDLOCK, HOLDLOCK` de la cuenta, uso según D5, historial y auditoría en la misma transacción, y el error 50001 traducido a `fee_overlap`. Implementar `FeeAdminService.create` y `.patch` y conectar las rutas `POST` y `PATCH` del grupo 1. Si hace falta, mover `deadlock-retry` a `backend/src/infrastructure/` sin cambiar su comportamiento, con sus tests en verde. Verificar con 3.1 y 3.2.
- [x] 3.5 Escribir el test de concurrencia "Dos altas simultáneas" con compuertas, como `settlement-concurrency.int.test.ts`: una petición recibe `201` y la otra `409 fee_overlap`. Quitar el bloqueo debe hacer que la segunda la pare el trigger (`conflicts: []`) y el test lo detecte; después se revierte.
  - Hecho: la compuerta es el gancho `beforeWrite` del repositorio. Sin el bloqueo es la primera escritura la que cae en el trigger (`FeeOverlapError` sin conflictos) y el test falla; se revirtió. El test limpia por la firma del fixture, antes y después.
- [x] 3.6 Commit: feat(fees): crear, corregir, cerrar y cambiar fees desde una fecha

## 4. Vista global e historial

- [x] 4.1 Escribir `test/integration/fee-list.int.test.ts` y comprobar que falla. Debe cubrir:
  - "Activos de un merchant", "Preestablecidos por batch", "Alcance", "Paginación estable", "Tamaño de página inválido" y "Búsqueda";
  - `status=scheduled` y `status=closed` sobre fees creados en el test, con reloj fijo;
  - `inUse` y `lastAppliedEventDate` en la página;
  - `404` para un `providerId` fuera del alcance.
- [x] 4.2 Escribir en `fee-admin.int.test.ts` los casos de historial "Cadena de un tipo", "Historial del seed", "Alcance inválido" y "Fee fuera del alcance", y comprobar que fallan.
  - Hecho: con `backend/` como en `c93d3af` fallan 11 de 12 contra los `501` (el `400` de esquema ya pasaba); después, 30 de 30 en verde. El total de "Activos de un merchant" se compara con los fees vigentes hoy, porque el flujo de Bruno deja fees programados.
- [x] 4.3 Commit: test(fees): vista global e historial
- [x] 4.4 Implementar `list` (D8) e `history` (D10) en el servicio y el repositorio, conectar sus rutas y quitar los handlers provisionales `501`. Verificar con 4.1, 4.2 y `pnpm test`. Ejecutar `pnpm openapi:check`: si el contrato cambió respecto al grupo 1, regenerar y avisar a la persona.
  - Hecho: servicio `FeeQueryService` y `PrismaFeeQueryRepository` aparte del de lectura. El contrato no cambió: solo desaparecieron las respuestas `501`. `pnpm --filter @recon/backend test:integration` completo: 60 fallos en 10 ficheros de import y settlement, todos por el estado de la base (ProviderA-USD tenía ya procesado el batch 123, de una prueba manual), ninguno de fees. Tras `pnpm db:seed` salieron 8 fallos de fees: los tests suponían fees en uso en el seed, que procesa sus batches sin desglose. Ahora crean su uso con un fixture (`applyFeeUsage` en `helpers.ts`) y lo borran; el negativo de `fee_in_use` de Bruno pasó a `batch-clean`.
- [x] 4.5 Commit: feat(fees): vista global de fees e historial de cambios

## 5. Colección Bruno

- [x] 5.1 Añadir:
  - `00-auth/Login as admin`, que guarda `{{adminToken}}`;
  - `SEED_ADMIN_USER` en `api-collection/.env.example` (la persona lo copia a su `.env`, que no se lee ni se versiona);
  - `as: admin` en el comentario de `collection.bru`.
- [x] 5.2 Añadir a `10-smoke` los negativos y los casos felices de lectura de D12.
- [x] 5.3 Añadir `20-flows/fees/` con la secuencia de D12, en fechas futuras derivadas de la ejecución.
- [ ] 5.4 La persona ejecuta `! pnpm test:api` con `pnpm dev` levantado. Verificar que pasa dos veces seguidas sin `db:seed` entre medias.
  - Acotada (decisión de la persona): se cierra con lo de fees en verde en dos pasadas seguidas, incluido `31 Patch an applied fee` con el respaldo de `10-smoke/Fees` (`c949635`). `batch-clean` necesita base recién sembrada: en la segunda pasada fallan `batch-clean`, `10-smoke/Channels unassigned` e `imports/13 Analyze` (RAM-07 ya asignado, siguiente batch 124), y `8 Process without confirmation` procesa de verdad un batch. Deuda en #111.
- [x] 5.5 Commit: test(api): colección Bruno de la administración de fees

## 6. Documentación

- [x] 6.1 Actualizar el README según D13 (§1.2 con las limitaciones y #109, §1.5, §3.2, §4.1 y §4.4). Verificar con `grep` que no queda `FEE_OVERLAP` y que `POST /accounts/{id}/fees` sigue marcado con ✅.
- [x] 6.2 Actualizar la sección Bruno de `CLAUDE.md`: los casos felices de `POST`/`PATCH` de fees usan `admin` (`as: admin`, `{{adminToken}}`), porque solo `admin` tiene `fee.manage`.
- [x] 6.3 Verificar con `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm openapi:check` y `openspec validate admin-fees --strict`.
- [x] 6.4 Commit: docs(fees): README, CLAUDE.md y OpenAPI de la administración de fees

## Workflow follow-up

- `/opsx:verify`, PR hacia `feature/entrega-3-MVP` con la plantilla y CI en verde, y `/opsx:archive`.
- Anotar en #67 la carrera entre el procesado y la corrección en el sitio (design, Risks).
