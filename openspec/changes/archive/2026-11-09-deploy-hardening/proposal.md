## Why

El despliegue de #97 funciona, pero su revisión dejó tres huecos de endurecimiento:

- **#106:** la auditoría de los logins guarda la IP del contenedor `web`, no la de quien entra.
- **#107:** la CI construye las imágenes pero nunca las arranca, así que un fallo de arranque pasa el check.
- **#108:** el despliegue crea `recon_reader`, un login que nadie usa y que comparte contraseña con `recon_app`.

Los tres tocan las mismas piezas (`infra/`, `frontend/nginx/`, el job `images` y `docs/deploy.md`) y se comprueban juntos con el mismo smoke. Hay que cerrarlos antes de congelar el código, el lunes 9, y de redesplegar el martes 10.

## What Changes

- **#106. IP real del cliente en la auditoría:**
  - **Nginx** sustituye `X-Forwarded-For` y `X-Real-IP` por un único valor: `CF-Connecting-IP` si llega y, si no, la IP de la conexión. Deja de pasar el `X-Forwarded-For` del cliente y vacía `X-Forwarded-Host`.
  - **La API** lee una variable nueva, `TRUST_PROXY`, opcional y vacía por defecto. El despliegue la fija en `uniquelocal`, que confía solo en peticiones que llegan desde direcciones privadas, es decir, desde otro contenedor de la red interna.
  - Si el valor resultante no es una IP, la auditoría guarda la de la conexión.
  - En local (`pnpm dev`) no cambia nada.
- **#107. Smoke de las imágenes en la CI**, dentro del job `images`:
  - Carga las tres imágenes en Docker y levanta el despliegue con `DEPLOY_DEBUG=1 scripts/deploy.sh`, con secretos ficticios y sin `cloudflared`.
  - Migra y espera a que `mssql`, `api` y `web` estén `healthy`.
  - Comprueba por `127.0.0.1:8080`:
    - `/api/v1/health` responde `200` con `db: "ok"`;
    - una ruta profunda de la SPA responde `200`;
    - están las cuatro cabeceras de seguridad;
    - un login fallido con cabeceras inventadas deja en `AuditLog` la IP de `CF-Connecting-IP` y no la de `X-Forwarded-For` (prueba de #106 a través del Nginx real);
    - `recon_reader` no existe (#108).
  - Sin seed y sin publicar imágenes.
- **#108. Sin `recon_reader` en el despliegue:**
  - El bloque de `recon_reader` sale de `infra/mssql/init.sql` y pasa a un archivo nuevo, `infra/mssql/init.local.sql`. Solo lo monta el compose local, y `entrypoint.sh` lo ejecuta si está montado, igual que ya hace con `init.deploy.sql`.
  - `init.deploy.sql` borra `recon_reader` de forma idempotente si existe, y un despliegue en marcha lo pierde en el siguiente arranque de `mssql`.
  - En local, `recon_reader` sigue existiendo como hasta ahora.
- **`scripts/deploy.sh check`:** orden nueva, de solo lectura. Muestra los logins `recon_*` y los últimos logins auditados con su IP. La usan el smoke y la comprobación del martes, sin copiar un `sqlcmd` a mano.
- **Documentación:**
  - `docs/deploy.md`: §16 deja de ser una limitación; procedimiento para actualizar un despliegue existente; menciones de los usuarios.
  - README §1.4 y §2.4, donde mencionan `recon_reader`.
  - El comentario de `infra/docker-compose.yml`.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `auth`: "Auditoría de intentos de login" pasa a guardar la IP del cliente: la real detrás del túnel y la de la conexión en local.
- `deployment`:
  - "Identidades de base de datos separadas": sin `recon_reader` en el despliegue.
  - "Comprobación de imágenes en la CI": además de construir, arranca las imágenes y comprueba health, SPA, cabeceras, IP y logins.
  - Requisito nuevo: "IP del cliente detrás del túnel".

## Impact

- **Código:**
  - `backend/src/config/env.ts` (`TRUST_PROXY`) y `backend/src/app.ts` (`trustProxy`);
  - `backend/src/modules/auth/http/auth-routes.ts`: validar que la IP es una IP.
- **Configuración e infraestructura:**
  - `frontend/nginx/default.conf`;
  - `infra/docker-compose.deploy.yml` (`TRUST_PROXY` en `api`);
  - `infra/docker-compose.yml` (montaje de `init.local.sql`);
  - `infra/mssql/init.sql`, `init.local.sql` (nuevo), `init.deploy.sql` y `entrypoint.sh`;
  - `.github/workflows/ci.yml` (job `images`).
- **Pruebas:** `env.test.ts` y `auth.int.test.ts` (IP con y sin `TRUST_PROXY`, con un peer público y con un valor que no es una IP), más el smoke de la CI.
- **CI:** el job `images` pasa de unos 1 min 15 s a unos **3–4 min**, una estimación que hay que medir. Corre en paralelo con `check` → `integration`/`e2e`, que tarda unos 10–11 min, así que **no alarga el PR**.
- **Base de datos:** sin migraciones. En local hace falta turno de base para comprobar que `pnpm db:up` mantiene `recon_reader`, porque el contenedor local se recrea al cambiar su compose.
- **Servidor del homelab (martes):** `git pull`, `build`, `migrate`, `down` y `up --wait`, más dos comprobaciones (design, "Migration Plan"). No hay que tocar la red ni el panel de Cloudflare.
- **Estimación**, en horas:

  | Bloque | Horas |
  |---|---|
  | #106: env, `trustProxy`, guarda de IP, Nginx y pruebas de integración | 1,5 |
  | #107: carga de imágenes, smoke, rotura deliberada y medida en la CI | 1,75 |
  | #108: separar `init.local.sql`, borrado idempotente, comprobación local con turno | 1 |
  | `scripts/deploy.sh check` | 0,5 |
  | `docs/deploy.md`, README y specs | 0,5 |
  | Verificación, revisión y PR | 0,5 |
  | **Total** | **5,75** |

  Margen honesto: 5–6,5 h. Lo más incierto son las vueltas de la CI del smoke, por los tiempos de arranque de SQL Server en el runner.
