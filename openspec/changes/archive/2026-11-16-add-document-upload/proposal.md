# Proposal

## Why

El esquema del MVP ya existe (Ticket 3), pero todavía no hay forma de que un documento entre a Firmadoc: sin carga no hay `Document`, y sin `Document` no hay solicitud de firma (HU1 es prerequisito de todo el backlog). Este cambio implementa el **Ticket 1a — Carga de documentos y versionado** (readme, sección 6) y es el primer tramo del flujo de punta a punta de la Entrega 2: un PDF cargado queda guardado como v1, con su solicitud de firma `pending` y una `signing_url` lista para el widget.

Cubre los criterios de aceptación de **HU1** (carga desde el panel con nombre y CUIL del firmante) y **HU1b** (envío por sistema integrador, con reutilización de `document_id`), y la parte de descarga de versiones que comparten HU2 y HU5.

## What Changes

- Esqueleto de la aplicación FastAPI (`app/main.py`), con `GET /api/v1/health` y un formato de error único (`{code, message, details}`) también para los errores de validación.
- Autenticación por API key de sistema integrador (`X-API-Key`, comparada contra el hash guardado) y por token de administración (`Authorization: Bearer`), sin acceso si `FIRMADOC_ADMIN_TOKEN` está vacío.
- `POST /api/v1/admin/signing-uploads` (multipart) y `POST /api/v1/signature-requests` (JSON), ambos sobre un único servicio de carga:
  - Validan el PDF (cabecera, legibilidad, sin cifrado y tamaño máximo `FIRMADOC_MAX_UPLOAD_MB`) y el firmante (nombre y CUIL de 11 dígitos).
  - Dan de alta el `Signer` o lo reutilizan por CUIL, y crean `Document`, `DocumentVersion` v1 (`uploaded`) y `SignatureRequest` (`pending`) en una sola transacción.
  - Devuelven `signing_url` con un token de enlace firmado y con vencimiento.
- Reutilización de un `document_id` ya conocido: la nueva solicitud opera sobre la versión vigente sin reenviar el binario.
- `GET /api/v1/documents/{id}/versions/{n}/download`: descarga con el nombre original del archivo, para el integrador dueño, el panel o el portador del enlace de firma.
- Cambios en `docs/openapi.yaml`:
  - Se agrega `409` a `POST /signature-requests` para un `external_document_id` que ya existe en ese sistema integrador.
  - Se agrega `GET /health` (sin autenticación, con `503` si la base no responde).
  - Se documentan los valores de `Error.code` que usa la API.

## Capabilities

### New Capabilities
- `api-access`: autenticación y alcance de cada credencial (sistema integrador, administración, enlace de firma) y formato común de errores de la API.
- `document-intake`: ingreso de documentos PDF a Firmadoc, ya sea por el panel o por un sistema integrador: validación, firmante, documento, versión inicial y solicitud de firma con su `signing_url`.
- `document-versions`: acceso a las versiones de un documento y su descarga con el nombre original.

### Modified Capabilities
<!-- Ninguna: no hay specs previas en openspec/specs/. -->

## Fuera de alcance

- `prepare` / `complete`, el motor PAdES y la firma con el proveedor `local` (Ticket 1b).
- Validación de confianza de certificados y cotejo del CUIL (Ticket 1c).
- Eventos de auditoría y webhook al `callback_url` (Ticket 1d): aquí solo se guarda `callback_url`.
- `GET /api/v1/signature-requests/{id}` y la vista del documento en el widget (Ticket 2).
- Firma en lote, varios PDF en una carga, proveedor `firmar`, OAuth2, rate limiting y la cabecera `frame-ancestors` (versión 2 o tickets posteriores).

## Impact

- **Código nuevo**: `backend/app/main.py`, `app/api/` (routers), `app/schemas/` (Pydantic), `app/services/` (carga, validación de PDF, enlaces de firma) y `app/core/` (dependencias de autenticación y manejo de errores).
- **Modelo**: sin migraciones; se usa el esquema `0001_initial_schema` tal como está.
- **Contrato**: `docs/openapi.yaml` gana una respuesta `409`, el endpoint `/health` y la lista de códigos de error.
- **Dependencias**: `python-multipart` (formularios multipart en FastAPI). La lectura de PDF usa `pyHanko`, que ya está instalado.
- **Configuración**: usa `FIRMADOC_ADMIN_TOKEN`, `FIRMADOC_SIGNING_LINK_SECRET`, `FIRMADOC_PUBLIC_BASE_URL` y `FIRMADOC_MAX_UPLOAD_MB`, ya presentes en `.env.example`.
