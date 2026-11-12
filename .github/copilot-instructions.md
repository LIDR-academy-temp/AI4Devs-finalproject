# Revisión de código de Weather Track

Weather Track responde una sola pregunta: ¿se puede aplicar fitosanitarios ahora sin riesgo de deriva? Un error en el motor, en la vigencia de los datos o en el acceso a las cuentas puede llevar a una decisión de campo equivocada o exponer datos de clientes. `CLAUDE.md` tiene el stack, la arquitectura y las reglas del proyecto; estas instrucciones dicen cómo revisar.

## Idioma y forma

- Escribir todos los comentarios en castellano.
- Un comentario por problema, sobre la línea concreta. Decir qué falla, en qué caso y cómo corregirlo, con un ejemplo de código si ayuda.
- Indicar la gravedad al principio: **Bloqueante**, **Importante** o **Sugerencia**.
- Si no hay problemas en un archivo, no comentar.

## Qué señalar primero

1. **Seguridad.** Un `.env` o un `.env.*` que no sea `.env.example`; la URL, credenciales o tokens de SAT2; contenido de `privado/`; claves o contraseñas en el código, las pruebas o los registros. El repositorio es público.
2. **Reglas del dominio.** Umbrales repetidos fuera de su único lugar, unidades que no son métricas (km/h, °C, W/m²), pesos o cortes del índice TIS que cambian sin una versión nueva del método, la regla de vigencia R2 aplicada al guardar en lugar de al leer, y estaciones ficticias usadas como casos de prueba o como permisos.
3. **Contrato de la API.** Una ruta, un esquema o un código de error que cambia sin regenerar `frontend/openapi.json` y `frontend/src/servicios/api-tipos.ts`.
4. **Migraciones.** Un cambio en `backend/app/datos/modelos.py` sin una migración nueva de Alembic con `upgrade` y `downgrade`.
5. **Pruebas.** Un cambio de comportamiento sin pruebas, o pruebas que no revisan los límites "menor o igual" y "mayor que".

## Qué no comentar

- Formato e importaciones: los controlan Ruff y oxlint en el pipeline.
- Nombres en castellano: son la convención del proyecto, no un error.
- Preferencias de estilo sin un problema concreto detrás.
- El archivo generado `docs/especificaciones/README.md`: se revisa la especificación de `openspec/specs`, no la guía.

## Contexto que hay que tener en cuenta

- Cada cambio sale de una tarea de OpenSpec (`openspec/changes/<cambio>/tasks.md`). Si el pull request hace más de lo que dice su tarea, señalarlo.
- Las especificaciones de `openspec/specs` mandan. Si el código contradice un requisito, citar el requisito.
- La revisión de Copilot no aprueba ni bloquea: la decisión de fusionar es del responsable, con el pipeline en verde.
