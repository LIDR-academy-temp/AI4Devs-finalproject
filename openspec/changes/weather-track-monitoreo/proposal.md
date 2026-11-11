# Proposal

## Why

La línea C de la hoja de ruta tiene pendiente el monitoreo. Hoy Weather Track no avisa a nadie cuando algo falla:

- `/api/v1/salud` solo comprueba que la base responda.
- Docker sabe si el contenedor del worker sigue vivo, pero no si la ingesta trae datos.
- La pantalla de administración muestra el último ciclo, pero hay que entrar a mirarla.

El 9 de noviembre la instalación del responsable estuvo apagada una semana sin que nada lo advirtiera. Durante ese tiempo la decisión quedó en «datos insuficientes».

El 11 de noviembre de 2026 el responsable eligió:

- **Qué vigilar:** la ingesta y la frescura de los datos, la base de datos y el disco, y los accesos sospechosos.
- **Cómo avisar:** en pantalla y por correo.
- **Herramientas:** Prometheus y Grafana.

## What Changes

- **Controles dentro de la aplicación.** El worker evalúa, en cada ciclo de 10 minutos:
  - **Ingesta:** datos de más de 30 minutos (el umbral de la regla R2) o 3 ciclos fallidos seguidos.
  - **Base de datos y disco:** menos del 10 % libre en el disco de la base.
  - **Accesos sospechosos:** 20 o más ingresos fallidos en 15 minutos, o una dirección IP bloqueada por superar su límite.
- **Avisos en pantalla.** Un panel «Estado del sistema» en Administración muestra los controles en verde o en alerta, el estado del worker y el historial de alertas. Si el worker está caído, la API lo detecta por la falta de ciclos recientes.
- **Avisos por correo.** Cada administrador activo recibe un correo cuando una alerta empieza y otro cuando se normaliza, nunca uno cada 10 minutos.
- **Métricas para Prometheus.** El worker publica las mismas mediciones en `/metrics`, en un puerto interno que nunca se publica.
- **Prometheus y Grafana**, en un perfil opcional de Compose, `monitoreo`:
  - Prometheus guarda la historia de las métricas.
  - Grafana trae un tablero ya armado. Además, avisa por correo si el worker deja de publicar métricas, que es lo único que la aplicación no puede avisar sola, porque los correos los envía el propio worker.
  - Grafana solo escucha en esta computadora.

## Capabilities

### New Capabilities

- `system-monitoring`: los controles de salud, sus avisos en pantalla y por correo, y las métricas para Prometheus y Grafana.

### Modified Capabilities

Ninguna.

## Impact

- **Base de datos:** migración `0006` con la tabla `alerta_sistema`.
- **Backend:**
  - módulo `app/monitoreo` con los controles, las alertas y las métricas;
  - el worker evalúa los controles y publica `/metrics`;
  - ruta `/api/v1/administracion/estado`, invisible para el resto como las otras de administración;
  - correo `ALERTA_SISTEMA`;
  - dependencia nueva `prometheus-client`.
- **Frontend:** panel «Estado del sistema» en Administración.
- **Infraestructura:**
  - el worker monta el volumen de la base en modo solo lectura, para medir el disco;
  - el perfil `monitoreo` suma Prometheus y Grafana, con imágenes de versión fija y configuración versionada en `monitoreo/`;
  - variables nuevas en `.env.example`.
- **Pruebas:** controles y transiciones de alertas, métricas, API, panel, configuración de Compose y tablero; negativas sobre `/metrics` y Grafana.
- **Documentación:** ADR-0005, README, guía de instalación, informe de seguridad y hoja de ruta (línea C).
- El modo `prueba` no evalúa la ingesta, porque no consulta SAT2.
