# Guía de despliegue

Esta guía publica Recon Tool en una URL pública desde un servidor con Docker. Está pensada para quien no lo ha hecho antes: sigue las secciones en orden y no te saltes ninguna. La aplicación solo debe usarse con datos sintéticos.

> **Contrastado el 2026-10-31.** Los pasos del panel de Cloudflare (secciones 5, 6 y 10) se han comprobado en un despliegue real. Cloudflare cambia sus menús con frecuencia: si algo aparece con otro nombre, busca el equivalente y corrige esta guía.

## 1. Qué es cada pieza

- **Contenedor:** un programa empaquetado con todo lo que necesita, aislado del resto del servidor.
- **Imagen:** la plantilla a partir de la que se crea un contenedor.
- **Docker Compose:** la herramienta que arranca varios contenedores juntos, según un archivo de configuración.
- **Volumen:** el espacio de disco donde un contenedor guarda lo que debe sobrevivir. Aunque el contenedor se borre, el volumen sigue ahí.
- **Túnel de Cloudflare:** una conexión que sale del servidor hacia Cloudflare. Las visitas llegan por ella, así que no hay que abrir puertos en el router.
- **Migración:** un cambio en la estructura de la base de datos, guardado en el repositorio. Se aplica con una orden explícita, nunca al arrancar.
- **Seed:** la carga del mundo de datos sintéticos de demostración.

El despliegue tiene cuatro servicios siempre en marcha:

| Servicio | Qué hace | ¿Sale a internet? |
|---|---|---|
| `cloudflared` | Mantiene el túnel | Sí, es el único |
| `web` | Sirve la aplicación y reenvía `/api` a `api` | No |
| `api` | La API, conectada como `recon_app`, que no puede cambiar la estructura de la base | No |
| `mssql` | SQL Server 2022 | No |

Ningún servicio publica puertos en el servidor. `migrate` y `seed` solo se ejecutan cuando se les ordena, con su propia identidad de base de datos, `recon_migrator`. La base del despliegue tiene solo dos usuarios de la aplicación: `recon_app`, para la API, y `recon_migrator`. El usuario de solo lectura `recon_reader` existe solo en local; si un despliegue anterior lo creó, `mssql` lo borra en su siguiente arranque.

## 2. Qué necesitas

- Un servidor Linux de arquitectura x86-64 (la imagen de SQL Server 2022 no existe para ARM), con al menos 2 GB de memoria para SQL Server. Los ejemplos usan Ubuntu.
- Una cuenta de Cloudflare con un dominio propio ya añadido.
- Acceso por SSH al servidor, con permisos de `sudo`.

## 3. Instalar Docker y clonar

Instala Docker Engine con el plugin de Compose, versión 2.24 o superior, y da permiso a tu usuario:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

Cierra la sesión SSH, vuelve a entrar y comprueba la versión:

```bash
docker compose version
```

Clona el repositorio:

```bash
git clone -b feature/entrega-3-MVP https://github.com/kajirioji/AI4Devs-finalproject.git recon-tool
cd recon-tool
```

Todas las órdenes siguientes se ejecutan desde esa carpeta.

## 4. Crear la configuración

```bash
cp infra/.env.deploy.example infra/.env.deploy
chmod 600 infra/.env.deploy
```

`infra/.env.deploy` guarda los secretos. Git lo ignora y nunca debe subirse. Genera un valor distinto para cada contraseña con esta orden, que cumple la política de SQL Server y evita el carácter `$`, que Compose interpretaría:

```bash
echo "Rc1-$(openssl rand -hex 20)"
```

Y el secreto de firma con esta otra:

```bash
openssl rand -hex 32
```

Rellena el archivo con un editor (`nano infra/.env.deploy`):

| Variable | Qué poner |
|---|---|
| `MSSQL_SA_PASSWORD` | Contraseña generada; es la del administrador de SQL Server |
| `RECON_APP_PASSWORD` | Contraseña generada; la usa la API |
| `RECON_MIGRATOR_PASSWORD` | Contraseña generada; la usan `migrate` y `seed` |
| `JWT_SECRET` | El secreto de firma |
| `SEED_PASSWORD` | Contraseña generada; será la de los usuarios de demostración |
| `TUNNEL_TOKEN` | Se rellena en la sección siguiente |

Guarda el archivo en tu gestor de contraseñas: sin backups, es lo único que te da acceso a la base.

