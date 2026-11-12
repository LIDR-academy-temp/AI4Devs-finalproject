# Instalación local de Weather Track

Lleva la aplicación desde el repositorio de GitHub hasta tu computadora. Con datos de demostración no hacen falta credenciales ni conocimientos de programación: alcanza con copiar los comandos.

## Qué necesitás

| Requisito | Detalle |
|---|---|
| **Git** | [Descargar](https://git-scm.com/downloads) |
| **Docker con Docker Compose** | [Docker Desktop](https://www.docker.com/products/docker-desktop/) en Windows y macOS, o [Docker Engine](https://docs.docker.com/engine/install/) en Linux. Debe estar abierto antes de empezar |
| **Espacio y memoria** | Unos 5 GB de disco y 4 GB de memoria libres |
| **Puerto 8080 libre** | Si está ocupado, ver [Problemas frecuentes](#problemas-frecuentes) |

## 1. Instalar con datos de demostración

Abrí una terminal (PowerShell en Windows) y ejecutá estos comandos, de a uno:

```bash
git clone -b feature/entrega-2-PDN https://github.com/dinannopabloguillermo/AI4Devs-finalproject-temp.git weather-track
```

```bash
cd weather-track
```

```bash
cp .env.example .env
```

```bash
docker compose up --build -d --wait
```

La primera vez tarda varios minutos, porque descarga y construye todo. Termina cuando vuelve la línea de comandos.

Cargá la estación y el usuario de demostración:

```bash
docker compose exec api python -m app.semillas
```

Ese comando muestra el correo y la clave. **La clave aparece una sola vez:** copiala.

## 2. Usar la aplicación

Abrí <http://localhost:8080> e ingresá con esos datos. También podés crear tu propia cuenta desde **Crear una cuenta**: el correo de confirmación llega a Mailpit, en <http://localhost:8025>.

La aplicación solo responde en tu computadora: no queda expuesta a otros equipos de tu red, porque en local no usa HTTPS.

1. **Decisión:** el estado de aplicación, sus motivos y las condiciones actuales. Se actualiza sola cada minuto.
2. **Detalle de sensor:** tocá una tarjeta para ver el gráfico y el resumen del último día, la semana o el mes, o elegí las fechas en el calendario.
3. **Mi cuenta:** en el encabezado. Corregí tus datos, cambiá la contraseña o date de baja, que borra la cuenta con todos sus datos.

Los históricos ficticios se cargan en segundo plano y pueden tardar un par de minutos en aparecer completos. La documentación de la API está en <http://localhost:8080/api/docs>.

Con estos datos la estación siempre da "Apto". Para ver todos los estados, seguí el [guion de la demostración](../demo/guion-demo.md).

**Correos.** Los correos de las cuentas, como la confirmación o el recupero de la contraseña, no salen a internet: los atrapa Mailpit y se leen en <http://localhost:8025>, solo desde tu computadora. En el servidor se usa un proveedor de correo real.

## 3. Detener, encender y actualizar

Detener, conservando los datos:

```bash
docker compose stop
```

Volver a encender:

```bash
docker compose start
```

Actualizar a una versión nueva:

```bash
git pull
```

```bash
docker compose up --build -d --wait
```

## 4. Usar datos reales de SAT2 (opcional)

Requiere una cuenta de servicio de SAT2.

> **Empezá desde una base vacía.** La base de demostración tiene datos ficticios, y el sistema no arranca en modo real sobre ella para no mezclarlos con los de SAT2 (ver la [sección 5](#5-modos-de-datos)). El siguiente comando **borra todos los datos de esta instalación**, incluidas las cuentas:

```bash
docker compose down -v
```

Las credenciales de SAT2 se cargan de una de dos formas. La recomendada es desde la aplicación, como administrador: quedan cifradas en la base y se cambian sin entrar al servidor ([ADR-0004](../decisions/0004-credenciales-de-sat2.md)).

**1. Generá las claves de cifrado.** El comando no usa la base. `--build` reconstruye antes la imagen del worker, para que tenga este comando aunque la instalación venga de una versión anterior. Muestra dos líneas, `SAT2_CLAVE_PUBLICA=...` y `SAT2_CLAVE_PRIVADA=...`:

```bash
docker compose run --rm --no-deps --build worker python -m app.administracion generar-claves-sat2
```

**2. Editá el archivo `.env`.** Este archivo nunca se sube a GitHub:

| Variable | Valor |
|---|---|
| `SAT2_MODO` | `real` |
| `SAT2_CLAVE_PUBLICA`, `SAT2_CLAVE_PRIVADA` | Las dos líneas del paso anterior. La API recibe solo la pública; la privada la usa solo el worker |
| `nombreDeUsuario`, `clave`, `SAT2_URL_BASE` | Opcional: la cuenta y la dirección de SAT2. Solo se usan mientras nadie cargue la configuración desde la aplicación |

> **Guardá la clave privada.** Sin ella no se puede leer la configuración guardada. Si se pierde, generá un par nuevo, reemplazalo en el `.env` y volvé a cargar las credenciales desde la aplicación.

**3. Levantá el sistema:**

```bash
docker compose up --build -d --wait
```

En modo real, si todavía no hay credenciales ni en la base ni en el `.env`, el worker se detiene y avisa qué falta. Seguí con los pasos siguientes y volvé a levantarlo al final.

Buscá el número de equipo de tu estación. Si todavía no aparece, esperá un minuto y repetí:

```bash
docker compose exec db psql -U weather_track -d weather_track -c "select id_equipo_sat2, nombre from estacion"
```

Creá tu cuenta desde **Crear una cuenta**, en <http://localhost:8080>, y confirmala con el correo que llega a Mailpit. Toda cuenta confirmada ve todas las estaciones. Si preferís crearla sin correo, como administrador, la clave aparece una sola vez:

```bash
docker compose exec api python -m app.administracion crear-usuario --email tu@correo.com --nombre "Tu nombre"
```

**4. Hacete administrador** con el correo de una cuenta ya confirmada:

```bash
docker compose exec api python -m app.administracion hacer-administrador --email tu@correo.com
```

Al volver a ingresar aparece **Administración** en el encabezado. Ahí cargás la dirección, el usuario y la contraseña de SAT2, y confirmás con tu contraseña de Weather Track. La pantalla nunca vuelve a mostrar esos datos: indica quién los cargó y cuándo, y el resultado del último ciclo de ingesta. Cada cambio se avisa por correo a los administradores. Para quitar el rol, `quitar-administrador --email`.

Si el worker se había detenido por falta de credenciales, levantalo de nuevo:

```bash
docker compose up -d --wait
```

A partir de ahí, cada cambio que guardes en **Administración** se usa desde el ciclo siguiente, sin reiniciar. Cuando la pantalla muestre que el último ciclo terminó bien, podés borrar del `.env` `nombreDeUsuario`, `clave` y `SAT2_URL_BASE`.

El sistema consulta SAT2 cada 10 minutos. La carga de los últimos 31 días tarda unos 40 minutos y avanza en segundo plano, con pausas para no sobrecargar a SAT2.

### Saber si SAT2 cambió sus respuestas

Las pruebas usan respuestas reales de SAT2, saneadas y guardadas en `backend/tests/datos_sat2/`. Para saber si SAT2 cambió la forma de sus respuestas, ejecutá cada tanto, con la instalación en modo real:

```bash
docker compose exec -T worker python -m herramientas.capturar_sat2 --comparar
```

Hace unas 13 consultas a SAT2 y no escribe ningún archivo. Si todo sigue igual, dice «Sin diferencias con la forma de referencia.». Si no, lista las claves nuevas, las que ya no llegan y los tipos que cambiaron, con su ruta y nunca con sus valores. En ese caso, conviene volver a capturar las respuestas como explica el [README de esa carpeta](../../backend/tests/datos_sat2/README.md) y revisar que las pruebas sigan pasando.

## Monitoreo

**Estado del sistema.** En **Administración**, el panel «Estado del sistema» muestra cuatro controles que el worker evalúa cada 10 minutos:

| Control | Alerta cuando |
|---|---|
| Datos viejos | La última lectura de una estación tiene más de 30 minutos |
| Ciclos con error | Los últimos 3 ciclos de una estación terminaron con error |
| Disco de la base | Queda menos del 10 % libre |
| Accesos por fuerza bruta | Hay 20 o más ingresos fallidos en 15 minutos, o una dirección bloqueada por superar su límite |

Cada administrador recibe un correo cuando una alerta empieza y otro cuando se normaliza. Mientras sigue abierta, no se repite. En local, los correos llegan a Mailpit.

**Salud de la estación.** Todas las cuentas ven, arriba de la decisión y en el detalle de un sensor, una franja con la hora actual de Argentina, el último intento de ingesta, el último dato de SAT2 y un semáforo:

| Semáforo | Qué significa | Qué revisar |
|---|---|---|
| En vivo | El último ciclo terminó bien hace 20 minutos o menos y el dato tiene 30 minutos o menos | Nada |
| Con demoras | Hay ciclos, pero el último falló o SAT2 no trae datos nuevos hace más de 30 minutos | La conexión con SAT2 y la estación en el campo |
| Caído | No hubo ciclos en más de 20 minutos | Que el worker esté en marcha: `docker compose ps worker` |
| Modo prueba | El modo `prueba` no ejecuta ciclos | Nada |

**Prometheus y Grafana (opcional).** Guardan la historia de las mediciones, muestran un tablero y avisan por correo si el worker deja de publicar métricas durante 5 minutos, que es lo único que la aplicación no puede avisar sola. Para usarlos, agregá al `.env`:

| Variable | Valor |
|---|---|
| `GRAFANA_CLAVE_ADMIN` | La contraseña del usuario `admin` de Grafana. Sin ella, Grafana no arranca |
| `ALERTAS_CORREO` | La dirección que recibe el aviso de worker detenido |
| `PUERTO_GRAFANA` | Opcional, si el 3000 está ocupado |

y levantá la pila con el perfil:

```bash
docker compose --profile monitoreo up -d --wait
```

El tablero «Weather Track» queda en <http://localhost:3000>, solo desde esta computadora. Para detener todo, incluidos Prometheus y Grafana, usá `docker compose --profile monitoreo stop`.

> En Windows, Grafana no detecta los cambios en los archivos del tablero. Si los editás, reinicialo con `docker compose restart grafana`.

## 5. Modos de datos

`SAT2_MODO`, en el `.env`, elige de dónde salen los datos:

| Modo | Para qué | Datos |
|---|---|---|
| `simulado` | Probar y evaluar sin cuenta de SAT2. Es el modo por defecto | Ficticios, con el nombre de la estación real y el aviso "Datos simulados" |
| `real` | Usar la aplicación con la estación | Los de SAT2 |
| `prueba` | Ver el selector con dos casos: "Caso de prueba - 1", con los datos ya guardados, y "Caso de prueba - 2", sin lecturas | No consulta SAT2 ni agrega lecturas. Si la base está vacía, carga una vez los datos simulados |

**Los datos reales y los ficticios nunca se mezclan.** La base recuerda con qué modo se llenó por primera vez. Si después arrancás con un modo que no corresponde, el worker y la API se detienen y explican qué hacer, sin modificar nada. Pasar de `simulado` a `prueba` está permitido, porque los dos usan datos ficticios.

### Probar con los datos reales sin tocar la instalación

Para ver los datos reales en "Caso de prueba - 1", el modo de prueba usa una copia de la base en otro proyecto de Docker Compose. De la base real solo se lee. Hace falta Python 3 en la computadora.

Con la base real en marcha (`docker compose start db`, si estaba detenida):

```bash
python backend/herramientas/preparar_copia_de_prueba.py
```

La copia queda en <http://localhost:8089> y se ingresa con las mismas cuentas. **Contiene datos personales:** borrala al terminar.

```bash
docker compose -p wt-prueba down -v
```

## 6. Desinstalar

Borra los contenedores y **todos los datos**:

```bash
docker compose down -v --rmi local
```

Después podés borrar la carpeta `weather-track`.

## Problemas frecuentes

| Síntoma | Qué hacer |
|---|---|
| `Cannot connect to the Docker daemon` o `failed to connect to the docker API` | Docker no está abierto. Abrí Docker Desktop y esperá a que indique que está en ejecución |
| `port is already allocated` o `address already in use` | Otro programa usa el 8080. Agregá `PUERTO_WEB=8090` al `.env`, repetí `docker compose up -d --wait` y entrá por <http://localhost:8090> |
| Lo mismo con el puerto 8025 | Otro programa usa el puerto de Mailpit. Agregá `PUERTO_CORREO=8035` al `.env` y leé los correos en <http://localhost:8035> |
| `cp` no se reconoce (solo en `cmd`) | Usá `copy .env.example .env`, o abrí PowerShell |
| Perdiste la clave de la demostración | `docker compose exec api python -m app.administracion restablecer-clave --email demo@weathertrack.example` |
| Demasiados intentos al ingresar | Tras 5 errores el acceso se bloquea 15 minutos. Hay que esperar |
| "Datos insuficientes" al usar datos reales | Es esperable hasta el primer ciclo. Si sigue, mirá `docker compose logs worker --tail 30`: los registros nunca muestran la clave |
| El comando de las semillas termina con un error justo después de levantar | El sistema todavía estaba creando las estaciones. Repetilo: no duplica nada |
| Un servicio no arranca | Revisá `docker compose ps` y `docker compose logs --tail 50` |
| **Administración** dice que falta configurar el servidor | Falta `SAT2_CLAVE_PUBLICA` en el `.env`. Generá las claves (sección 4, paso 1) y reiniciá la pila |
| El último ciclo terminó con error y el registro del worker menciona `SAT2_CLAVE_PRIVADA` | La clave privada falta o no corresponde a la pública con que se guardó la configuración. Si se perdió, generá un par nuevo, reiniciá la pila y volvé a cargar las credenciales en **Administración** |
| El worker o la API dicen que la base tiene datos de otra naturaleza | Cambiaste `SAT2_MODO` sobre una base llenada con otro modo. Volvé al modo anterior, o usá una base nueva: otro proyecto con `docker compose -p <nombre>` o la [copia de prueba](#probar-con-los-datos-reales-sin-tocar-la-instalación) |

## Probado en

Windows 11 con Docker Desktop, incluido un clon con finales de línea de Windows (`core.autocrlf=true`). macOS y Linux usan las mismas imágenes, pero todavía no se probaron.
