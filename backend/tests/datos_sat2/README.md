# Respuestas de referencia de SAT2

Respuestas reales de SAT2 para las pruebas de contrato (cambio de OpenSpec `weather-track-contrato-sat2`, pendiente D7 de la hoja de ruta). Las pruebas las usan en lugar de una SAT2 inventada, así detectan si el sistema deja de entender lo que SAT2 envía.

## Qué contiene

`respuestas.json`, cuando se captura, con cuatro respuestas de la estación INTA Pergamino (equipo 1):

| Método de SAT2 | Qué se guarda |
|---|---|
| `AutenticarUsuario` | Solo su forma: el token y el identificador del cliente quedan reemplazados |
| `RecuperarEquipos` | El catálogo de equipos y sensores |
| `RecuperarInstantaneosDeEquipo` | Las lecturas actuales del equipo 1 |
| `RecuperarHistoricosDeEquipoPorSensor` | Un día completo de cada sensor, el anterior a la captura |

## Saneado

La herramienta sanea las respuestas antes de escribirlas, así que nada sensible llega al archivo ni a la terminal:

- Reemplaza los valores de las claves cuyo nombre contiene token, clave, password, usuario, cliente, mail, correo o serie. Los textos quedan como `<redactado>` y los números como `0`.
- Reemplaza también cualquier texto con forma de URL, de correo o de token, aunque esté en otra clave.
- Conserva la estructura, los tipos, los nombres y las unidades de los sensores, las fechas y las lecturas.

La prueba `test_las_respuestas_no_tienen_secretos` vuelve a revisar el archivo, y Gitleaks lo escanea en cada push. Antes de versionarlo, el responsable lo revisa.

## Cómo capturar de nuevo

Lo hace el responsable, en su instalación en modo real y con la configuración de SAT2 ya cargada. El asistente no se autentica en SAT2.

```bash
docker compose up --build -d --wait
docker compose exec -T worker python -m herramientas.capturar_sat2 --salida /tmp/respuestas.json
docker compose cp worker:/tmp/respuestas.json backend/tests/datos_sat2/respuestas.json
```

El archivo se escribe dentro del contenedor y se copia sin cambios. No se redirige la salida con `>`, porque Windows PowerShell 5.1 lo guardaría en UTF-16 y podría alterar los acentos y el símbolo de grados.

Para saber si SAT2 cambió la forma de sus respuestas, sin escribir ningún archivo:

```bash
docker compose exec -T worker python -m herramientas.capturar_sat2 --comparar
```
