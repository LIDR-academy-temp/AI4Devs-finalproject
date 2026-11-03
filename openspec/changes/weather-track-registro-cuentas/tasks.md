# Tasks

Las decisiones están en `design.md` (D1 a D12) y el comportamiento en las specs de este cambio. Los flujos se verifican con Compose aislado (`-p wt-cuentas`) y en modo `simulado` o `prueba`, nunca sobre el proyecto real.

## 1. Base de especificaciones

- [ ] 1.1 Archivar `weather-track-mvp-nucleo`, dejando su tarea 11.2 registrada en la hoja de ruta, y verificar que `openspec list --specs` muestra `account-access` y `sat2-ingestion`
- [ ] 1.2 Ejecutar `openspec validate weather-track-registro-cuentas --strict` y verificar que pasa sin errores

## 2. Modelo de datos (D2, D3)

- [ ] 2.1 Crear la migración `0002` con las columnas de `usuario` y las tablas `enlace_cuenta`, `correo_saliente` y `limite_ip`, y verificar que `upgrade` y `downgrade` funcionan sobre una base con datos de la `0001`
- [ ] 2.2 Verificar con una prueba de integración que las cuentas existentes quedan confirmadas y que borrar una cuenta borra en cascada sus sesiones y enlaces
- [ ] 2.3 Implementar la emisión y validación de códigos de un solo uso, con su vigencia y la invalidación del anterior, y verificar con pruebas cada fila de la tabla de D3
- [ ] 2.4 Actualizar el modelo de datos de la sección 3 del README y verificar que coincide con la migración

## 3. Correo (D4, D5)

- [ ] 3.1 Implementar la bandeja de salida, las plantillas de texto y HTML con la leyenda de baja y las cabeceras `List-Unsubscribe`, y verificar con pruebas el contenido de cada tipo de correo
- [ ] 3.2 Implementar la tarea de envío del worker con reintentos y borrado del contenido, y verificar con un servidor SMTP de prueba los escenarios de `transactional-email`
- [ ] 3.3 Implementar el límite de 3 correos por tipo y destinatario por hora, y verificar que el cuarto pedido no se encola y recibe la misma respuesta
- [ ] 3.4 Agregar el servicio `correo` (Mailpit) a Compose, publicado solo en `127.0.0.1:8025`, y las variables `SMTP_*` obligatorias en producción, y verificar que la configuración de producción no arranca sin ellas
- [ ] 3.5 Documentar Mailpit en la instalación local y verificar que un correo de prueba aparece en `http://localhost:8025`

## 4. Seguridad común (D8, D9)

- [ ] 4.1 Implementar la política de contraseñas con la lista local de contraseñas comunes, verificar la licencia de la lista y verificar con pruebas los escenarios de "Política de contraseñas"
- [ ] 4.2 Implementar el límite por IP con `X-Forwarded-For` confiado solo desde la red interna, y verificar con pruebas el 429, el `Retry-After` y que otra IP no queda afectada
- [ ] 4.3 Agregar el filtro que oculta `codigo` en el registro de accesos de uvicorn y verificar con una prueba que el valor no aparece
- [ ] 4.4 Agregar una prueba que falle si el servicio `api` de Compose recibe variables de SAT2 o del SMTP, y verificar que falla con una variable de ejemplo

## 5. API de cuentas (D7, D10, D11)

- [ ] 5.1 Implementar registro, confirmación y reenvío de confirmación con respuestas uniformes, y verificar los escenarios de "Registro público", "Registro sin revelar correos existentes" y "Confirmación por correo"
- [ ] 5.2 Exigir cuenta confirmada en el inicio de sesión y responder `CUENTA_SIN_CONFIRMAR`, y verificar los escenarios modificados de "Inicio de sesión con cuenta propia"
- [ ] 5.3 Implementar solicitud de recupero y nueva contraseña, con cierre de sesiones, desbloqueo y aviso, y verificar los escenarios de `account-recovery`
- [ ] 5.4 Implementar "Mi cuenta": consultar y editar datos, cambiar la contraseña y darse de baja, y verificar los escenarios de autogestión, cambio de contraseña y baja desde la aplicación
- [ ] 5.5 Implementar la baja desde el correo y la baja en un clic, y verificar que un `GET` no borra nada y que el `POST` de un clic sí
- [ ] 5.6 Cambiar la autorización a cualquier estación existente, sin asignaciones, y verificar los escenarios de "Autorización por estación" con un identificador inexistente
- [ ] 5.7 Implementar la tarea del worker que borra cuentas sin confirmar vencidas y ventanas de límite vencidas, y verificar el escenario "Plazo vencido"
- [ ] 5.8 Regenerar `openapi.json` y los tipos del frontend, actualizar la sección 4 del README y verificar que la prueba de contrato pasa

## 6. Base de clientes

- [ ] 6.1 Agregar el comando `exportar-clientes` a la administración y verificar que el CSV solo tiene cuentas confirmadas y ningún dato de acceso
- [ ] 6.2 Hacer que `crear-usuario` deje la cuenta confirmada y verificar con una prueba que puede iniciar sesión

## 7. Frontend (D6, D12)

- [ ] 7.1 Crear las pantallas de registro, aviso de correo enviado y confirmación, con el código leído del fragmento y borrado de la barra, y verificar con pruebas de componentes los errores por campo y el aviso genérico
- [ ] 7.2 Crear las pantallas de recupero y nueva contraseña, con la indicación de que el usuario es el correo, y verificar con pruebas de componentes
- [ ] 7.3 Crear "Mi cuenta" y la pantalla de baja con botón de confirmación, y verificar con pruebas de componentes
- [ ] 7.4 Crear las páginas de privacidad y términos con su versión, marcadas como borrador para revisión legal, y verificar que el registro enlaza a ellas
- [ ] 7.5 Agregar el enlace de registro y de recupero en la pantalla de acceso y verificar el escenario "Pantalla de acceso"

## 8. Integración

- [ ] 8.1 Agregar pruebas de extremo a extremo que lean los correos desde Mailpit: registro, confirmación, ingreso, recupero, baja desde el correo y baja desde la aplicación, y verificar que pasan junto con las existentes
- [ ] 8.2 Ampliar las pruebas negativas con enumeración de correos, reutilización de enlaces, límite por IP y baja por `GET`, y verificar que no quedan hallazgos críticos
- [ ] 8.3 Actualizar la revisión de seguridad (R1 resuelto), la guía de la demo, la F1 del README y la hoja de ruta, y verificar que ningún documento dice que no hay registro público
- [ ] 8.4 Levantar la aplicación local en modo `simulado` con una guía corta para el responsable, y verificar con él que la aplicación está como la quiere

## Workflow follow-up

- Archivar el cambio cuando el responsable apruebe la aplicación local.
- Retomar la línea B de la hoja de ruta, incluida la elección del proveedor de correo de producción.
