# Tasks

## 1. Esqueleto de la API y contrato

- [x] 1.1 Agregar `python-multipart` a `backend/requirements.txt` e instalarlo; verificar con `pip show python-multipart`
- [x] 1.2 Actualizar `docs/openapi.yaml`: `GET /health` (`200` y `503`), `409` en `POST /signature-requests` y la lista de valores de `Error.code`; verificar con `npx @redocly/cli lint docs/openapi.yaml` sin errores
- [x] 1.3 Crear `app/main.py` (FastAPI con prefijo `/api/v1`) y un fixture `client` en `tests/integration/conftest.py` que sobrescriba `get_session` con la sesión revertida; verificar que `pytest` sigue en verde

## 2. Errores y estado del servicio (spec `api-access`)

- [x] 2.1 Escribir los tests de los escenarios de «Formato común de errores» y «Estado del servicio» (`tests/integration/test_api_errors.py`, `test_health.py`) y verificar que fallan
- [x] 2.2 Implementar `AppError` y los manejadores de `AppError`, `RequestValidationError` y `HTTPException` en `app/core/errors.py`, y el router de `health` con `503 database_unavailable`; verificar que los tests de 2.1 pasan

## 3. Credenciales (spec `api-access`)

- [x] 3.1 Escribir los tests de los escenarios de API key, token de administración y token de enlace (vigente, vencido, alterado, de otra solicitud), con un endpoint de prueba registrado solo en los tests (`tests/integration/test_auth.py`); verificar que fallan
- [x] 3.2 Implementar `app/services/signing_links.py` (emisión y verificación HMAC con vencimiento de 24 h) y tests unitarios en `tests/unit/test_signing_links.py`, incluido un reloj inyectable para el vencimiento; verificar con `pytest tests/unit`
- [x] 3.3 Implementar `require_integrator`, `require_admin` y `require_document_reader` en `app/core/auth.py`, y la validación de arranque que exige `FIRMADOC_SIGNING_LINK_SECRET` de 32 caracteres o más; verificar que los tests de 3.1 pasan

## 4. Validación del PDF (spec `document-intake`)

- [x] 4.1 Crear generadores de PDF de prueba en `tests/fixtures/pdfs.py` (válido, cifrado, truncado, no-PDF y de más de 10 MB) y escribir los tests unitarios de `pdf_validation` (`tests/unit/test_pdf_validation.py`); verificar que fallan
- [x] 4.2 Implementar `app/services/pdf_validation.py` (tamaño, cabecera `%PDF-`, lectura con pyHanko, cifrado y SHA-256) según la decisión 2 del design; verificar que los tests de 4.1 pasan

## 5. Carga desde el panel (spec `document-intake`)

- [x] 5.1 Escribir los tests HTTP de los escenarios de «Carga de un PDF desde el panel», «Validación del PDF recibido», «Registro del firmante» y «Nombre de archivo conservado» contra `POST /api/v1/admin/signing-uploads`, comprobando en la base que un rechazo no deja filas (`tests/integration/test_admin_uploads.py`); verificar que fallan
- [x] 5.2 Implementar `app/schemas/` (respuesta `SignatureRequestCreated`) y `app/services/intake.py` con `IntakeCommand`, alta o reutilización del firmante con `ON CONFLICT DO NOTHING`, `Document`, `DocumentVersion` v1, puntero de versión vigente y `SignatureRequest` en una sola transacción
- [x] 5.3 Implementar el router `app/api/admin.py`; verificar que los tests de 5.1 pasan

## 6. Envío por sistema integrador (spec `document-intake`)

- [x] 6.1 Escribir los tests HTTP de «Envío de un PDF por un sistema integrador», «Nueva solicitud sobre un documento existente», «Identificador externo único por integrador» y «Proveedores admitidos y URL de aviso» contra `POST /api/v1/signature-requests` (`tests/integration/test_signature_requests.py`); verificar que fallan
- [x] 6.2 Extender `intake.py` con la reutilización de `document_id` (filtrada por integrador), el `409` por `external_document_id` (verificación previa más captura del `IntegrityError`) y el rechazo de `firmar`
- [x] 6.3 Implementar `app/api/signature_requests.py` con el esquema JSON (exactamente uno de `document_base64` o `document_id`, `callback_url` http/https); verificar que los tests de 6.1 pasan

## 7. Descarga de versiones (spec `document-versions`)

- [x] 7.1 Escribir los tests HTTP de «Descarga de una versión» y «Credenciales admitidas para la descarga», incluido un nombre con tildes en `Content-Disposition` (`tests/integration/test_document_download.py`); verificar que fallan
- [x] 7.2 Implementar `app/api/documents.py` con `require_document_reader` y la cabecera RFC 6266; verificar que los tests de 7.1 pasan

## 8. Verificación de punta a punta y documentación

- [x] 8.1 Ejecutar `pytest` completo, `alembic check` y `openspec validate add-document-upload --strict`; verificar que los tres terminan sin errores
- [x] 8.2 Prueba manual: `uvicorn app.main:create_app --factory`, cargar un PDF con `curl` contra `/admin/signing-uploads` y descargar la v1; verificar que el archivo descargado es idéntico al cargado (mismo SHA-256)
- [x] 8.3 Actualizar `readme.md` (sección 1.4 con el arranque de la API y ejemplos `curl`, y nota de que la `signing_url` se usa entera), `CLAUDE.md` (comando `uvicorn` y estructura `app/api`) y `prompts.md` (prompt de SDD con OpenSpec y ajustes humanos); verificar que los comandos documentados funcionan tal como están escritos

## Workflow follow-up

- Revisar el change y archivarlo con `openspec archive add-document-upload` para que las tres specs pasen a `openspec/specs/`.
- Crear los changes de los sub-tickets 1b (motor PAdES y proveedor `local`), 1d (auditoría y webhook) y 1c (validación de confianza, hito 2).
