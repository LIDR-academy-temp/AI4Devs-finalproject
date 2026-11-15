# 6. Respaldo y restauración

[← Volver al índice](README.md)

Un respaldo es una copia de la base en un archivo. Con él recuperás Weather Track si se rompe el disco, si cambiás de computadora o si algo sale mal en una actualización.

Weather Track **no hace respaldos solo**. Son tres comandos y tardan menos de un minuto.

## Qué se respalda

| Qué | Dónde está | Cómo se respalda |
|---|---|---|
| Cuentas, lecturas, recomendaciones, alertas y configuración cifrada de SAT2 | La base de datos | Con los comandos de este capítulo |
| Las claves de cifrado y la configuración de la instalación | El archivo `.env` | **Aparte:** copiá el archivo a un lugar seguro, una vez y cada vez que lo cambies |

Los dos van juntos. Sin la misma `SAT2_CLAVE_PRIVADA` del `.env`, el respaldo trae la configuración de SAT2, pero no se puede leer, y hay que volver a cargar las credenciales ([capítulo 4](04-sat2-y-sus-claves.md#si-se-pierde-la-clave-privada)).

## Cada cuánto

- **Una vez por semana.**
- **Antes de cada actualización** ([capítulo 7](07-actualizacion.md)).
- **Antes de restaurar otro respaldo.**

Conservá al menos los últimos cuatro y guardalos **fuera de la computadora**: un disco externo o una carpeta en la nube con acceso restringido. Un respaldo tiene datos personales de los usuarios y los hashes de sus contraseñas, así que tratalo como un documento confidencial. Pesa poco: unos megabytes.

## Hacer un respaldo

Desde la carpeta `weather-track`, con los servicios encendidos.

La primera vez, creá la carpeta de los respaldos. Git la ignora, así que nunca se sube al repositorio:

```bash
mkdir respaldos
```

1. Generá el respaldo dentro del servicio de la base:

   ```bash
   docker compose exec -T db pg_dump -U weather_track -d weather_track -Fc -f /tmp/respaldo.dump
   ```

2. Copialo a la carpeta, con la fecha en el nombre:

   ```bash
   docker compose cp db:/tmp/respaldo.dump ./respaldos/weather-track-2026-11-15.dump
   ```

3. Borrá la copia temporal:

   ```bash
   docker compose exec -T db rm /tmp/respaldo.dump
   ```

Después, llevá el archivo de `respaldos/` a su lugar seguro.

> El archivo se genera y se copia sin pasar por la pantalla. Si lo guardaras con `>` en PowerShell, quedaría corrupto.

## Restaurar un respaldo

Restaurar **reemplaza todo** lo que hay en la base por el contenido del respaldo. Lo que haya pasado después del respaldo se pierde, salvo las lecturas de los últimos 31 días, que Weather Track vuelve a traer de SAT2.

**Antes de empezar:**

- Si la base todavía funciona, hacé un respaldo nuevo: es tu vuelta atrás.
- El `.env` tiene que ser el mismo con el que se hizo el respaldo, o al menos tener la misma `SAT2_CLAVE_PRIVADA` y el mismo `SAT2_MODO`. Si cambiaste de computadora, copiá primero el `.env` guardado.

Desde la carpeta `weather-track`. En una instalación nueva, hacelo antes de levantar el resto de los servicios por primera vez. Reemplazá el nombre del archivo por el tuyo.

1. Detené la aplicación y el worker, para que nadie escriba mientras tanto:

   ```bash
   docker compose stop api worker
   ```

2. Asegurate de que la base esté encendida:

   ```bash
   docker compose up -d --wait db
   ```

3. Copiá el respaldo al servicio de la base:

   ```bash
   docker compose cp ./respaldos/weather-track-2026-11-15.dump db:/tmp/respaldo.dump
   ```

4. Restauralo:

   ```bash
   docker compose exec -T db pg_restore -U weather_track -d weather_track --clean --if-exists /tmp/respaldo.dump
   ```

5. Borrá la copia temporal:

   ```bash
   docker compose exec -T db rm /tmp/respaldo.dump
   ```

6. Levantá todo:

   ```bash
   docker compose up -d --wait
   ```

En unos minutos, comprobá lo mismo que el primer día ([capítulo 1](01-puesta-en-marcha.md#cómo-saber-que-todo-funciona)). Si el respaldo tenía unos días, el semáforo puede mostrar «Con demoras» mientras Weather Track recupera los datos que faltan.

## Ensayar una restauración

Un respaldo que nunca se restauró no está probado. Una vez por mes, restauralo en una base aparte, que no toca tu instalación. Todos los comandos llevan `-p ensayo`: **no te lo olvides**, porque sin él actuarían sobre tu instalación.

```bash
docker compose -p ensayo up -d --wait db
```

```bash
docker compose -p ensayo cp ./respaldos/weather-track-2026-11-15.dump db:/tmp/respaldo.dump
```

```bash
docker compose -p ensayo exec -T db pg_restore -U weather_track -d weather_track --clean --if-exists /tmp/respaldo.dump
```

Contá las cuentas y las lecturas restauradas:

```bash
docker compose -p ensayo exec -T db psql -U weather_track -d weather_track -c "select (select count(*) from usuario) as cuentas, (select count(*) from observacion) as lecturas"
```

Si los números son razonables, borrá el ensayo:

```bash
docker compose -p ensayo down -v
```

## Si algo sale mal

| Síntoma | Qué hacer |
|---|---|
| `pg_restore` muestra avisos y termina | Si al levantar todo funciona, se pueden ignorar. Si no, repetí la restauración desde el paso 1 |
| `No such file or directory` al copiar | Revisá el nombre y la carpeta del archivo. En `docker compose cp`, el respaldo va primero al restaurar y segundo al respaldar |
| El worker o la aplicación dicen que la base tiene datos de otra naturaleza | El `SAT2_MODO` del `.env` no es el del respaldo. Usá el mismo modo |
| El último ciclo termina con error y el registro del worker menciona `SAT2_CLAVE_PRIVADA` | El `.env` no tiene la clave privada con que se hizo el respaldo. Copiá el `.env` guardado o seguí el [capítulo 4](04-sat2-y-sus-claves.md#si-se-pierde-la-clave-privada) |
| Usás Git Bash en Windows y el respaldo falla con una ruta `C:/…/Temp/respaldo.dump` | Git Bash convierte `/tmp` en una ruta de Windows. Usá PowerShell, o anteponé `MSYS_NO_PATHCONV=1` a cada comando |

## Cómo se comprobó

El 15 de noviembre de 2026 se probaron estos mismos comandos en un proyecto aislado con datos de prueba (47.674 lecturas, una cuenta de administrador y una configuración de SAT2 cifrada con claves descartables):

- **Instalación nueva y vacía:** se restauró el respaldo antes de levantar el resto de los servicios. Volvieron las cuentas, las lecturas, las ejecuciones y la configuración cifrada, que el worker pudo descifrar, y todos los servicios quedaron en marcha.
- **Instalación con cambios posteriores:** se creó una cuenta después del respaldo y se restauró encima. La base volvió exactamente al estado del respaldo y la cuenta nueva desapareció.
