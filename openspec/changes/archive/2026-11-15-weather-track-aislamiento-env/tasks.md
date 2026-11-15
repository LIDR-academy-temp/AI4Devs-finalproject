# Tasks

## 1. Compose y sus pruebas (D1 y D3)

- [x] 1.1 Escribir primero las pruebas en `test_configuracion_compose.py`: el worker lee `.env` por defecto y el archivo de `ARCHIVO_ENV` cuando se fija. Más la prueba de las herramientas de pilas aisladas. Verificación: fallan antes del cambio
- [x] 1.2 Cambiar el `env_file` del worker a `${ARCHIVO_ENV:-.env}`. Verificación: las pruebas de Compose pasan

## 2. Pilas aisladas (D2)

- [x] 2.1 Fijar `ARCHIVO_ENV` en `pila.ts`, `pruebas_negativas.py`, `preparar_copia_de_prueba.py` y `docs/demo/verificacion-local.md`. Verificación: la prueba de las herramientas pasa
- [x] 2.2 Comprobar en una pila aislada que el worker no recibe la clave privada ni las credenciales, sin imprimir valores (D4), y correr `npm run e2e`. Verificación: el worker informa «vacía» y pasan las 25 pruebas de extremo a extremo (15 de noviembre: desde la carpeta real, el worker aislado informó vacías la clave privada, el usuario, la clave y la dirección de SAT2. `npm run e2e`: pasan las 25. El DNS del proveedor bloquea `files.pythonhosted.org`, así que esa corrida usó un archivo de Compose temporal, fuera del repositorio, con su dirección real en `extra_hosts`)

## 3. Reglas y aprobación

- [x] 3.1 Sumar la regla a `CLAUDE.md` y `.github/copilot-instructions.md`. La guía de instalación no cambia: su única pila aislada es la copia de prueba, que ya fija `ARCHIVO_ENV` en la herramienta. Verificación: `uv run pytest` y `openspec validate --all --strict` pasan
- [x] 3.2 El responsable revisa el cambio y lo aprueba (15 de noviembre: aprobado, después de la E2E y de las 143 pruebas negativas)

## Workflow follow-up

- Archivar el cambio y regenerar la guía de las especificaciones.
