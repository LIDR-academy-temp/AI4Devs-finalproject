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

Abrí <http://localhost:8080> e ingresá con esos datos.

La aplicación solo responde en tu computadora: no queda expuesta a otros equipos de tu red, porque en local no usa HTTPS.

1. **Decisión:** el estado de aplicación, sus motivos y las condiciones actuales. Se actualiza sola cada minuto.
2. **Detalle de sensor:** tocá una tarjeta para ver el gráfico y el resumen de 7 o 31 días.

Los históricos ficticios se cargan en segundo plano y pueden tardar un par de minutos en aparecer completos. La documentación de la API está en <http://localhost:8080/api/docs>.

Con estos datos la estación siempre da "Apto". Para ver todos los estados, seguí el [guion de la demostración](../demo/guion-demo.md).

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

> **Empezá desde una base vacía.** La base de demostración tiene una estación ficticia que no existe en SAT2, y no conviene mezclar datos ficticios con reales. El siguiente comando **borra todos los datos de esta instalación**, incluidas las cuentas:

```bash
docker compose down -v
```

Editá el archivo `.env` y completá estas variables. Este archivo nunca se sube a GitHub:

| Variable | Valor |
|---|---|
| `SAT2_MODO` | `real` |
| `nombreDeUsuario`, `clave` | La cuenta de SAT2 |
| `SAT2_URL_BASE` | La dirección de la API de SAT2 |

Levantá el sistema:

```bash
docker compose up --build -d --wait
```

Buscá el número de equipo de tu estación. Si todavía no aparece, esperá un minuto y repetí:

```bash
docker compose exec db psql -U weather_track -d weather_track -c "select id_equipo_sat2, nombre from estacion"
```

Creá tu cuenta con tu correo y tu nombre. La clave aparece una sola vez:

```bash
docker compose exec api python -m app.administracion crear-usuario --email tu@correo.com --nombre "Tu nombre"
```

Asignale la estación, reemplazando `NUMERO`:

```bash
docker compose exec api python -m app.administracion asignar-estacion --email tu@correo.com --id-equipo NUMERO
```

El sistema consulta SAT2 cada 10 minutos. La carga de los últimos 31 días tarda unos 40 minutos y avanza en segundo plano, con pausas para no sobrecargar a SAT2.

## 5. Desinstalar

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
| `cp` no se reconoce (solo en `cmd`) | Usá `copy .env.example .env`, o abrí PowerShell |
| Perdiste la clave de la demostración | `docker compose exec api python -m app.administracion restablecer-clave --email demo@weathertrack.example` |
| Demasiados intentos al ingresar | Tras 5 errores el acceso se bloquea 15 minutos. Hay que esperar |
| "Datos insuficientes" al usar datos reales | Es esperable hasta el primer ciclo. Si sigue, mirá `docker compose logs worker --tail 30`: los registros nunca muestran la clave |
| El comando de las semillas termina con un error justo después de levantar | El sistema todavía estaba creando las estaciones. Repetilo: no duplica nada |
| Un servicio no arranca | Revisá `docker compose ps` y `docker compose logs --tail 50` |

## Probado en

Windows 11 con Docker Desktop, incluido un clon con finales de línea de Windows (`core.autocrlf=true`). macOS y Linux usan las mismas imágenes, pero todavía no se probaron.
