# Tasks

Las decisiones están en `design.md` (D1 a D8). Las pruebas usan valores ficticios y el modo `prueba` o `simulado`; las verificaciones con Docker usan un proyecto aislado (`-p wt-admin`). El asistente nunca carga credenciales reales ni ejecuta el modo real.

## 1. Datos y cifrado (D3, D4)

- [x] 1.1 Escribir primero las pruebas del cifrado (ida y vuelta, clave privada equivocada, clave pública ausente, el texto cifrado no contiene los valores) y luego el módulo con PyNaCl; agregar la dependencia con `uv` y verificar que pasa la auditoría de dependencias
- [x] 1.2 Crear la migración `0004` con `es_administrador`, `configuracion_sat2` y `cambio_configuracion_sat2`, y verificar `upgrade` y `downgrade` sobre una base con datos
- [x] 1.3 Agregar `SAT2_CLAVE_PUBLICA` a la API y `SAT2_CLAVE_PRIVADA` al worker en `docker-compose.yml` y en `.env.example`, sin valores, y verificar con una prueba que la API no recibe la clave privada

## 2. Comandos de servidor (D1)

- [x] 2.1 Agregar `hacer-administrador`, `quitar-administrador` y `generar-claves-sat2` a `app/administracion.py`, con pruebas de los escenarios de «Rol de administrador desde el servidor»

## 3. API (D2, D5, D7)

- [x] 3.1 Sumar `es_administrador` a la respuesta de sesión y verificar que la actualización de la cuenta ignora ese campo
- [x] 3.2 Escribir primero las pruebas de `/api/administracion/sat2`: 404 igual a una ruta inexistente sin rol y sin sesión, validación por campo, contraseña incorrecta con conteo para el bloqueo, falta de clave pública, reemplazo, registro y respuesta sin valores; luego implementar las rutas
- [x] 3.3 Agregar el correo `CONFIGURACION_SAT2` a cada administrador activo, con pruebas de que no contiene valores y lleva el enlace de baja
- [x] 3.4 Regenerar el contrato y los tipos del frontend

## 4. Worker (D6)

- [x] 4.1 Escribir primero las pruebas del origen de la configuración (sin fila usa el entorno, con fila usa la base, cambio de `cargada_en` recrea el cliente, sin clave privada no consulta) y luego implementarlo en el ciclo y el catálogo, con un cliente HTTP falso

## 5. Frontend (D2, D5)

- [x] 5.1 Mostrar «Administración» en el encabezado solo con el rol, y mostrar «Esta página no existe.» en `/administracion` sin él
- [x] 5.2 Pantalla de administración: estado de la configuración, origen, último ciclo, registro de cambios y formulario con la contraseña del administrador, la advertencia de `http://` y los errores por campo; con pruebas en Vitest

## 6. Extremo a extremo y seguridad

- [ ] 6.1 Prueba de extremo a extremo en modo prueba: una cuenta común no ve la opción y recibe la página inexistente; el administrador guarda valores ficticios, ve el cambio en el registro y recibe el aviso en Mailpit
- [ ] 6.2 Sumar a `pruebas_negativas.py` las rutas de administración sin sesión y con una cuenta común (404), y la contraseña incorrecta; verificar en el proyecto aislado `wt-seg`

## 7. Documentación

- [ ] 7.1 Escribir el ADR-0004 sobre dónde viven las credenciales de SAT2, y actualizar el README (1.4 y 2.5), la guía de instalación (generar claves, hacerse administrador, pérdida de la clave privada), el informe de seguridad, `CLAUDE.md`, las instrucciones de revisión de la API si hace falta y la hoja de ruta; regenerar la guía de las especificaciones

## 8. Verificación del responsable

- [ ] 8.1 El responsable genera las claves en su `.env`, se hace administrador, carga las credenciales reales en la pantalla y confirma que el ciclo siguiente termina bien; el asistente solo lee el resultado en la pantalla o en la base local, sin valores
- [ ] 8.2 El responsable revisa el cambio y lo aprueba
