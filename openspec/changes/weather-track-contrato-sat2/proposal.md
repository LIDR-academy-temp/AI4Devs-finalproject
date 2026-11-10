# Proposal

## Why

La devolución de LIDR sobre la Entrega 1 pidió datos de prueba con la forma de las respuestas reales de SAT2 (pendiente D7). Las pruebas usan hoy una SAT2 simulada armada a mano a partir de la documentación (`app/ingesta/datos_simulados`). Si SAT2 cambia un campo, una unidad o un formato de fecha, las pruebas siguen en verde y el problema aparece recién en producción, como datos faltantes.

El 7 de noviembre de 2026 el responsable decidió usar respuestas verdaderas de SAT2. Las captura él, porque el asistente no se autentica en SAT2, y antes de versionarlas se les quitan la URL, las credenciales, los tokens y los datos de la cuenta. Desde el 9 de noviembre la configuración de SAT2 vive cifrada en la base (ADR-0004), así que la captura la usa sin pedir credenciales.

## What Changes

- **Herramienta de captura** (`python -m herramientas.capturar_sat2`), que el responsable ejecuta dentro del worker de su instalación en modo real. Pide a SAT2 la autenticación, los equipos, los instantáneos del equipo 1 y un día completo de históricos de cada sensor, y escribe todo **ya saneado** en un archivo dentro del contenedor, que el responsable copia con `docker compose cp`.
- **Saneado:** reemplaza los valores de las claves sensibles (token, cliente, usuario, clave, serie y correo) y cualquier texto con forma de URL, de correo o de token. Conserva la estructura, los tipos y las lecturas. Informa en la terminal qué rutas reemplazó, sin los valores.
- **Respuestas de referencia versionadas** en `backend/tests/datos_sat2/respuestas.json`, después de que el responsable las revise. La carpeta se crea con este cambio.
- **Pruebas de contrato:** el catálogo, el ciclo y la carga de históricos procesan las respuestas reales sin errores ni sensores sin clasificar. Otra prueba falla si el archivo versionado contiene algo con forma de URL, correo o token.
- **Detección de cambios del proveedor:** la forma de cada respuesta (claves y tipos, sin valores) se guarda en `herramientas/forma_sat2.json`. `capturar_sat2 --comparar` vuelve a pedir las respuestas y lista las diferencias, sin valores. Termina con error si SAT2 cambió.

## Capabilities

### New Capabilities

- `sat2-contract`: respuestas reales de referencia, su saneado y la detección de cambios en las respuestas de SAT2.

### Modified Capabilities

Ninguna.

## Impact

- **Backend:** `herramientas/capturar_sat2.py`, `herramientas/forma_sat2.json` y un parámetro opcional `observar` en `ClienteSat2Http`, que entrega a la herramienta cada respuesta ya decodificada.
- **Pruebas:** saneado, forma y comparación con valores ficticios; contrato con las respuestas reales saneadas. Ninguna prueba consulta SAT2.
- **Documentación:** guía de instalación, README, `CLAUDE.md` y hoja de ruta (D7).
- **A cargo del responsable:** ejecutar la captura en su instalación, revisar el archivo antes de versionarlo y, cada tanto, la comparación.
- Sin cambios en la API, la base de datos ni la interfaz.
