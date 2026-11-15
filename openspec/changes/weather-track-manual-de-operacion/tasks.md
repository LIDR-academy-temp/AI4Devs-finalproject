# Tasks

## 1. Prueba del manual (D4)

- [x] 1.1 Escribir primero `backend/tests/test_manual_operacion.py`. Comprueba que existan `docs/clientes/README.md` y los ocho capítulos, que el manual mencione cada valor de `TIPOS_ALERTA`, cada estado del semáforo, el aviso de worker detenido y cada comando de administración, y que cada enlace relativo y cada imagen existan. Verificación: falla y nombra lo que falta

## 2. Capítulos del manual (D1, D2 y D6)

- [x] 2.1 Portada y capítulo 1, puesta en marcha: lista para el primer día con enlaces a la guía de instalación, y cómo comprobar que todo funciona (semáforo «En vivo» y «Estado del sistema» sin alertas)
- [x] 2.2 Capítulo 2, lo que ven los usuarios: estados de la decisión, motivos, semáforo de salud, históricos, «Mi cuenta» y bajas, para responder consultas
- [x] 2.3 Capítulo 3, cuentas y administradores: cada comando de administración con un ejemplo ficticio, la exportación de la base de clientes y la limpieza de cuentas sin confirmar
- [x] 2.4 Capítulo 4, SAT2 y sus claves: cargar y cambiar las credenciales en «Administración», qué pasa si se pierde la clave privada y cómo saber si SAT2 cambió sus respuestas
- [x] 2.5 Capítulo 5, monitoreo y avisos: una entrada por alerta, por color del semáforo y por el aviso de Grafana, con qué significa, causas, qué revisar y cómo se normaliza
- [x] 2.6 Capítulo 8, seguridad a cargo del operador, problemas frecuentes y glosario. Verificación de los capítulos 1 a 5 y 8: la prueba de la tarea 1.1 pasa en lo que corresponde a ellos

## 3. Respaldo, restauración y actualización (D3)

- [x] 3.1 Probar en el proyecto aislado `wt-doc`, en modo prueba: respaldar, borrar el proyecto con `down -v`, levantarlo vacío, restaurar y comprobar que vuelvan las cuentas, las lecturas y la configuración cifrada, y que el worker siga. Registrar los resultados (15 de noviembre: las dos situaciones, instalación vacía y con cambios posteriores, quedaron iguales al respaldo y la configuración se descifró. La prueba corrió desde una copia del repositorio sin `.env`, porque el worker lee `.env` con `env_file` aunque Compose reciba `--env-file`)
- [x] 3.2 Escribir los capítulos 6 y 7 con los comandos probados, el respaldo del `.env` por separado y el ensayo de la restauración con `-p`. Agregar `respaldos/` a `.gitignore`. Verificación: `git check-ignore respaldos/x.dump` lo confirma

## 4. Capturas (D5)

- [x] 4.1 Tomar en `wt-doc`, con datos ficticios (D5), las pantallas que cambiaron (decisión con la salud de la estación, detalle de un sensor, Administración, «Mi cuenta» y el móvil). Revisar que no tengan datos reales y reemplazarlas en `docs/capturas/`. Verificación: la prueba de imágenes pasa y la revisión visual no encuentra datos reales. Después, `down -v` de `wt-doc` (15 de noviembre: ocho capturas, revisadas una por una; `wt-doc` levantado con `ARCHIVO_ENV=.env.example` y borrado al terminar)

## 5. Integración y aprobación

- [x] 5.1 Enlazar el manual desde el README y la guía de instalación, actualizar las capturas del README, la sección de pruebas y la hoja de ruta. Verificación: `uv run pytest`, `npm test` y `openspec validate --all --strict` pasan
- [ ] 5.2 El responsable lee el manual, ensaya un respaldo en su instalación y aprueba el cambio

## Workflow follow-up

- Archivar el cambio, regenerar la guía de las especificaciones y marcar la línea C como terminada en la hoja de ruta.
