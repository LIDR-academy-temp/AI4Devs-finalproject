# Proposal

## Why

El 15 de noviembre de 2026, al probar el respaldo del manual de operación, apareció un problema de aislamiento. El proceso de ingesta de un proyecto aislado (`docker compose -p <nombre> --env-file .env.example`) igual cargaba el `.env` real. Eso le daba la clave privada de SAT2 y las credenciales de respaldo.

La causa es el `env_file` del servicio `worker` en `docker-compose.yml`. Siempre lee `.env`, y `--env-file` solo cambia las variables que Compose reemplaza en el archivo, no las que recibe el servicio. Está así desde la estructura inicial (A03).

Afecta a toda pila aislada que se levanta desde la carpeta del repositorio:

- las pruebas de extremo a extremo (`wt-e2e`);
- las pruebas negativas (`wt-seg`);
- la copia de prueba con datos reales (`wt-prueba`);
- las verificaciones manuales (`wt-revision`, `wt-mon`).

`SAT2_MODO` siempre lo fijaba la pila, así que esos procesos nunca consultaron SAT2 ni mostraron los valores. Igual, una pila de prueba no debe tener credenciales reales en su entorno. El pipeline no se ve afectado: allí no hay `.env`.

## What Changes

- El `env_file` del worker toma la ruta de una variable, `ARCHIVO_ENV`, que por defecto sigue siendo `.env`. La instalación real no cambia.
- Cada pila aislada fija `ARCHIVO_ENV` con un archivo sin credenciales reales: `.env.example` o el archivo descartable que arma la propia herramienta. Son:
  - las pruebas de extremo a extremo;
  - las pruebas negativas;
  - la copia de prueba;
  - la guía de verificación local.
- Pruebas que fallan si una de esas pilas deja de fijar `ARCHIVO_ENV`, o si el worker vuelve a leer `.env` sin que se pueda cambiar.
- `CLAUDE.md` y las instrucciones de revisión de Copilot suman la regla.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `sat2-ingestion`: un requisito nuevo, «Pilas aisladas sin credenciales reales».

## Impact

- `docker-compose.yml`, `frontend/e2e/pila.ts`, `backend/herramientas/pruebas_negativas.py`, `backend/herramientas/preparar_copia_de_prueba.py` y `docs/demo/verificacion-local.md`.
- Pruebas: `backend/tests/test_configuracion_compose.py` y una prueba nueva de las herramientas de pilas aisladas.
- Reglas: `CLAUDE.md` y `.github/copilot-instructions.md`.
- Sin cambios en la API, el modelo de datos ni la instalación real.
