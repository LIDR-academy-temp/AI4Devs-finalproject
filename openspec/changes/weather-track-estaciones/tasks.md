# Tasks

Las decisiones están en `design.md` (D1 a D8). Todo se verifica con Compose aislado (`-p wt-estaciones`); el proyecto real solo se lee.

## 1. Base de especificaciones

- [x] 1.1 Verificar que `weather-track-mvp-nucleo` ya está archivado (tarea 1.1 de `weather-track-registro-cuentas`) y que `openspec validate weather-track-estaciones --strict` pasa sin avisos

## 2. Catálogo y naturaleza de la base (D1, D4)

- [x] 2.1 Crear la migración con `inactiva_desde` y `configuracion_base`, y verificar `upgrade` y `downgrade` sobre una base con datos
- [x] 2.2 Inactivar y reactivar equipos en la sincronización del catálogo, y verificar con pruebas los escenarios de "Sincronización del catálogo", incluida la lista vacía
- [x] 2.3 Implementar el control de naturaleza al arrancar el worker y la API, y verificar con pruebas cada fila de la tabla de D4 y el mensaje de error
- [x] 2.4 Verificar con una prueba que el ciclo y la carga inicial no piden lecturas de una estación inactiva

## 3. Modos (D5, D6, D7)

- [x] 3.1 Renombrar la estación simulada a "INTA Pergamino" con coordenadas públicas aproximadas, y comparar el nombre con la `descripcion` real guardada en la base local, sin leer credenciales
- [x] 3.2 Agregar el campo `modo` a la respuesta de salud y verificar con una prueba que nunca incluye datos de configuración
- [x] 3.3 Implementar el modo `prueba` con sus dos casos y la siembra en base vacía, y verificar con pruebas los escenarios de "Modo de prueba", incluido que no se crea el cliente de SAT2
- [x] 3.4 Escribir `preparar_copia_de_prueba.py` y verificar en proyectos aislados que la copia muestra los datos copiados y que la base de origen no cambia
- [x] 3.5 Documentar los tres modos y la copia de prueba en la instalación local y en el README, y verificar los comandos en un clon limpio

## 4. Situaciones de prueba (D8)

- [ ] 4.1 Crear `fixtures_situaciones` con las nueve situaciones y verificar con pruebas del backend que cada una produce el estado y los motivos esperados
- [ ] 4.2 Pasar las pruebas de extremo a extremo HU1 y HU2 a esas situaciones y verificar que todas pasan
- [ ] 4.3 Pasar las pruebas negativas a esas situaciones y verificar que siguen dando los mismos resultados
- [ ] 4.4 Eliminar el modo `escenarios`, su cliente, su JSON y sus semillas, y verificar que `grep -ri escenarios` solo encuentra el historial de documentos

## 5. API y frontend (D2, D3)

- [ ] 5.1 Agregar `activa` e `inactiva_desde` al listado y a las condiciones actuales, regenerar `openapi.json` y los tipos, y verificar la prueba de contrato
- [ ] 5.2 Crear el selector del encabezado y la redirección de `/`, y verificar con pruebas de componentes los escenarios de "Selección de estación"
- [ ] 5.3 Crear la vista de equipo inactivo con la leyenda y la lista de sensores, y verificar con pruebas de componentes los escenarios de "Equipo inactivo"
- [ ] 5.4 Mostrar los avisos "Datos simulados" y "Modo de prueba", y verificar con pruebas de componentes que no aparecen en modo real
- [ ] 5.5 Agregar a las pruebas de extremo a extremo el selector con dos estaciones y un equipo inactivo, y verificar que pasan

## 6. Documentación

- [ ] 6.1 Actualizar la F2 del README, la guía de la demo y las capturas, y verificar que ningún documento presenta casos de prueba como estaciones

## Workflow follow-up

- Archivar el cambio cuando el responsable apruebe la aplicación local.
