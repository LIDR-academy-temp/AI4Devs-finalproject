# Proposal

## Why

La URL y las credenciales de SAT2 viven hoy en el `.env` del servidor. Cambiarlas exige entrar al servidor, editar el archivo y reiniciar el worker. El responsable pidió el 7 de noviembre de 2026 un administrador de la aplicación que las gestione desde la propia aplicación, que esos datos queden guardados hasta que vuelva a cambiarlos y que el resto de las cuentas no vea esa opción.

Es además la base de D7: la herramienta que capture respuestas reales de SAT2 podrá usar la configuración guardada, sin credenciales en el `.env` del responsable.

## What Changes

- **Rol de administrador.** Solo se otorga desde la línea de comandos del servidor (`python -m app.administracion hacer-administrador`). No hay ninguna forma de volverse administrador desde la web. El administrador entra por la pantalla de ingreso normal.
- **Opción invisible para el resto.** Solo el administrador ve «Administración» en el encabezado. Para cualquier otra cuenta, la pantalla y sus rutas de la API responden como si no existieran (404).
- **Configuración de SAT2 desde la aplicación.** El administrador carga la URL, el usuario y la contraseña de SAT2. Quedan guardados en la base hasta que los reemplace. El worker los toma en el ciclo siguiente, sin reiniciar.
- **Cifrado de una sola vía para la API.** La configuración se guarda cifrada con una clave pública. La API solo puede cifrar; únicamente el worker, con la clave privada, puede leerla. Nunca vuelve al navegador.
- **Protecciones:** el administrador repite su contraseña de Weather Track para guardar; cada cambio envía un aviso por correo a los administradores y queda en un registro, siempre sin los valores.
- **Transición:** mientras no haya una configuración guardada, el worker sigue usando las variables del `.env`. Desde la primera carga manda la de la base.
- **BREAKING para la spec:** el requisito «Protección de credenciales de SAT2» deja de exigir que las credenciales vengan solo del entorno. Sigue prohibiendo que la API pueda leerlas y que aparezcan en el navegador, los registros, el código o los datos de prueba.

## Capabilities

### New Capabilities

- `administration`: el rol de administrador, su invisibilidad para el resto de las cuentas y la gestión de la configuración de SAT2 con sus protecciones.

### Modified Capabilities

- `sat2-ingestion`: origen de la configuración (base con respaldo en el entorno), recarga sin reiniciar y nueva redacción de la protección de credenciales.

## Impact

- **Base de datos:** migración `0004` con la marca de administrador en `usuario`, la tabla de la configuración cifrada y la del registro de cambios.
- **Backend:** módulo de cifrado con PyNaCl (dependencia nueva), comandos de administración, rutas `/api/administracion/sat2`, el campo `es_administrador` en la respuesta de sesión y la lectura de la configuración en el worker.
- **Frontend:** opción y pantalla de administración, con sus pruebas. Contrato y tipos regenerados.
- **Configuración:** dos variables nuevas en `.env.example`, `SAT2_CLAVE_PUBLICA` para la API y `SAT2_CLAVE_PRIVADA` para el worker. Las genera el responsable con un comando.
- **Pruebas:** backend, frontend, extremo a extremo y negativas (una cuenta común recibe 404). Nunca contra SAT2 real.
- **Documentación:** ADR-0004 sobre dónde viven las credenciales de SAT2, README (1.4 y 2.5), guía de instalación, informe de seguridad, `CLAUDE.md` y hoja de ruta (D7).
- **A cargo del responsable:** generar las claves, hacerse administrador, cargar las credenciales reales en la aplicación y comprobar que la ingesta sigue. El asistente nunca carga credenciales reales ni ejecuta el modo real.
