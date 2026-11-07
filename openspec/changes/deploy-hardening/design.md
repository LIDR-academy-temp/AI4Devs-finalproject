## Context

- **Camino de una petición:** cliente → borde de Cloudflare → `cloudflared` (redes `recon-internal` y `recon-egress`) → `web` (Nginx, `:8080`) → `api` (`:3000`).
  - Ningún servicio publica puertos en el despliegue normal.
  - `recon-internal` es `internal: true`, así que nada fuera de Docker llega a `api`.
  - En modo de depuración, `web` publica solo `127.0.0.1:8080`.
- **Hoy:**
  - Nginx envía `X-Real-IP $remote_addr`, que es la IP de `cloudflared`, y `X-Forwarded-For $proxy_add_x_forwarded_for`, que añade la IP de `cloudflared` a lo que mande el cliente.
  - La API no confía en proxies (`request.ip` = `web`). Solo la usa la auditoría del login (`auth-routes.ts:22` → `detail.ip`).
  - Fastify no lee `request.hostname` ni `request.protocol` en ningún sitio.
- **Fastify 5.12.5** (comprobado en `node_modules/fastify/lib/request.js` y con `inject`):
  - `trustProxy: <número>` **falla cerrado**: no confía en ningún salto, porque contar saltos no valida al vecino inmediato.
  - Con una lista de direcciones o un nombre de `proxy-addr` (`uniquelocal`, `loopback`…), `request.ip` es la dirección más a la derecha que no es de confianza.
  - No valida que el valor sea una IP: `X-Forwarded-For: not-an-ip` da `request.ip = "not-an-ip"`.
- **`infra/mssql/entrypoint.sh`** ejecuta `init.sql` en cada arranque y, si está montado, `init.deploy.sql`. `init.sql` crea `recon_reader` con la contraseña de `recon_app`.
  - En el repositorio ninguna pieza usa `recon_reader`: ni código, ni `.mcp.json`, ni la configuración de Claude Code. El comentario lo reserva para "agentes y herramientas de consulta (DB MCP en `--readonly`)".
  - El job `e2e` de la CI ejecuta `init.sql` a mano y tampoco lo usa.
- **El job `images`:**
  - construye con `docker/build-push-action` (`push: false`, sin `load`), así que las imágenes no quedan en el Docker del runner;
  - valida el compose con `docker compose config`;
  - tarda 1 min 12 s – 1 min 22 s con caché.

## Goals / Non-Goals

**Goals:**
- La IP del cliente no se puede falsear desde fuera, y la cadena de confianza no depende de saber la IP de ningún contenedor.
- El smoke prueba también #106 y #108 contra las imágenes reales.
- El martes, el redespliegue es una secuencia de órdenes copiables, sin tocar la red, el router ni el panel de Cloudflare.

