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
docker compose up -d db                       # PostgreSQL
cd backend && pip install -r requirements.txt
alembic upgrade head && python -m app.seed    # esquema + datos demo
uvicorn app.main:app --reload                 # API en :8000
pytest                                        # tests del backend
cd widget && npm install && npm run dev       # widget en :5173
cd frontend && npm install && npm start       # panel en :4200
```

Actualizá esta sección cuando los comandos reales cambien.

## Forma de trabajo

- **Un ticket por vez** (ver sección 6 del readme). No mezcles cambios de otro ticket en el mismo commit.
- **Tests primero:** escribí los tests a partir de los criterios de aceptación, empezando por los casos de rechazo, mostralos para revisión y después implementá.
- Verificá los PDF firmados con `pdfsig`, no solo con pyHanko.
- Commits convencionales (`feat`, `fix`, `test`, `docs`, `chore`, `refactor`), en español.
- Nunca subas secretos: las variables nuevas van a `.env.example` con valores vacíos o de demostración.
- Al terminar un ticket, agregá a `prompts.md` el prompt clave y los ajustes humanos.
