# Proposal

## Why

El hito 1 del MVP exige cerrar el flujo «cargar PDF → firmar con proveedor `local` → versión v2 vigente y descargable» (HU1 y HU5). Hoy la carga y el widget de lectura funcionan, pero «Firma propia» está deshabilitada y la API no expone `prepare` / `complete`. Sin el Ticket **1b** no hay demostración end-to-end de firma diferida ni base para el proveedor `token` del hito 2.

## What Changes

- Implementar en el backend el motor PAdES con pyHanko (firma interrumpida), la interfaz `SignatureProvider` y `LocalPAdESProvider` usando el keystore de demostración del seed.
- Exponer `POST /api/v1/signature-requests/{id}/prepare` y `POST /api/v1/signature-requests/{id}/complete` según `docs/openapi.yaml`, con proveedor `local` (sin `certificate_pem` ni `signatures` en el cuerpo).
- Transicionar la solicitud (`pending` → `signing` → `signed`), crear `DocumentVersion` `signed` (v2), actualizar `current_version_id` sin mutar v1, registrar `Certificate` del proveedor local y persistir `SigningChallenge` de un solo uso.
- Habilitar en el widget la tarjeta «Firma propia»: orquestar `prepare` → `complete`, estados de UI, descarga de la versión firmada y `postMessage` `firmadoc:signed` al panel padre (criterio del hito 1 del Ticket 2).
- Tests de integración del backend derivados de los escenarios; tests del widget (Vitest) para el flujo feliz y rechazos HTTP relevantes.

## Capabilities

### New Capabilities

- `local-pades-signing`: firma diferida con proveedor `local` — `prepare`, `complete`, desafíos, incrustado PAdES B-B e inmutabilidad de versiones.

### Modified Capabilities

- `signing-widget`: la tarjeta «Firma propia» deja de estar permanentemente deshabilitada; orquestación y mensajes de error del flujo de firma.
- `signature-request-status`: comportamiento de `GET` tras `signed` (v2, `signature_level`, `signed_at`).
- `document-versions`: descarga de v2 firmada y verificación de que v1 conserva sus bytes.

## Impact

- **Código**: `backend/app/` (nuevos `providers/`, servicios PAdES, rutas en `signature_requests.py`, schemas), `widget/src/` (`SigningMethods`, cliente API, estados en `App`), tests en `backend/tests/integration/` y `widget/src/*.test.tsx`.
- **API**: sin cambios de contrato en OpenAPI; implementación de endpoints ya especificados. Errores `409` / `422` alineados con el YAML.
- **Datos**: uso de tablas existentes (`signing_challenge`, `certificate`, `document_version`); sin migración nueva salvo que el diseño detecte un hueco.
- **Fuera de alcance (este change)**: Ticket **1c** (validación de confianza para `token`), Ticket **1d** (auditoría completa y webhook), proveedor `token` / agente, `firmar`, lotes, TSA / B-LT, reintentos de webhooks, refresco automático del panel Angular más allá de `postMessage`, OAuth2 y Web Component.

**Referencias:** readme.md sección 6 — **Ticket 1b**; HU **5** (evaluador sin token) y criterios de descarga/versionado compartidos con HU **1** y **2**; alcance MVP en CLAUDE.md.