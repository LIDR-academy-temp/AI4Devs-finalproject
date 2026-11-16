# Firmadoc — contexto para agentes de IA

Servicio de firma digital institucional: un backend con proveedores de firma intercambiables, un widget embebible y un agente local para el token USB. La documentación completa está en `readme.md`; el contrato de la API, en `docs/openapi.yaml`.

## Fuentes de verdad (en este orden)

1. `docs/openapi.yaml`: rutas, esquemas, códigos de estado y errores. No inventes endpoints ni campos; si falta algo, proponé el cambio al contrato antes de programarlo.
2. `readme.md`, secciones 3 (modelo de datos), 5 (historias y criterios Dado/Cuando/Entonces) y 6 (tickets).
3. Este archivo, para stack, comandos y convenciones.

## Alcance actual

- **Hito 1 (MVP):** carga de PDF desde el panel o por API → firma con el proveedor `local` vía `prepare` / `complete` → versión v2 vigente y descargable. Auditoría y webhook con un único intento.
- **Hito 2:** proveedor `token` con Firmadoc Agent y SoftHSM, y validación de confianza.
- **Fuera de alcance:** firma en lote, mock de FirmAR, TSA / B-LT, Web Component, OAuth2, reintentos de webhooks. No los implementes aunque aparezcan en el readme.

## Stack

| Carpeta | Tecnología |
|---|---|
| `backend/` | Python 3.12, FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, pyHanko, pytest |
| `widget/` | React + TypeScript + Vite (se sirve en `signing_url`, embebido por iframe) |
| `frontend/` | Angular 21 + PrimeNG 21 (no usar PrimeNG 22: licencia comercial) |
| `agent/` | Python + python-pkcs11, SoftHSM en desarrollo |
| Base de datos | PostgreSQL 16 en todos los entornos (nunca SQLite) |

## Decisiones cerradas (no reabrir sin preguntar)

- PDF guardados en `document_version.content` (`bytea`), sin object storage.
- `document_version` y `audit_event` son append-only: triggers de PostgreSQL impiden `UPDATE` y `DELETE`.
- El cotejo del CUIL del certificado está desactivado por defecto; se activa con `FIRMADOC_REQUIRE_CUIL_MATCH=true` y devuelve `403`.
- `callback_url` vive en `signature_request`, no en `integrating_system`.
- Las cargas desde el panel piden nombre y CUIL del firmante; toda solicitud tiene un `Signer`.
- Autenticación: `X-API-Key` (integrador, guardada como hash), `Authorization: Bearer` (panel) y `X-Signing-Token` (widget).
- El PIN nunca pasa por el navegador ni por el servidor; la clave del token nunca sale del token.
- PAdES B-B en el MVP; firmas adicionales como actualización incremental.

## Comandos

```bash
docker compose up -d db                       # PostgreSQL 16 (bases firmadoc y firmadoc_test)
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements-dev.txt
alembic upgrade head && python -m app.seed    # esquema + datos demo (idempotente)
alembic check                                 # los modelos no difieren de las migraciones
pytest                                        # tests (los de integración usan firmadoc_test)
uvicorn app.main:create_app --factory --reload   # API en :8000; exige FIRMADOC_SIGNING_LINK_SECRET >= 32 caracteres
```

Pendientes de crear: `widget/` (`npm run dev`, :5173) y `frontend/` (`npm start`, :4200). Actualizá esta sección cuando existan.

## Estructura del backend

- `app/main.py`: `create_app(settings)` (fábrica; los tests la llaman con su propia `Settings`), prefijo `/api/v1`.
- `app/api/`: un router fino por recurso (`health`, `admin`, `signature_requests`, `documents`); traduce la entrada y llama a un servicio.
- `app/services/`: lógica de negocio (`intake` para el alta de solicitudes, `pdf_validation`, `signing_links`, `demo_pki`).
- `app/core/`: configuración, credenciales (`auth.py`: `require_integrator`, `require_admin`, `require_document_reader`) y errores (`AppError` → esquema `Error` del contrato).
- `app/schemas/`: modelos Pydantic de entrada y salida; `app/models/`: entidades SQLAlchemy.
- `tests/unit/` sin base; `tests/integration/` con PostgreSQL y el fixture `client`; PDF de prueba en `tests/fixtures/pdfs.py`.

## Convenciones del backend

- Migraciones escritas a mano y congeladas (no importan modelos); después de cada cambio de modelos, `alembic check` debe dar "No new upgrade operations detected".
- Enums como `VARCHAR` + `CHECK` (no tipos nativos de PostgreSQL), con nombres de constraint según `NAMING_CONVENTION` de `app/models/base.py`.
- Tests de integración: cada test corre en una transacción que se revierte; los errores esperados de la base se prueban dentro de `session.begin_nested()`. Los datos que un test necesita después de una petición que falla se confirman con `session.commit()` en el fixture (el `rollback` del servicio solo deshace hasta el último commit).
- Errores: lanzá `AppError(status, code, message, details)`; nunca devuelvas `HTTPException` con otro formato. Un recurso de otro integrador responde `404`, no `403`.
- Una petición, una transacción: el servicio hace un único `commit` y `rollback` ante cualquier error.

## Forma de trabajo

- **Un ticket por vez** (ver sección 6 del readme). No mezcles cambios de otro ticket en el mismo commit.
- **Tests primero:** escribí los tests a partir de los criterios de aceptación, empezando por los casos de rechazo, mostralos para revisión y después implementá.
- Verificá los PDF firmados con `pdfsig`, no solo con pyHanko.
- Commits convencionales (`feat`, `fix`, `test`, `docs`, `chore`, `refactor`), en español.
- Nunca subas secretos: las variables nuevas van a `.env.example` con valores vacíos o de demostración.
- Al terminar un ticket, agregá a `prompts.md` el prompt clave y los ajustes humanos.
