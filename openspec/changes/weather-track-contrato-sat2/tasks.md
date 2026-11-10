# Tasks

Las decisiones están en `design.md` (D1 a D5). El asistente nunca consulta SAT2 ni ejecuta el modo real: sus pruebas usan valores ficticios y una SAT2 falsa. La captura y la comparación con SAT2 las ejecuta el responsable.

## 1. Herramienta (D1, D2, D5)

- [x] 1.1 Escribir primero las pruebas de `sanear` (claves sensibles en cualquier nivel, URL, correo y token por valor, tipos conservados, rutas informadas, valores públicos intactos) y de `forma` y la comparación (clave nueva, clave faltante, tipo cambiado, listas); luego implementarlas en `herramientas/capturar_sat2.py`
- [x] 1.2 Agregar a `ClienteSat2Http` el parámetro opcional `observar`, con pruebas de que recibe cada respuesta decodificada, incluida la autenticación, y de que sin él nada cambia
- [x] 1.3 Implementar la línea de comandos con `OrigenSat2`: rechazo fuera del modo real, captura en el archivo de `--salida` en UTF-8, informe de rutas en la terminal y `--comparar`; verificar con una SAT2 falsa que ni el archivo ni la terminal contienen valores sensibles
- [x] 1.4 Crear `backend/tests/datos_sat2/` con un `README.md` sobre el origen, el saneado y cómo volver a capturar con `docker compose cp`

## 2. Respuestas reales (D3, D4)

- [ ] 2.1 El responsable reconstruye su instalación y ejecuta la captura; la prueba de secretos pasa sobre el archivo, el asistente resume qué contiene y el responsable aprueba versionarlo
- [ ] 2.2 Generar `herramientas/forma_sat2.json` y escribir las pruebas de contrato del catálogo, el ciclo y los históricos con las respuestas reales, más la prueba de que la forma versionada coincide
- [ ] 2.3 El responsable ejecuta `--comparar` en su instalación y confirma que no hay diferencias

## 3. Documentación

- [ ] 3.1 Actualizar la guía de instalación (captura y comparación), el README (2.6 y la sección de SAT2), `CLAUDE.md` y la hoja de ruta (D7)
- [ ] 3.2 El responsable revisa el cambio y lo aprueba