**Non-Goals:**
- Limitar los intentos de login en la API: lo hace la regla de Cloudflare.
- Publicar imágenes, desplegar desde Actions o un E2E contra las imágenes (#40 ya lo cubre contra el build).
- Retirar `recon_reader` en local, separar contraseñas en local o cambiar otros permisos.

## Decisions

### D1. Fuente de la IP: `CF-Connecting-IP`, normalizada en Nginx

```nginx
# http context (conf.d): Cloudflare sets CF-Connecting-IP at its edge; a client cannot send its own through it.
map $http_cf_connecting_ip $client_ip {
    ""      $remote_addr;
    default $http_cf_connecting_ip;
}
# in location /api/
proxy_set_header X-Real-IP $client_ip;
proxy_set_header X-Forwarded-For $client_ip;   # replaces, never appends the client's header
proxy_set_header X-Forwarded-Host "";          # not forwarded
```

- **Por qué es seguro:**
  - `CF-Connecting-IP` lo escribe el borde de Cloudflare, que ignora el valor que mande el cliente.
  - El único camino hasta `web` en producción es el túnel.
  - `X-Forwarded-For` se **sustituye** por un solo valor, así que una lista inventada por el cliente nunca llega a la API.
- **Sin Cloudflare delante** (modo de depuración en `127.0.0.1:8080`), la IP es la de la conexión. Quien ya está en el servidor podría poner su propio `CF-Connecting-IP`. Es aceptable y queda documentado.
- **Alternativas descartadas:**
  - Primer elemento de `X-Forwarded-For`: lo controla el cliente.
  - Contar saltos: Fastify falla cerrado con un número, y además dependería de la longitud exacta de la cadena.
  - Módulo `realip` de Nginx con `set_real_ip_from`: exige conocer la subred de `cloudflared`, y con eso fijar subredes en el compose. Eso puede chocar con las redes del homelab.

### D2. API: `TRUST_PROXY` con valor `uniquelocal` en el despliegue

- **`env.ts`:**
  - `TRUST_PROXY` es opcional y su valor es una lista de direcciones o nombres de `proxy-addr` separados por comas.
  - Vacía o ausente, la API no confía en ningún proxy, como hoy.
  - Un valor vacío entre comas es un error de arranque que nombra la variable.
- **`app.ts`:** pasa `trustProxy: env.TRUST_PROXY` a Fastify solo si está definida.
- **`docker-compose.deploy.yml`:** fija `TRUST_PROXY: uniquelocal` en `api`. No va en `.env.deploy`, porque no es un secreto ni algo que la persona tenga que elegir.
- **Por qué `uniquelocal`** (10/8, 172.16/12, 192.168/16, fc00::/7):
  - Solo los contenedores de `recon-internal` tienen dirección privada y pueden hablar con `api`.
  - Un peer público nunca es de confianza: con `X-Forwarded-For` desde `198.51.100.9`, `request.ip` es `198.51.100.9` (probado).
  - No hace falta fijar subredes ni direcciones.
- **Alternativa descartada:** fijar la IP de `web` con `ipv4_address`. Es más estricto, pero obliga a reservar una subred que podría solaparse con las del servidor ("Pool overlaps"). El riesgo cae justo en la parte que la persona no domina.

### D3. Guarda de IP en la ruta de login

- `auth-routes.ts` pasa `ip: isIP(request.ip) ? request.ip : request.socket.remoteAddress`, con `node:net`.
- La auditoría nunca guarda un texto arbitrario como IP, aunque falle la normalización de D1.

### D4. Smoke en el job `images`, no en un job propio

- **Por qué en el mismo job:**
  - Las imágenes ya están construidas allí, y un job aparte tendría que reconstruirlas o pasarlas como artifact (cientos de MB).
  - Corre en paralelo con `check` → `integration`/`e2e`, que tarda unos 10–11 min, así que no alarga el pull request.
  - El job pasa de unos 1 min 15 s a unos **3–4 min**, una estimación que se mide en la tarea 4.4. Añade la carga de las imágenes en Docker (~30 s), el arranque de SQL Server con su init (~40–60 s), `migrate` (~20–30 s) y las comprobaciones (~10 s).
- **Pasos:**
  1. Las tres construcciones añaden `load: true` y `tags:` con los nombres del compose (`recon-api`, `recon-ops`, `recon-web`). `push: false` se mantiene.
  2. `cp infra/.env.deploy.example infra/.env.deploy`. Los secretos son literales ficticios en el `env:` del paso, que mandan sobre el archivo en la interpolación de Compose. No hay `TUNNEL_TOKEN`.
  3. `DEPLOY_DEBUG=1 scripts/deploy.sh up --no-build --wait --wait-timeout 240`. El override de depuración deja `cloudflared` en el perfil `disabled`. Usar el script real prueba también `deploy.sh`.
  4. `DEPLOY_DEBUG=1 scripts/deploy.sh migrate`.
  5. Comprobaciones con `curl` contra `127.0.0.1:8080`:
     - health `200` con `"db":"ok"`;
     - `/imports/00000000-0000-0000-0000-000000000000` responde `200` con `<div id="root">`;
     - las cuatro cabeceras de `security-headers.conf`;
     - `POST /api/v1/auth/login` con `ghost`, `CF-Connecting-IP: 203.0.113.7` y `X-Forwarded-For: 198.51.100.66` responde `401`.
  6. `scripts/deploy.sh check` (D6). Su salida tiene que contener `203.0.113.7`, no contener `198.51.100.66` y no listar `recon_reader`.
  7. `docker compose ps` no lista `cloudflared`.
  8. Si algo falla, `scripts/deploy.sh logs` sin `-f` de los tres servicios (últimas 200 líneas). Al final, `down -v`.
- **Por grupos:** el smoke entra con #107 y comprueba lo que ya existe. Las comprobaciones de la IP (paso 5, cabeceras inventadas; paso 6, IP) y de `recon_reader` (paso 6) entran con #106 y #108, para que cada grupo se pueda dejar fuera sin romper la CI.
- **Sin seed:** tarda varios minutos y el login fallido ya prueba la ruta completa (Nginx → API → base → `AuditLog`). Un login correcto lo prueban `integration` y `e2e`.

### D5. `recon_reader` en un archivo propio, solo en local

- El bloque sale de `init.sql` y pasa a `infra/mssql/init.local.sql`, con las mismas variables (`DB_NAME`, `RECON_APP_PASSWORD`).
- `infra/docker-compose.yml` lo monta en `/init/init.local.sql`.
- `entrypoint.sh` lo ejecuta después de `init.sql` si existe, igual que `init.deploy.sql`.
- **`init.deploy.sql`** retira `recon_reader` de forma idempotente, antes de crear `recon_migrator`, que tiene que seguir siendo lo último porque el healthcheck lo espera:
  ```sql
  BEGIN TRY
      IF DATABASE_PRINCIPAL_ID('recon_reader') IS NOT NULL DROP USER [recon_reader];
      IF EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = 'recon_reader') DROP LOGIN [recon_reader];
  END TRY
  BEGIN CATCH
      PRINT 'recon_reader could not be removed: ' + ERROR_MESSAGE();
  END CATCH;
  ```
  El `TRY/CATCH` evita que un `DROP LOGIN` con una sesión abierta haga fallar el init, porque el entrypoint saldría con error tras 60 intentos y `mssql` no arrancaría. El aviso queda en `scripts/deploy.sh logs mssql`.
- **Por qué no una variable en `init.sql`:** `sqlcmd` falla con una variable no definida. El job `e2e` y el procedimiento de base externa ejecutan `init.sql` con dos variables, y habría que cambiarlos todos.
- **Por qué se mantiene en local**, aunque hoy nada lo use: lo pide el criterio 3 de #108 y su comentario lo reserva para herramientas de consulta. Retirarlo también en local sería una decisión aparte.

### D6. `scripts/deploy.sh check`

Orden nueva, de solo lectura. Ejecuta en `mssql`, con el `sa` del propio contenedor, dos consultas:
- los logins `recon_%` de `sys.sql_logins`;
- las 5 últimas filas `auth.login.%` de `AuditLog`: `createdAt`, `action` y `detailJson`, que guarda el usuario, el motivo y la IP, sin secretos.

La usan el smoke (D4) y la persona el martes, para no copiar a mano un `sqlcmd` con comillas anidadas.

### D7. Comprobación

- Unitarias (`env.test.ts`) e integración (`auth.int.test.ts`) con `inject({ remoteAddress, headers })` y los cuatro escenarios de `auth`. Las de integración corren en la CI de la rama.
- Rotura deliberada en la CI (criterio 1 de #107): un commit temporal quita `--conditions=recon-dist` del `CMD`. El job `images` tiene que fallar en el `up --wait`. Después se revierte con `git revert`.
- **Local, con turno de base:**
  - `pnpm db:up` recrea el contenedor porque cambia su compose;
  - `recon_reader` sigue existiendo y solo con `db_datareader`;
  - `pnpm test:integration` no cambia.

## Risks / Trade-offs

- **[Cloudflare dejara de sobrescribir `CF-Connecting-IP`]** → Es su comportamiento documentado y el que usan todas las guías de `real_ip_header CF-Connecting-IP`. El martes se comprueba en producción con un `curl` que manda su propio `CF-Connecting-IP` (Migration Plan, paso 6). Si Cloudflare rechaza esa petición en lugar de sobrescribir la cabecera, también es un resultado seguro.
- **[`uniquelocal` confía en `cloudflared` además de en `web`]** → `cloudflared` no habla con `api`: su ruta es `http://web:8080`. Si alguien la cambiara a `api:3000`, el `X-Forwarded-For` de Cloudflare traería la IP real a la derecha, y `request.ip` seguiría siendo la del cliente.
- **[`DROP LOGIN` falla por una sesión abierta]** → `TRY/CATCH` y un aviso en el log (D5). El siguiente arranque lo vuelve a intentar.
- **[Tiempo de arranque de SQL Server en el runner]** → `--wait-timeout 240`, y logs de los tres servicios si falla.
- **[Recrear la base local para comprobar #108]** → Se pide turno. El volumen se conserva, y `recon_reader` ya existe en él.

## Migration Plan

**Martes 10, en el servidor del homelab.** Son unos 10 minutos y la URL está caída 1–2 min. No hay que tocar el router, las redes de Docker ni el panel de Cloudflare: la ruta del túnel sigue siendo `http://web:8080`.

1. Entra por SSH y ve a la carpeta del repositorio: `cd <ruta del repositorio>`.
2. Trae la versión: `git pull`, en la rama que despliegas.
3. Construye: `scripts/deploy.sh build`. Tarda unos minutos.
4. Migra: `scripts/deploy.sh migrate`. Este change no trae migraciones, así que debe decir `No pending migrations to apply`.
5. Reinicia todo:
   ```bash
   scripts/deploy.sh down
   scripts/deploy.sh up --wait
   scripts/deploy.sh ps
   ```
   - El `down` es necesario: `mssql` solo vuelve a ejecutar sus scripts al arrancar, y así retira `recon_reader`. Los datos viven en volúmenes y `down` no los borra.
   - `ps` debe mostrar los cuatro servicios `healthy`.
6. Comprueba la IP desde fuera de tu red, por ejemplo con el móvil sin Wi-Fi:
   - entra por la URL pública con un usuario correcto;
   - desde el portátil, prueba que una cabecera inventada no cuela: `curl -s -o /dev/null -w "%{http_code}\n" -X POST https://<URL pública>/api/v1/auth/login -H "Content-Type: application/json" -H "CF-Connecting-IP: 1.2.3.4" -H "X-Forwarded-For: 1.2.3.4" -d '{"userName":"ghost","password":"x"}'`. Debe dar `401`, o un bloqueo de Cloudflare.
7. En el servidor, `scripts/deploy.sh check` debe mostrar:
   - solo `recon_app` y `recon_migrator` en los logins, sin `recon_reader`;
   - en los últimos logins, la IP pública del móvil y la del portátil, nunca `1.2.3.4` ni una `172.x.x.x`. La IP pública del móvil se ve en el panel de Cloudflare (**Security** → **Events**) o en una web como `ifconfig.me`.

**Volver atrás:** `git checkout <versión anterior>`, `scripts/deploy.sh build` y `scripts/deploy.sh up --wait`. Si después `mssql` se reinicia, el `init.sql` antiguo vuelve a crear `recon_reader`. No rompe nada, solo devuelve el login de más.
