# C4 — Nivel código (referencia)

En C4, el nivel **Code** suele mostrarse solo donde aporta. En Firmadoc basta un mapa de **carpetas canónicas** (detalle en [readme §2.3](../../readme.md#23-descripción-de-alto-nivel-del-proyecto-y-estructura-de-ficheros)).

## Backend (`backend/app/`)

| Ruta | Rol |
|---|---|
| `main.py` | Fábrica `create_app`, CORS, routers |
| `api/` | Adaptadores HTTP finos |
| `services/` | Casos de uso y transacciones |
| `providers/` | Adaptadores de firma (`local`, futuro `token`) |
| `models/` + `schemas/` | Persistencia SQLAlchemy y Pydantic |
| `core/` | Configuración, auth, errores `AppError` |

## Tests

| Ruta | Rol |
|---|---|
| `tests/unit/` | Sin base de datos |
| `tests/integration/` | PostgreSQL `firmadoc_test`, fixture `client` |

## Contratos

- Rutas y schemas: **`docs/openapi.yaml`** (no duplicar en código sin sincronizar).

Para profundizar en una clase concreta, usar el IDE o los tests de integración del ticket correspondiente; no se mantiene un diagrama UML por clase en el repo.