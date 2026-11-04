# Proposal

## Why

Hoy solo un administrador puede crear cuentas desde la línea de comandos. Weather Track ofrece a sus clientes los datos que cosecha con un contrato privado de SAT2, y el responsable necesita que cualquier persona pueda inscribirse sola, recuperar el acceso y darse de baja, para formar una base de clientes antes de la entrega final del 9 de diciembre de 2026. La [hoja de ruta](../../../docs/plan/hoja-de-ruta-entrega-final.md) pone esta línea antes del despliegue público.

## What Changes

- **BREAKING:** se elimina el requisito de alta solo administrativa. La pantalla de acceso ofrece registrarse.
- Registro público con confirmación por correo. Cada correo trae un enlace para darse de baja.
- Las cuentas que no se confirman a tiempo y las que se dan de baja **se borran de la base**.
- Recupero de contraseña por correo, con enlaces de un solo uso.
- Página "Mi cuenta": editar datos, cambiar la contraseña y darse de baja.
- **BREAKING:** sin niveles ni clasificación de usuarios, toda cuenta confirmada consulta todas las estaciones. Una estación es un equipo de SAT2, no un permiso, así que deja de usarse la asignación por estación como criterio de acceso.
- Límite de intentos por dirección IP en los flujos públicos. Resuelve el riesgo aceptado R1.
- Envío de correo con una bandeja de salida. En la instalación local los correos se atrapan con Mailpit y no salen a internet.
- Exportación de la base de clientes para el administrador.
- Las credenciales de SAT2 siguen solo en el worker; ningún flujo de cuentas las pide, muestra ni usa.
- Fuera de alcance: niveles de usuario, cambio de correo, segundo factor, inicio con cuentas de terceros y el proveedor de correo de producción, que se elige con el despliegue público.

## Capabilities

### New Capabilities

- `account-lifecycle`: registro, confirmación por correo, baja, borrado de cuentas sin confirmar y autogestión de los datos de la cuenta.
- `account-recovery`: recupero de la contraseña sin revelar qué correos están registrados.
- `transactional-email`: bandeja de salida, envío, enlace de baja en cada correo y captura local.
- `customer-base`: datos y consentimiento registrados en la inscripción, y exportación para el administrador.

### Modified Capabilities

- `account-access`: se elimina "Alta de cuentas sin registro público"; el inicio de sesión exige una cuenta confirmada; la autorización por estación pasa a ser autorización de consultas sobre cualquier estación existente; se agrega el límite por dirección IP.
- `sat2-ingestion`: se agrega como requisito explícito que las credenciales de SAT2 solo lleguen al worker.

Estas capacidades vienen del cambio `weather-track-mvp-nucleo`, que se archivó el 3 de noviembre de 2026 como primera tarea de este cambio; sus especificaciones ya están en `openspec/specs`.

## Impact

- **Datos:** migración `0002` con columnas nuevas en `usuario`, y tablas de enlaces de un solo uso, bandeja de salida y límite por IP. Las cuentas existentes quedan confirmadas.
- **API:** endpoints nuevos bajo `/api/v1/auth` y `/api/v1/cuenta`; cambian el listado de estaciones y el error de estación no asignada. Se regeneran `openapi.json` y los tipos del frontend.
- **Worker:** tareas nuevas para enviar correos y borrar cuentas vencidas.
- **Frontend:** pantallas de registro, confirmación, recupero, nueva contraseña, baja y "Mi cuenta".
- **Infraestructura:** servicio `correo` (Mailpit) en Compose para uso local; variables `SMTP_*` obligatorias en producción.
- **Estaciones:** el modo `escenarios` y su "Estación ajena" se eliminan en `weather-track-estaciones`; este cambio no depende de ellos.
- **Documentación:** README (F1, modelo de datos, API), instalación local, guía de la demo, revisión de seguridad y hoja de ruta.
