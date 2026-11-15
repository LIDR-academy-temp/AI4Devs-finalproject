# 1. Puesta en marcha

[← Volver al índice](README.md)

Los comandos para instalar están en la [guía de instalación](../despliegue/instalacion-local.md), que es la única fuente: este capítulo te dice en qué orden seguirla y cómo comprobar el resultado.

## Lista para el primer día

1. **Instalá con datos de demostración** ([guía, sección 1](../despliegue/instalacion-local.md#1-instalar-con-datos-de-demostración)). Sirve para conocer las pantallas sin tocar SAT2.
2. **Recorré las pantallas** ([guía, sección 2](../despliegue/instalacion-local.md#2-usar-la-aplicación)) con la ayuda del [capítulo 2](02-lo-que-ven-los-usuarios.md).
3. **Pasá a los datos reales** ([guía, sección 4](../despliegue/instalacion-local.md#4-usar-datos-reales-de-sat2-opcional)). Ese paso empieza desde una base vacía, genera las claves de cifrado, crea tu cuenta y te hace administrador.
4. **Cargá las credenciales de SAT2** en «Administración», como explica el [capítulo 4](04-sat2-y-sus-claves.md).
5. **Guardá una copia del archivo `.env`** en un lugar seguro, fuera de la computadora. Tiene la clave que descifra la configuración de SAT2 ([capítulo 6](06-respaldo-y-restauracion.md#qué-se-respalda)).
6. **Opcional: activá Prometheus y Grafana** ([guía, monitoreo](../despliegue/instalacion-local.md#monitoreo)) si querés un aviso por correo cuando el proceso de ingesta se detenga.
7. **Hacé el primer respaldo** cuando termine la carga inicial ([capítulo 6](06-respaldo-y-restauracion.md)).

## Cómo saber que todo funciona

La carga de los últimos 31 días tarda unos 40 minutos y avanza en segundo plano. Después, comprobá estas cuatro cosas:

| Dónde | Qué tenés que ver |
|---|---|
| La pantalla de la estación | La franja «Salud de la estación» en verde, con el texto «En vivo» |
| La misma franja | El último dato de SAT2 con menos de 30 minutos y el último intento de ingesta «terminó bien» |
| «Administración», panel «Estado del sistema» | Los cuatro controles en verde y el worker activo |
| La terminal | `docker compose ps` muestra todos los servicios en `running` o `healthy` |

Si algo no coincide, buscá el aviso en el [capítulo 5](05-monitoreo-y-avisos.md).

## Encender y apagar

Weather Track funciona mientras Docker esté abierto y sus servicios encendidos. En la instalación local **no arrancan solos** al reiniciar la computadora: abrí Docker Desktop, esperá a que esté en ejecución y, desde la carpeta `weather-track`, encendé los servicios:

```bash
docker compose start
```

Si estuvo apagado varios días, Weather Track recupera solo los datos que faltan, hasta 31 días hacia atrás. Mientras tanto, el semáforo puede mostrar «Con demoras».

Para detenerlo a propósito usá los comandos de la [guía, sección 3](../despliegue/instalacion-local.md#3-detener-encender-y-actualizar). Nunca uses `docker compose down -v` sobre tu instalación: borra todos los datos.
