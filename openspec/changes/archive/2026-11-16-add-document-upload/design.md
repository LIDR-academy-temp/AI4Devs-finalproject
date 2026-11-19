# Design

## Context

Ver `proposal.md` (Why). Hoy el backend tiene el esquema del MVP (`0001_initial_schema`), los modelos SQLAlchemy en `app/models/`, la configuración en `app/core/config.py`, `hash_api_key` en `app/core/security.py` y el seed. No existe todavía la aplicación FastAPI ni ningún router.

Restricciones que vienen de decisiones cerradas (`CLAUDE.md`): PostgreSQL con los PDF en `document_version.content` (`bytea`); `document_version` es append-only por trigger; `callback_url` vive en `signature_request`; las cargas del panel piden nombre y CUIL del firmante; autenticación con `X-API-Key`, `Authorization: Bearer` y `X-Signing-Token`.

## Goals / Non-Goals

**Goals:**
- Un único servicio de carga que usen los dos endpoints, para que las reglas de las specs `document-intake` se apliquen igual por el panel y por la API.
- Credenciales resueltas como dependencias reutilizables, de modo que 1b y el widget usen las mismas (`X-Signing-Token` ya queda listo para `prepare` / `complete`).
- Rechazar los archivos inválidos antes de abrir una transacción.

**Non-Goals:**
- Contar páginas o extraer metadatos del PDF (los necesitará el widget en el Ticket 2).
- Streaming de archivos grandes: con un máximo de 10 MB, el binario se procesa en memoria.

## Decisions

### 1. Capas: routers finos sobre un servicio de carga
`app/api/` tiene un router por recurso (`admin`, `signature_requests`, `documents`, `health`). Cada router traduce su entrada (multipart o JSON) a un mismo `IntakeCommand` y llama a `app/services/intake.py`, que valida, crea los registros y devuelve el resultado.
- *Alternativa descartada:* repetir la lógica en cada router; las reglas de firmante, PDF y transacción terminarían divergiendo.

### 2. Validación del PDF con pyHanko, antes de la transacción
`app/services/pdf_validation.py`, en este orden:
1. Tamaño: en multipart se lee hasta `max + 1` bytes; en JSON se rechaza un `document_base64` más largo que el equivalente en base64 de `max` antes de decodificarlo.
2. Cabecera `%PDF-`.
3. Lectura con `pyhanko.pdf_utils.reader.PdfFileReader`.
4. Rechazo si el PDF está cifrado.

Devuelve el binario y su SHA-256.
- *Alternativa descartada:* `pypdf`, una dependencia más para lo que pyHanko ya hace, y pyHanko es además el motor que firmará en 1b. Si pyHanko no puede leer un PDF, tampoco podrá firmarlo.

### 3. Token del enlace de firma: HMAC propio, en el fragmento de la URL
El formato es `base64url(json{rid, exp}).base64url(hmac_sha256(secret, payload))`, generado por `app/services/signing_links.py`. La URL queda así: `{FIRMADOC_PUBLIC_BASE_URL}/sign/{request_id}#t={token}`.

El token va en el fragmento para que no viaje al servidor que sirve el widget ni quede en logs o en `Referer`; el widget lo lee y lo envía en `X-Signing-Token`. Vigencia: 24 horas. La verificación usa `hmac.compare_digest` y rechaza un `exp` pasado.

Si `FIRMADOC_SIGNING_LINK_SECRET` tiene menos de 32 caracteres, la aplicación no arranca.
- *Alternativa descartada:* JWT con PyJWT. Agrega una dependencia y la superficie de configuración de algoritmos, para un token que solo emite y verifica Firmadoc.

### 4. Credenciales como dependencias de FastAPI
`app/core/auth.py` expone tres dependencias:
- `require_integrator`: busca el integrador por `hash_api_key(X-API-Key)`; la búsqueda es por índice único.
- `require_admin`: compara con `hmac.compare_digest` y rechaza si el token configurado está vacío.
- `require_document_reader`: acepta cualquiera de las tres credenciales y devuelve un `Principal` (`integrator` + id, `admin`, o `signing_link` + `request_id`).

El aislamiento entre integradores se resuelve en el servicio filtrando por `integrating_system_id`. Un documento ajeno responde `404`, nunca `403`, para no revelar su existencia.

### 5. Errores: una excepción de dominio y tres manejadores
`AppError(status, code, message, details)` en `app/core/errors.py`, con manejadores para `AppError`, `RequestValidationError` (pasa a `422 validation_error` con la lista de campos en `details`) y `HTTPException`. Todos responden el esquema `Error` del contrato.

Códigos: `unauthorized`, `not_found`, `validation_error`, `invalid_pdf`, `file_too_large`, `unsupported_provider`, `duplicate_external_document_id` y `database_unavailable`.

### 6. Transacción y concurrencia
Una sesión por petición (`get_session`). El servicio crea todo y hace un único `commit`; cualquier error hace `rollback`, y por eso un rechazo no deja filas.

Orden de inserción:
1. Firmante, con `INSERT ... ON CONFLICT (identifier) DO NOTHING` y luego `SELECT`, para que dos cargas simultáneas con el mismo CUIL no fallen.
2. `document`.
3. `document_version` v1.
4. Actualización de `document.current_version_id`.
5. `signature_request`.

El `external_document_id` duplicado se detecta antes con un `SELECT`. Como respaldo ante una carrera, se captura el `IntegrityError` del índice `uq_document_external_id_per_system` y se responde el mismo `409`.

### 7. Descarga
Se devuelve una `Response` con el binario, `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="<ascii>"; filename*=UTF-8''<pct-encoded>` (RFC 6266), para que los nombres con tildes lleguen bien.

### 8. Tests de integración con TestClient sobre la transacción revertida
Se sobrescribe `get_session` para que use la sesión del fixture de `tests/integration/conftest.py`, que se revierte al final de cada test. Así los tests HTTP ven los mismos datos que los asserts sobre la base. Los PDF de prueba se generan en el momento con pyHanko: uno válido, uno cifrado y uno truncado.

## Risks / Trade-offs

- **Firmante con otro nombre:** si se carga un CUIL existente con otro nombre, se conserva el original (spec `document-intake`) y la carga no informa la diferencia. → Se registra como mejora para el panel: mostrar el nombre guardado.
- **Memoria por carga:** base64 en JSON infla el cuerpo un 33 % y todo el binario pasa por memoria. → El límite de 10 MB lo acota. Si crece, se puede pasar a multipart también para integradores.
- **Token en el fragmento:** si el integrador recorta el fragmento al embeber la URL, el widget no tendrá credencial. → Documentar en el readme que la `signing_url` se usa entera.
- **Proveedor `token` aceptado antes de que exista el hito 2:** una solicitud `token` queda `pending` hasta que exista `prepare`. → Es coherente con la spec, que solo excluye `firmar`, y evita un cambio de contrato en el hito 2.
- **Sin contradicciones con `CLAUDE.md`:** no se reabre ninguna decisión cerrada.

## Migration Plan

No hay migraciones de base. Para desplegar alcanza con actualizar el código e instalar `python-multipart`. Para revertir, se revierte el commit: el esquema no cambia.
