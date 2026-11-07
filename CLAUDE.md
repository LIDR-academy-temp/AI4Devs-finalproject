# Weather Track: reglas para el asistente de IA

Weather Track convierte las lecturas de una estación meteorológica en una respuesta a una sola pregunta: ¿puedo aplicar fitosanitarios ahora sin riesgo de deriva? El producto es la decisión, no un tablero de sensores.

Fuentes de verdad, en este orden: las specs de `openspec/`, `readme.md`, los ADR de `docs/decisions/` y `docs/plan/hoja-de-ruta-entrega-final.md`. Si el código y una spec no coinciden, se pregunta antes de cambiar cualquiera de los dos.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Python 3.14, FastAPI, Pydantic, SQLAlchemy 2, Alembic, psycopg, APScheduler, Argon2. Dependencias con `uv` (`backend/uv.lock`) |
| Base de datos | PostgreSQL 18 |
| Frontend | React 19, TypeScript, Vite, React Router, Plotly.js básico. Pruebas con Vitest, Testing Library y Playwright; lint con oxlint |
| Infraestructura | Docker Compose: `db`, `db_pruebas`, `migraciones`, `api`, `worker` y `proxy` (Caddy) |

## Arquitectura

Monolito modular con un worker de una sola instancia ([ADR-0001](docs/decisions/0001-arquitectura-destino-weather-track.md)).

- `backend/app/dominio`: motor del índice TIS, reglas R1 a R4, normalización y vigencia. **No depende de ninguna otra capa**: ni de `api`, ni de `ingesta`, ni de `datos`. Lo verifica `tests/test_arquitectura.py`.
- `backend/app/ingesta`: cliente de SAT2, modos simulados, ciclo de 10 minutos, carga inicial y worker. Es la única capa que habla con SAT2.
- `backend/app/api`: rutas HTTP, sesión y autorización. Solo lee lo que el worker ya validó y guardó.
- `backend/app/datos`: modelos y conexión.
- `frontend/src`: `pantallas`, `componentes`, `servicios` (cliente de la API con tipos generados) y `pruebas`.

## Reglas del dominio

- **Una estación es un equipo de SAT2**, y nada más. Hoy hay una sola, INTA Pergamino, equipo 1 de `RecuperarEquipos`. Nunca se usan estaciones ficticias como casos de prueba ni como permisos.
- Unidades métricas: velocidad en km/h, temperatura en °C, radiación en W/m². Las millas por hora solo aparecen al citar una fuente.
- Los umbrales viven en un único lugar. Por ejemplo, la antigüedad máxima de 30 minutos está en `dominio/vigencia.py`.
- Cada recomendación guarda la versión del método (`TIS-1.1`). Cambiar pesos o cortes exige una versión nueva.
- La regla de vigencia R2 se aplica al leer, no al guardar.
- La bibliografía respalda las variables del índice, no sus pesos ni sus cortes: no presentarlos como validados.

## Forma de trabajo

- **Una tarea por vez.** Cada cambio sale de una tarea de un cambio de OpenSpec (`openspec/changes/<cambio>/tasks.md`). Se implementa esa tarea, se verifica como ella indica y se marca. Si la tarea no está clara o el diseño no alcanza, se pregunta; no se adivina.
- **Primero los tests.** En el dominio, primero los tests parametrizados con los casos de referencia y luego la función. Revisar con cuidado los límites "menor o igual" y "mayor que".
- Cada grupo de tareas incluye sus propios tests y su documentación; no se dejan para el final.
- Si cambia la API, regenerar el contrato y los tipos (ver comandos). La prueba `test_contrato_frontend.py` falla si no se hace.
- Si cambia el modelo de datos, se agrega una migración de Alembic con `upgrade` y `downgrade`.
- Seguir el estilo del código cercano: nombres en castellano, comentarios solo cuando explican un porqué.
- Commits convencionales en castellano, por ejemplo `feat(acceso): ...` o `docs(entrega-2): ...`. **Commit, push y pull requests solo con la aprobación explícita del responsable.**

## Comandos

Base de pruebas, antes de los tests del backend:

```bash
docker compose up -d --wait db_pruebas
```

Backend, desde `backend/`. Si `uv` no está en el `PATH`, usar el del entorno: `.venv/Scripts/uv.exe` en Windows o `.venv/bin/uv` en Linux y macOS.

```bash
uv run ruff check
uv run pytest
uv run pytest --cov=app.dominio --cov-report=term-missing
uv run python -m herramientas.exportar_openapi
```

Las migraciones se aplican solas al levantar la pila, con el servicio `migraciones`. Las pruebas las aplican sobre `db_pruebas`. No ejecutar `alembic` a mano: toma `DATABASE_URL` del entorno y podría apuntar a la base real.

Frontend, desde `frontend/`:

```bash
npm test
npm run lint
npm run build
npm run generar:tipos
npm run e2e
```

`npm run e2e` levanta la pila completa en el proyecto aislado `wt-e2e` y lo borra al terminar.

### Integración continua

`.github/workflows/integracion.yml` corre todo lo anterior en cada push y pull request a `main` ([ADR-0003](docs/decisions/0003-pipeline-de-integracion-continua.md)). No usa secretos: nunca agregar credenciales de SAT2 ni `pull_request_target`. Cada acción va fijada por su SHA. Un falso positivo de Gitleaks se registra en `.gitleaksignore` con su motivo; nunca se desactiva el escaneo.

## Seguridad: reglas que no se rompen

- **Nunca leer, imprimir, copiar ni versionar `.env`** ni ningún `.env.*` salvo `.env.example`. Tiene credenciales reales de SAT2.
- **Nunca poner en el repositorio** la URL de SAT2, credenciales, tokens ni copias de su documentación privada. El repositorio es público.
- `privado/` está en `.gitignore` y nunca se versiona ni se copia a documentos públicos.
- **El asistente no se autentica en SAT2 ni ejecuta el modo real.** Los comandos con datos reales los ejecuta el responsable; el asistente solo lee resultados locales sin secretos.
- **Toda verificación con Docker usa un proyecto aislado:** `docker compose -p <nombre>` en modo simulado. El archivo de Compose fija `name: weather-track`, así que sin `-p` los comandos actúan sobre la instalación real.
- **Nunca ejecutar `docker compose down -v` sobre el proyecto por defecto:** borra el volumen con los datos reales.
- No repetir en el chat claves de demostración ni de pruebas.
- Antes de cada commit, revisar que no entren `.env`, `privado/`, entornos virtuales, `node_modules`, salidas de pruebas ni textos con forma de token.

## Idioma

Todo en castellano: código, documentación, commits y artefactos de OpenSpec. En OpenSpec se conservan en inglés los encabezados estructurales y las palabras SHALL y MUST.
