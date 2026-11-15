# 7. Actualización

[← Volver al índice](README.md)

Una versión nueva de Weather Track se instala con dos comandos. Los cambios de la base se aplican solos al levantar los servicios. Igual, conviene preparar la vuelta atrás antes de empezar.

## Antes de actualizar

1. **Hacé un respaldo** ([capítulo 6](06-respaldo-y-restauracion.md#hacer-un-respaldo)). Es la vuelta atrás si algo sale mal.
2. **Anotá la versión que tenés.** El comando muestra un código corto, por ejemplo `a8f483a`:

   ```bash
   git rev-parse --short HEAD
   ```

3. **Elegí un momento tranquilo.** Durante la actualización, la aplicación deja de responder uno o dos minutos. Los datos de ese rato se recuperan solos después.

## Actualizar

Desde la carpeta `weather-track`:

```bash
git pull
```

```bash
docker compose up --build -d --wait
```

Si usás Prometheus y Grafana, agregá el perfil al segundo comando:

```bash
docker compose --profile monitoreo up --build -d --wait
```

## Comprobar

Igual que el primer día ([capítulo 1](01-puesta-en-marcha.md#cómo-saber-que-todo-funciona)): el semáforo en «En vivo», los controles del «Estado del sistema» en verde y todos los servicios encendidos.

```bash
docker compose ps
```

## Si algo sale mal

Si un servicio no arranca, mirá primero su registro:

```bash
docker compose logs --tail 50
```

Si no se resuelve, volvé a la versión anterior con el código que anotaste. Reemplazá `a8f483a` por el tuyo:

```bash
git checkout a8f483a
```

Como la versión nueva pudo cambiar la base, restaurá también el respaldo que hiciste antes de actualizar ([capítulo 6](06-respaldo-y-restauracion.md#restaurar-un-respaldo)), y después levantá los servicios:

```bash
docker compose up --build -d --wait
```

Avisale a quien mantiene Weather Track qué pasó, con el registro del servicio que falló. Cuando haya una versión corregida, volvé a la rama para actualizar:

```bash
git switch -
```

## Qué no hace falta hacer

- **Ejecutar migraciones a mano:** el servicio `migraciones` las aplica solo al levantar.
- **Volver a cargar las credenciales de SAT2:** se conservan en la base.
- **Borrar la base:** nunca uses `docker compose down -v` para actualizar.