**Cambiar una contraseña de base de datos después del primer arranque no basta con editar este archivo:** los usuarios ya existen en SQL Server con la anterior. Hay que cambiarla también dentro con `ALTER LOGIN`.

## 5. Crear el túnel y copiar el token

1. Entra en [one.dash.cloudflare.com](https://one.dash.cloudflare.com) y elige tu cuenta.
2. Abre **Networks** → **Tunnels** y pulsa **Create a tunnel**.
3. Elige **Cloudflared**, ponle un nombre y pulsa **Save tunnel**.
4. La pantalla de instalación muestra un selector de sistema operativo y una orden truncada con un botón de copiar. Elige **Docker** y copia la orden. **No la ejecutes:** toma solo el texto que va después de `--token`, que empieza por `eyJ`, y pégalo como valor de `TUNNEL_TOKEN` en `infra/.env.deploy`.
5. Deja esa pantalla abierta. El botón **Continue** sigue desactivado hasta que el túnel conecta, y eso ocurre en la sección siguiente.

El token permite conectar con tu túnel: trátalo como una contraseña.

## 6. Construir y levantar

```bash
scripts/deploy.sh build
scripts/deploy.sh up --wait
scripts/deploy.sh ps
```

`build` tarda varios minutos la primera vez. Al terminar, `ps` debe mostrar los cuatro servicios como `healthy`. El panel de Cloudflare debe mostrar el túnel como **Healthy**.

Con el túnel conectado, añade la URL pública en el panel:

1. Pulsa **Continue**. Llegarás a la vista del túnel, con las pestañas **Overview**, **Routes** y **Live logs**.
2. Pulsa **Add route** y elige **Published application**.
3. En **Subdomain** y **Domain**, elige la URL pública. **Full hostname** muestra el resultado. Deja **Path** vacío.
4. En **Service URL**, escribe `http://web:8080`. Es el nombre del servicio dentro de Docker, no el del servidor.
5. Guarda la ruta.

La URL ya responde, pero **el login todavía falla**: la base está vacía hasta completar las dos secciones siguientes.

## 7. Migrar

Crea las tablas en la base:

```bash
scripts/deploy.sh migrate
```

Debe terminar con `All migrations have been successfully applied`. Si la repites sin cambios pendientes, dice `No pending migrations to apply` y no cambia nada.

## 8. Sembrar los datos de demostración

```bash
scripts/deploy.sh seed
```

**Esta orden borra todos los datos de la base** y carga el mundo sintético, por eso pide escribir `seed` para continuar. Tarda unos minutos. Ejecútala solo en una instalación nueva o cuando quieras volver a empezar.

## 9. Comprobar

Comprueba el estado de salud sustituyendo el dominio por el tuyo:

```bash
curl https://recon.example.com/api/v1/health
```

Debe responder `{"status":"ok","db":"ok"}`. Después abre la URL en un navegador y entra con el usuario `analyst` y el valor de `SEED_PASSWORD` de `infra/.env.deploy`. No sirve la contraseña de un entorno local: el despliegue no lee el `.env` de la raíz. Si cambias `SEED_PASSWORD`, no surte efecto hasta volver a sembrar. Repite la prueba desde un dispositivo fuera de la red local, por ejemplo un móvil con datos.

## 10. Proteger la entrada (obligatorio)

**Sin estos tres pasos la URL no se da por publicada.**

### Forzar HTTPS

Sin este paso, quien entre por `http://` envía su contraseña sin cifrar hasta Cloudflare. Estos ajustes afectan a todo el dominio: si tienes otros servicios en él que solo funcionan por `http://`, resuélvelo antes.

1. Entra en [dash.cloudflare.com](https://dash.cloudflare.com) y abre tu dominio.
2. Abre **SSL/TLS** → **Edge Certificates**.
3. Activa **Always Use HTTPS**.
4. En **HTTP Strict Transport Security (HSTS)**, pulsa **Enable HSTS** y acepta el aviso.
5. Activa **Enable HSTS**, elige `Max Age` de `1 month`, deja **Include subdomains** y **Preload** desactivados y pulsa **Save**. Los navegadores recuerdan este ajuste durante ese tiempo, así que desactivarlo no surte efecto al momento. Una vez activado, el botón pasa a llamarse **Change HSTS Settings**.

Comprueba que funciona. La primera orden debe mostrar una redirección `301` o `308` hacia `https://`, y la segunda una línea `strict-transport-security`:

```bash
curl -sI http://recon.example.com | grep -iE '^(HTTP|location)'
curl -sI https://recon.example.com | grep -i '^strict-transport-security'
```

### Desactivar Real User Measurements

Si está activo, Cloudflare inserta en la página un script externo de medición, y la política de seguridad de la aplicación lo bloquea. El navegador lo muestra como una violación de CSP.

1. Entra en [dash.cloudflare.com](https://dash.cloudflare.com) y abre tu dominio.
2. Abre **Speed** → **Real user monitoring**.
3. Elige **Disable**. La pantalla debe decir `RUM is currently disabled for this zone`.

Comprueba que funciona. Abre la URL en una ventana de incógnito con las herramientas de desarrollo (`F12`): ni **Console** ni **Issues** deben mostrar avisos de Content Security Policy.

### Limitar los intentos de login

La API no limita los intentos de login, así que hace falta esta regla.

1. Entra en [dash.cloudflare.com](https://dash.cloudflare.com) y abre tu dominio.
2. Abre **Security** → **Security rules** y, en la sección **Rate limiting rules**, crea una regla. El plan gratuito solo admite una; si ya la tienes ocupada (`1/1 rules`), tendrás que editarla o eliminarla.
3. En **Rule name**, escribe `login`.
4. En **When incoming requests match...**, abre el editor de expresión (en el alta, el enlace **Edit expression**, no reverificado) y pega:

   ```text
   (http.request.uri.path eq "/api/v1/auth/login" and http.request.method eq "POST")
   ```

5. En **With the same characteristics...**, deja **IP**. En el plan gratuito no se puede cambiar.
6. En **When rate exceeds...**, pon **Requests** `5` y **Period** `10 seconds`.
7. En **Then take action...**, elige **Block** en **Choose action**.
8. En **For duration...**, elige `10 seconds`, la única opción del plan gratuito.
9. Deja **Execution order** en **First** y **Status** en **Active**.
10. Guarda la regla: el botón es **Deploy** en el alta (no reverificado) y **Save** al editarla.

Comprueba que funciona. Esta orden usa una contraseña equivocada y debe mostrar varios `401` y, después, `429`:

```bash
for i in $(seq 1 10); do curl -s -o /dev/null -w '%{http_code}\n' -H 'Content-Type: application/json' -d '{"userName":"analyst","password":"wrong"}' https://recon.example.com/api/v1/auth/login; done
```

## 11. Actualizar a una versión nueva

Antes de nada, comprueba que el servidor está en la rama que despliegas y apunta la versión actual: es la que necesitas para volver atrás.

```bash
git branch --show-current
git rev-parse --short HEAD
```

La primera orden debe mostrar `feature/entrega-3-MVP`. Si no muestra nada, el servidor quedó en una versión anterior tras volver atrás: vuelve a la rama con `git checkout feature/entrega-3-MVP`. Guarda el resultado de la segunda, un código de 7 caracteres como `f01b550`.

```bash
git pull
scripts/deploy.sh build
scripts/deploy.sh migrate
scripts/deploy.sh up --wait
```

La base y los archivos subidos viven en volúmenes y se conservan. No ejecutes `seed` al actualizar.

**Si la versión nueva cambia los scripts de `infra/mssql/`**, `up` no basta: `mssql` solo los ejecuta al arrancar, y `up` no lo reinicia si su imagen no cambia. Después de `migrate`, reinicia todo y comprueba:

```bash
scripts/deploy.sh down
scripts/deploy.sh up --wait
scripts/deploy.sh ps
scripts/deploy.sh check
```

`down` no borra los volúmenes. `ps` debe mostrar los servicios `healthy`, y `check`, solo `recon_app` y `recon_migrator`. La URL está caída uno o dos minutos.

Si `check` sigue mostrando `recon_reader`, es que `mssql` no pudo borrarlo, normalmente porque alguien tenía una sesión abierta con ese usuario. Busca el aviso en los registros y repite el reinicio:

```bash
scripts/deploy.sh logs mssql
```

La línea es `recon_reader could not be removed: ...` y explica el motivo. `logs` sigue mostrando registros nuevos sin terminar: sal con `Ctrl+C`. Después repite `scripts/deploy.sh down` y `scripts/deploy.sh up --wait`, y vuelve a mirar `check`.

**Volver a la versión anterior**, con el código que apuntaste antes del `git pull`:

```bash
git checkout <código apuntado>
scripts/deploy.sh build
scripts/deploy.sh up --wait
```

El servidor queda fuera de la rama, en esa versión. Antes de la siguiente actualización, vuelve a ella con `git checkout feature/entrega-3-MVP` y sigue esta sección desde el principio. Las migraciones no se deshacen solas: si la versión nueva aplicó alguna incompatible con la anterior, necesitas un plan propio.

## 12. Órdenes de uso diario

| Orden | Qué hace | ¿Borra datos? |
|---|---|---|
| `scripts/deploy.sh ps` | Muestra el estado de los servicios | No |
| `scripts/deploy.sh logs api` | Sigue los registros de un servicio (`Ctrl+C` para salir) | No |
| `scripts/deploy.sh check` | Muestra los usuarios `recon_*` de la base y los 5 últimos logins auditados, con su IP. Solo lee, y solo con la base incluida (sin `DEPLOY_DB=external`) | No |
| `scripts/deploy.sh down` | Para y elimina los contenedores; los volúmenes siguen | No |
| `scripts/deploy.sh seed` | Recarga el mundo sintético | **Sí, toda la base** |
| `docker compose --env-file infra/.env.deploy -f infra/docker-compose.deploy.yml down -v` | Elimina también los volúmenes | **Sí, base y archivos** |

**No hay backups programados:** los volúmenes son la única copia. Por seguridad, `scripts/deploy.sh` no ofrece eliminar volúmenes.

Nunca se usan `prisma migrate dev`, `prisma db push` ni `prisma migrate reset` en un despliegue.

## 13. Si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `required variable ... is missing a value` | Falta un valor en `infra/.env.deploy` | Rellena la variable que nombra el error |
| `TUNNEL_TOKEN is empty` | No se copió el token | Sección 5 |
| `cloudflared` queda `unhealthy` | Token incorrecto o sin salida a internet | `scripts/deploy.sh logs cloudflared` y revisa el token |
| Cloudflare muestra el error 1033 | El túnel no está conectado | Comprueba `cloudflared` con `ps` y `logs` |
| Cloudflare muestra un error 502 | La **Service URL** de la ruta está mal | Debe ser `http://web:8080` |
| La URL abre pero el login falla | Falta migrar o sembrar | Secciones 7 y 8 |
| Tras actualizar, la web o la API siguen con la versión anterior (`ps` muestra `sha256:...` en vez de `recon-web` o `recon-api`) | `up` no recreó el contenedor | `scripts/deploy.sh up --wait --force-recreate web api` |
| `api` no arranca y sus registros indican `Login failed` | La contraseña se cambió después del primer arranque | Sección 4, `ALTER LOGIN` |
| `Msg 904` en los registros de `mssql` | SQL Server aún arranca | Es normal si va seguido de `[init] done`: se reintenta solo |
| `mssql` se reinicia y aparece `[init] failed` | La inicialización no pudo terminar, a menudo por una contraseña débil | Lee el `Msg` anterior en `scripts/deploy.sh logs mssql` |
| `mssql` no arranca, sin más detalle | Poca memoria o disco | `free -h` y `df -h` |
| Una subida grande falla por la URL pública | Límites de Cloudflare (sección 15) | Divide el archivo |
| `429` al entrar | Se activó la regla de login | Espera y vuelve a probar |

## 14. Opciones

### Probar sin túnel

Con `DEPLOY_DEBUG=1`, `cloudflared` no arranca, el token puede estar vacío y la web responde solo en la propia máquina, en `http://127.0.0.1:8080`. Es el único puerto de depuración. Por eso `web` tiene salida a internet en este modo: no lo uses para publicar.

```bash
DEPLOY_DEBUG=1 scripts/deploy.sh build
DEPLOY_DEBUG=1 scripts/deploy.sh up --wait
DEPLOY_DEBUG=1 scripts/deploy.sh migrate
DEPLOY_DEBUG=1 scripts/deploy.sh seed
DEPLOY_DEBUG=1 scripts/deploy.sh ps
```

Usa `DEPLOY_DEBUG=1` en todas las órdenes de la sesión.

### Usar un SQL Server externo

Con esta opción el servicio `mssql` no arranca y `api`, `migrate` y `seed` salen de Docker para llegar a la base.

1. Pide a quien administre ese servidor que ejecute, como administrador, [`infra/mssql/init.sql`](../infra/mssql/init.sql) y luego [`infra/mssql/init.deploy.sql`](../infra/mssql/init.deploy.sql). Reciben sus valores como variables de `sqlcmd`:

   ```bash
   sqlcmd -S SERVIDOR -U ADMIN -C -b -v RECON_APP_PASSWORD="..." DB_NAME="ReconTool" -i infra/mssql/init.sql
   sqlcmd -S SERVIDOR -U ADMIN -C -b -v RECON_MIGRATOR_PASSWORD="..." DB_NAME="ReconTool" -i infra/mssql/init.deploy.sql
   ```

   **Aviso para quien administra ese servidor:** `init.deploy.sql` borra el login `recon_reader` si existe, porque la aplicación lo creaba en versiones anteriores. Si en ese servidor hay un `recon_reader` de otro uso, cámbiale el nombre antes o no ejecutes el script tal cual.

2. En `infra/.env.deploy`, pon `DEPLOY_DB=external` y rellena `DB_HOST`, `DB_PORT` y `DB_NAME`.
3. Deja un valor cualquiera en `MSSQL_SA_PASSWORD`. No se usa, pero Compose lo exige.
4. Sigue desde la sección 6.

Con base externa la copia de seguridad y los permisos de red corren por cuenta de quien administra ese servidor.

## 15. Límites de Cloudflare

El plan gratuito corta las peticiones de más de 100 MB y las respuestas que tardan más de unos 100 segundos. La aplicación admite 20 MiB por archivo y hasta 200 MiB en total, así que un batch que supere los 100 MB puede fallar por la URL pública aunque el servidor lo acepte. Los archivos de `data/samples/` quedan muy por debajo de ese límite.

## 16. IP en la auditoría

La auditoría de los logins registra la IP pública de quien entra, la misma que muestra el panel de Cloudflare. `scripts/deploy.sh check` enseña los últimos logins con su IP.

De dónde sale:

1. El borde de Cloudflare escribe la IP del cliente en la cabecera `CF-Connecting-IP` y sustituye la que pudiera mandar el propio cliente.
2. Nginx (`web`) pasa a la API un único `X-Forwarded-For` con ese valor, sin conservar el que mande el cliente. Sin Cloudflare delante, por ejemplo en modo de depuración, usa la IP de la conexión.
3. La API solo hace caso de `X-Forwarded-For` cuando la petición llega desde una dirección privada, es decir, desde otro contenedor de la red interna (`TRUST_PROXY: uniquelocal` en `infra/docker-compose.deploy.yml`). Si el valor no es una IP, guarda la de la conexión.

No hay que configurar nada: no depende de las redes de Docker ni del router. En modo de depuración, quien ya tiene acceso al servidor podría mandar su propio `CF-Connecting-IP`; ese modo no se publica.

**Con un SQL Server externo** (sección 14), `api` está también en la red `recon-egress` para salir hacia la base. Sigue sin publicar puertos, así que solo le llegan peticiones de otros contenedores (`web`, y `cloudflared`, cuya ruta va a `web`), y la regla de las direcciones privadas sigue valiendo.

### Comprobarlo

1. Entra por la URL pública desde fuera de tu red, por ejemplo con el móvil sin Wi-Fi.
2. Desde el servidor, por SSH, prueba que una cabecera inventada no cuela. La orden va contra la URL pública, así que también pasa por Cloudflare:

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -X POST https://recon.example.com/api/v1/auth/login -H "Content-Type: application/json" -H "CF-Connecting-IP: 1.2.3.4" -H "X-Forwarded-For: 1.2.3.4" -d '{"userName":"ghost","password":"x"}'
   ```

   Debe dar `401`, o un bloqueo de Cloudflare.
3. `scripts/deploy.sh check` debe mostrar en los últimos logins la IP del móvil y la IP pública del servidor, nunca `1.2.3.4` ni una `172.x.x.x`.

La IP del móvil puede ser IPv6 (con `:`, como `2a0c:5a80:...`). Compárala con la que muestra Cloudflare en **Security** → **Events** para ese login, no con la de una web como `ifconfig.me`, que puede enseñarte la IPv4.
