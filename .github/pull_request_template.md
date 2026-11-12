## Tarea de OpenSpec

<!-- Cambio y tarea que implementa este pull request, por ejemplo: weather-track-estaciones, tareas 4.1 a 4.4. -->

- Cambio: `openspec/changes/<cambio>/`
- Tareas:

## Qué cambia

<!-- En dos o tres líneas, qué hace distinto el sistema y por qué. -->

## Verificación

<!-- Qué se ejecutó y con qué resultado. Las verificaciones con Docker usan un proyecto aislado (-p) y el modo simulado. -->

- [ ] Backend: `uv run ruff check` y `uv run pytest`
- [ ] Frontend: `npm test`, `npm run lint` y `npm run build`
- [ ] Extremo a extremo: `npm run e2e`, si cambia un flujo de pantalla
- [ ] Otra verificación que pide la tarea:

## Lista de control

- [ ] Las pruebas cubren el cambio, incluidos los límites "menor o igual" y "mayor que".
- [ ] Si cambió la API, regeneré `frontend/openapi.json` y `frontend/src/servicios/api-tipos.ts`.
- [ ] Si cambió el modelo de datos, agregué una migración con `upgrade` y `downgrade`.
- [ ] Si cambió una especificación, regeneré `docs/especificaciones/README.md`.
- [ ] Actualicé la documentación y marqué las tareas en `tasks.md`.
- [ ] No entran `.env`, `privado/`, credenciales, tokens ni la URL de SAT2.
- [ ] Atendí los comentarios de Copilot o dejé el motivo para descartarlos.
