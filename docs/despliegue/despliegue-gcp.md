# Despliegue en Google Cloud Platform

> **En pausa.** Esta guía todavía no se ejecutó en Google Cloud. Se retomará al terminar la instalación local; lo que falta revisar y hacer está en la [hoja de ruta](../plan/hoja-de-ruta-entrega-final.md#3-línea-b-despliegue-público-en-google-cloud-en-pausa). La configuración de producción y los comandos dentro del servidor se probaron localmente, con datos simulados y certificado interno. Los comandos `gcloud`, el certificado real y la conexión con SAT2 desde la nube están sin probar.

Publica Weather Track en internet con HTTPS y un dominio propio, en una máquina virtual de Compute Engine. La [decisión](../decisions/0002-proveedor-del-servidor.md) está en su ADR. Para usarla solo en una computadora, alcanza con la [instalación local](instalacion-local.md).

**Costo.** Del orden de 25 USD por mes sin impuestos (estimación; ver el ADR). El crédito de prueba de Google, de 300 USD por 90 días, lo cubre. **Al terminar la prueba, Google detiene los recursos** salvo que se pase a una cuenta paga.

Las credenciales de SAT2 solo se escriben en el archivo `.env` de la máquina virtual y nunca se versionan.

## 1. Crear el proyecto

Los comandos de esta sección y de la siguiente usan `bash`. Se pueden ejecutar en [Cloud Shell](https://shell.cloud.google.com), sin instalar nada.

Crear una cuenta de facturación en la [consola](https://console.cloud.google.com/billing) y, en esa misma página, una **alerta de presupuesto** para detectar un gasto inesperado. Luego:

```bash
gcloud billing accounts list
```

```bash
PROYECTO=weather-track-prod
FACTURACION=ID_DE_LA_CUENTA
REGION=southamerica-west1
ZONA=southamerica-west1-a
```

El nombre del proyecto es único en todo Google Cloud. Si ya está tomado, elegir otro.

```bash
gcloud projects create "$PROYECTO" --name="Weather Track"
gcloud billing projects link "$PROYECTO" --billing-account="$FACTURACION"
gcloud config set project "$PROYECTO"
gcloud services enable compute.googleapis.com
```

## 2. Crear la máquina virtual

IP fija, para que el dominio no cambie:

```bash
gcloud compute addresses create weather-track-ip --region="$REGION"
gcloud compute addresses describe weather-track-ip --region="$REGION" --format="value(address)"
```

Firewall, solo para la web. La red por defecto ya permite SSH:

```bash
gcloud compute firewall-rules create weather-track-web --allow=tcp:80,tcp:443,udp:443 --target-tags=weather-track
```

Máquina virtual:

```bash
gcloud compute instances create weather-track --zone="$ZONA" --machine-type=e2-small --image-family=ubuntu-2404-lts-amd64 --image-project=ubuntu-os-cloud --boot-disk-size=30GB --boot-disk-type=pd-balanced --address=weather-track-ip --tags=weather-track
```

Copias diarias del disco, conservadas 7 días:

```bash
gcloud compute resource-policies create snapshot-schedule weather-track-diario --region="$REGION" --max-retention-days=7 --daily-schedule --start-time=06:00
gcloud compute disks add-resource-policies weather-track --zone="$ZONA" --resource-policies=weather-track-diario
```

## 3. Apuntar el dominio

Donde se administra el DNS, crear un registro `A` para el subdominio con la IP fija. **En Cloudflare, dejarlo como "DNS only" (nube gris):** Caddy obtiene su propio certificado y así no hay dos capas de HTTPS.

| Tipo | Nombre | Valor | Proxy |
|---|---|---|---|
| A | `weathertrack` | La IP fija | DNS only |

Crear un subdominio no afecta al sitio que ya esté en el dominio principal.

Comprobar que responde con la IP fija antes de seguir, porque Caddy pide el certificado al arrancar:

```bash
nslookup weathertrack.ejemplo.com 8.8.8.8
```

## 4. Instalar en la máquina virtual

Entrar:

```bash
gcloud compute ssh weather-track --zone="$ZONA"
```

Todo lo que sigue se ejecuta **dentro de la máquina virtual**.

Agregar memoria de intercambio, para que la compilación de las imágenes no agote los 2 GB:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Instalar Docker. Después hay que salir con `exit` y volver a entrar:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

Obtener el código:

```bash
git clone -b feature/entrega-2-PDN https://github.com/dinannopabloguillermo/AI4Devs-finalproject-temp.git weather-track
cd weather-track
cp .env.example .env
chmod 600 .env
openssl rand -hex 32
```

Editar `.env` con `nano .env`:

| Variable | Valor |
|---|---|
| `SAT2_MODO` | `real` |
| `nombreDeUsuario`, `clave`, `SAT2_URL_BASE` | Los datos de SAT2 |
| `POSTGRES_PASSWORD` | La salida de `openssl rand -hex 32` |
| `DIRECCION_WEB` | El dominio, sin `https://`. Quitar el `#` de esa línea |
| `COMPOSE_FILE` | Quitar el `#` de esa línea, para que Compose use también la configuración de producción |

Levantar el sistema. La primera vez tarda varios minutos:

```bash
docker compose up --build -d --wait
docker compose ps
```

Todos los servicios deben figurar como `healthy`, salvo `migraciones`, que termina y sale.

## 5. Comprobar la conexión con SAT2

Hacerlo antes de seguir, porque el servidor conecta desde una IP de Google:

```bash
docker compose exec db psql -U weather_track -d weather_track -c "select tipo, resultado, lecturas_guardadas, iniciada_en from ejecucion_ingesta order by id desc limit 5"
```

Debe aparecer una fila `CICLO` con resultado `EXITO` o `PARCIAL`. Si dice `ERROR`, revisar los registros y consultar a TECMES si la IP está permitida:

```bash
docker compose logs worker --tail 30
```

La carga inicial de 31 días avanza sola y tarda unos 40 minutos. Mientras tanto, la aplicación ya funciona.

## 6. Crear las cuentas

Buscar el número de equipo de la estación:

```bash
docker compose exec db psql -U weather_track -d weather_track -c "select id_equipo_sat2, nombre from estacion"
```

Crear la cuenta. La clave aparece una sola vez:

```bash
docker compose exec api python -m app.administracion crear-usuario --email persona@ejemplo.com --nombre "Nombre Apellido"
```

Asignarle la estación:

```bash
docker compose exec api python -m app.administracion asignar-estacion --email persona@ejemplo.com --id-equipo NUMERO
```

No hay registro público: solo entra quien tenga una cuenta creada así. Para que alguien "visite" la aplicación, hay que crearle una cuenta.

## 7. Verificar

1. `https://DOMINIO` abre con candado válido, y `http://DOMINIO` redirige a HTTPS.
2. Se puede ingresar con la cuenta creada y se ve la recomendación de la estación.
3. La hora de medición avanza cada 10 minutos.

## Operación

**Actualizar a una versión nueva.** Las migraciones se aplican solas al arrancar:

```bash
git pull
docker compose up --build -d --wait
```

**Ver registros:**

```bash
docker compose logs -f --tail 50
```

**Detener y volver a encender.** Los datos se conservan. **Nunca usar `docker compose down -v`: borra la base.**

```bash
docker compose stop
```

```bash
docker compose start
```

**Respaldo manual de la base.** Sirve para llevar los datos a otro servidor. Hay que guardarlo fuera de la máquina virtual, porque contiene las cuentas:

```bash
docker compose exec -T db pg_dump -U weather_track -Fc weather_track > respaldo.dump
```

**Restaurar ese respaldo:**

```bash
docker compose stop worker api
```

```bash
docker compose exec -T db pg_restore -U weather_track -d weather_track --clean --if-exists < respaldo.dump
```

```bash
docker compose start api worker
```

**Dar de baja todo y dejar de pagar.** Es irreversible y borra los datos. Se ejecuta fuera de la máquina virtual:

```bash
gcloud projects delete "$PROYECTO"
```

Apagar la máquina con `gcloud compute instances stop` no alcanza: la IP fija y el disco se siguen cobrando.

## Limitaciones conocidas

- El despliegue es manual: el pipeline se decidirá en el proceso final, según el ADR-0001.
- Una sola máquina virtual es un punto único de falla.
- La revisión de seguridad sobre el despliegue es la actividad A14.
- `e2-small` es de núcleo compartido: alcanza para este uso, pero no para cargas sostenidas altas.
