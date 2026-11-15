# Proposal

## Why

La entrega final pide una aplicación llave en mano, documentada como para un cliente. La línea C de la hoja de ruta tiene pendiente la documentación para clientes.

Hoy la documentación sirve a evaluadores y desarrolladores: el README, los ADR, las specs y una guía de instalación. Quien instala y opera Weather Track en un establecimiento no tiene un lugar que le diga qué hacer el primer día, cada semana y cuando llega un aviso.

Además, hay tareas de operación que no están escritas en ningún lado: el respaldo y la restauración de la base, la actualización a una versión nueva con un respaldo previo, y qué hacer ante cada alerta del monitoreo.

El 13 de noviembre de 2026 el responsable eligió:

- **Lectores:** quien instala y opera.
- **Formato:** Markdown en el repositorio.
- **Capturas:** renovadas en modo prueba, en un proyecto aislado.

## What Changes

- **Manual de operación** en `docs/clientes/`, en castellano y sin jerga de desarrollo, con capítulos para:
  - la puesta en marcha y cómo comprobar que todo funciona;
  - lo que ven los usuarios: la decisión, el semáforo de salud, los motivos y los históricos, para poder responder sus consultas;
  - las cuentas y los administradores, y la exportación de la base de clientes;
  - la configuración de SAT2 y sus claves;
  - el monitoreo, con una guía de qué hacer ante cada aviso y cada color del semáforo;
  - el respaldo y la restauración de la base, comprobados en un proyecto aislado;
  - la actualización a una versión nueva;
  - la seguridad a cargo del operador, problemas frecuentes y un glosario.
- **Capturas nuevas** de las pantallas actuales: salud de la estación, Administración y Mi cuenta. Se toman en modo prueba, en un proyecto aislado y solo con valores ficticios.
- **Un manual que no queda viejo.** Una prueba falla si:
  - el manual no cubre algún tipo de alerta o algún comando de administración;
  - falta algún estado del semáforo;
  - un enlace o una imagen no existe.
- **Enlaces** al manual desde el README y la guía de instalación. La guía de instalación sigue siendo la única fuente de los pasos de instalación, y el manual la enlaza en lugar de copiarla.

## Capabilities

### New Capabilities

- `operations-manual`: manual de operación para quien instala y opera Weather Track, que cubre cada aviso y cada comando de administración y se mantiene al día por pruebas.

### Modified Capabilities

Ninguna.

## Impact

- **Documentación:**
  - nuevos: `docs/clientes/` con el manual y `docs/capturas/` renovadas;
  - se actualizan `readme.md`, `docs/despliegue/instalacion-local.md` y `docs/plan/hoja-de-ruta-entrega-final.md`.
- **Pruebas:** `backend/tests/test_manual_operacion.py`. No cambian el código de la aplicación, la API ni el modelo de datos.
- **Verificación:** el respaldo y la restauración se prueban en un proyecto aislado, `wt-doc`. Nunca se usa el proyecto `weather-track` real.
