# Tasks

## 1. Backend — tests de integración (prepare / complete)

- [x] 1.1 Añadir `test_local_signing.py` con escenarios feliz, 401 sin token, 409 solicitud no `pending`, 409 desafío consumido/vencido y v1 intacta; verificar que fallan antes de implementar.
- [x] 1.2 Añadir caso de segunda firma incremental sobre el mismo documento (nueva solicitud) y verificar dos firmas válidas en el PDF final.

## 2. Backend — motor PAdES y proveedor local

- [x] 2.1 Crear `app/providers/` con `SignatureProvider`, `PadesEngine` (pyHanko) y tests unitarios mínimos de hash/placeholder; verificar con `pytest backend/tests/unit/`.
- [x] 2.2 Implementar `LocalPAdESProvider` + carga del keystore del seed; verificar que el proveedor produce bytes firmados verificables en test unitario.

## 3. Backend — API prepare / complete

- [x] 3.1 Schemas Pydantic alineados con `docs/openapi.yaml` (`PrepareRequest/Response`, `CompleteRequest`); verificar con revisión del contrato.
- [x] 3.2 Endpoints `prepare` y `complete` en `signature_requests.py` con transiciones de estado, `SigningChallenge` y alta de v2 + `Certificate`; verificar que pasan `test_local_signing.py`.
- [x] 3.3 Ejecutar `pytest` en `backend/tests/integration/` y `alembic check` en verde.

## 4. Widget — tests y firma propia

- [x] 4.1 Extender tests de `App.test.tsx` / API mock: botón habilitado, flujo prepare→complete, errores 409 y estado «firmado»; verificar que fallan con el código actual.
- [x] 4.2 Implementar `prepareSignature` / `completeSignature` en `api.ts` y orquestación en `App` + `SigningMethods`; verificar `npm test` en `widget/`.
- [x] 4.3 Enviar `postMessage` `firmadoc:signed` al completar; verificar con test que mockea `parent.postMessage`.

## 5. Panel — recepción del mensaje

- [x] 5.1 Listener en `sign-document` para `firmadoc:signed` (filtrar `type`) y UI de éxito/descarga v2; verificar con test Vitest del componente.
- [x] 5.2 Prueba manual: panel embebido, firmar PDF, recibir mensaje sin recargar la página padre.

## 6. Documentación

- [x] 6.1 Actualizar `readme.md` (flujo actual sin «próximamente»), `CLAUDE.md` (alcance hito 1 firmado) y entrada breve en `prompts.md`; verificar que las instrucciones de prueba local mencionan el flujo completo.

## Workflow follow-up

- Tras revisión: `openspec validate ticket-1b-local-signing --strict` y archivar el change cuando la implementación esté mergeada.