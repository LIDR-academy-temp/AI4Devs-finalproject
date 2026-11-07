# Design

## Context

- El repositorio de entrega es público, en GitHub, con Actions habilitado y sin costo. Las ramas de trabajo se suben a `feature/entrega-2-PDN`, y `main` recibe los pull requests.
- Las pruebas existentes ya corren sin credenciales de SAT2: los modos `simulado` y `prueba` reemplazan a la fuente real.
- La E2E y las pruebas negativas levantan proyectos de Compose aislados (`wt-e2e`, `wt-seg`) y los borran al terminar.
- `tests/conftest.py` saltea las pruebas de base si PostgreSQL no responde. En una computadora es cómodo; en un pipeline daría verde sin probar nada.
- El backend no tiene linter. El frontend usa oxlint.

## Goals / Non-Goals

**Goals:**

- Que ningún cambio llegue a `main` sin pasar las mismas verificaciones que hoy se corren a mano.
- Un pipeline seguro en sí mismo: sin secretos, con permisos mínimos y con las acciones fijadas.
- Tiempos razonables: las verificaciones rápidas avisan en pocos minutos, sin esperar a la E2E.

**Non-Goals:**

- Despliegue continuo, publicación de imágenes en un registro y monitoreo: siguen en las líneas B y C.
- Revisión de pull requests con IA: es el pendiente D5.
- Tests basados en propiedades (D6) y datos con la forma de SAT2 (D7).

## Decisions

### D1. GitHub Actions, en un solo flujo con trabajos en paralelo

Un archivo, `.github/workflows/integracion.yml`, con trabajos independientes: `backend`, `frontend`, `contrato`, `especificaciones`, `secretos`, `dependencias` y `e2e`. Un trabajo separado de pruebas negativas corre solo en los pull requests a `main` y a pedido (`workflow_dispatch`), porque tarda y ocupa los puertos 80 y 443.

- **Por qué Actions:** ya está habilitado, es gratis en repositorios públicos y es lo que anticipa el esquema de la sección 2.4. GitLab CI o un servidor propio sumarían otra plataforma sin ventaja.
- Disparadores: `push` a `main` y a `feature/**`, `pull_request` a `main` y `workflow_dispatch`. Con `concurrency`, un push nuevo cancela la ejecución anterior de la misma rama.

### D2. El pipeline no tiene secretos ni permisos de escritura

- `permissions: contents: read` en todo el flujo.
- Nunca `pull_request_target`: un pull request de un fork no puede ejecutar código con permisos del repositorio.
- Las pruebas usan los modos sin SAT2 y contraseñas generadas en cada ejecución, como hoy. El pipeline nunca recibe `SAT2_URL_BASE` ni credenciales.
- Cada acción de terceros se fija por el SHA completo del commit, con la versión en un comentario. Una etiqueta como `v4` se puede mover; un SHA no.
- `timeout-minutes` en cada trabajo, para que un cuelgue no consuma horas.

### D3. Backend: Ruff, pytest con PostgreSQL y cobertura del dominio

- Python 3.14 y `uv sync --locked`: falla si `uv.lock` no está al día.
- **Ruff** con su conjunto de reglas por defecto. Es el linter estándar de Python, rápido y sin dependencias. Los hallazgos que aparezcan al incorporarlo se corrigen en esta misma tarea.
- PostgreSQL 18 como servicio del trabajo, en el puerto que espera `TEST_DATABASE_URL`.
- Variable `EXIGIR_BASE_PRUEBAS=1`: con ella, `conftest.py` falla en lugar de saltear si la base no responde.
- `pytest --cov=app.dominio --cov-fail-under=100`: el motor del índice mantiene el 100 % que exige el proyecto.

### D4. Frontend y contrato

- Node 24, `npm ci`, oxlint, `tsc -b` y Vitest, y `vite build`.
- **Contrato:** se exporta `openapi.json` desde la API y se regeneran los tipos; si cambia algún archivo versionado, el trabajo falla con el diff. Hoy lo cubre `test_contrato_frontend.py`; en el pipeline se ve el archivo exacto que hay que regenerar.

### D5. E2E con la pila completa

`npm run e2e` ya levanta `wt-e2e` en modo prueba, corre Playwright y lo borra. En el pipeline se instala Chromium con sus dependencias y, si falla, se guardan como artefacto el informe y las trazas de Playwright durante 7 días. Las trazas solo tienen datos ficticios.

### D6. Seguridad en el pipeline

- **Secretos:** Gitleaks sobre todo el historial (`fetch-depth: 0`), con la versión fijada. Complementa, no reemplaza, la revisión antes de cada commit.
- **Dependencias:** `npm audit --audit-level=high` y `pip-audit` sobre las dependencias bloqueadas. Un hallazgo alto o crítico hace fallar el trabajo.
- **Pruebas negativas:** `pruebas_negativas.py`, en los pull requests a `main` y a pedido. Generan sus propias contraseñas y no imprimen claves.

### D7. Especificaciones

`openspec validate --all --strict`, con la versión del CLI fijada (1.14.3, la que se usa hoy). Así una spec mal formada se detecta antes de archivar un cambio.

### D8. Lo que hace el responsable en GitHub

Exigir que los controles pasen antes de fusionar en `main` (regla de protección de rama) es un ajuste del repositorio. Lo hace el responsable desde la configuración de GitHub; la guía queda en el ADR.

## Risks / Trade-offs

- [La E2E tarda unos 6 minutos y puede fallar por tiempos del runner] → Corre en paralelo con lo rápido y guarda las trazas para diagnosticar. No se reintenta en silencio: un fallo intermitente se investiga.
- [Una vulnerabilidad nueva en una dependencia hace fallar un cambio que no la tocó] → Es intencional. Se corrige actualizando la dependencia o, si no hay arreglo, se documenta la excepción con fecha de revisión.
- [Fijar acciones por SHA exige actualizarlas a mano] → Dependabot propone las actualizaciones de las acciones una vez por semana.
- [Ruff puede marcar muchos archivos al incorporarlo] → Se corrigen en el mismo cambio; si alguna regla choca con el estilo del proyecto, se desactiva con su motivo.

## Migration Plan

1. Se agrega el flujo y se sube la rama: la primera ejecución muestra el estado real.
2. Se corrige lo que falle hasta tener todo en verde.
3. El responsable activa la protección de `main` (D8).

Para volver atrás alcanza con borrar el archivo del flujo.

## Open Questions

Ninguna.
