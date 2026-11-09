## ADDED Requirements

### Requirement: IP del cliente detrás del túnel
En el despliegue, la API SHALL confiar en las cabeceras de proxy solo en las peticiones que llegan desde direcciones privadas, es decir, desde la red interna de los contenedores. Nginx SHALL enviarle un único `X-Forwarded-For`: `CF-Connecting-IP` si llega y, si no, la IP de su conexión, sin conservar el `X-Forwarded-For` que mande el cliente. Nginx SHALL NOT reenviar el `X-Forwarded-Host` del cliente.

#### Scenario: Login por la URL pública
- **WHEN** alguien hace login por la URL pública
- **THEN** su fila de `AuditLog` guarda su IP pública, la misma que muestra Cloudflare, y no la de `web` ni la de `cloudflared`

#### Scenario: X-Forwarded-For inventado
- **WHEN** llega por `web` un login con `CF-Connecting-IP: 203.0.113.7` y `X-Forwarded-For: 198.51.100.66`
- **THEN** la fila guarda `ip = "203.0.113.7"` y `198.51.100.66` no aparece en ella

#### Scenario: Sin Cloudflare delante
- **WHEN** llega por `web` en modo de depuración un login sin `CF-Connecting-IP`
- **THEN** la fila guarda la IP de la conexión con `web`

## MODIFIED Requirements

### Requirement: Identidades de base de datos separadas
Las migraciones SHALL ejecutarse con una identidad distinta de `recon_app`. En el despliegue, `recon_app` SHALL NOT poder cambiar el esquema, la API SHALL NOT usar `sa` y SHALL NOT existir el login `recon_reader`. Un despliegue que ya lo tenga SHALL perderlo en el siguiente arranque de `mssql`, sin perder datos. En local, `recon_reader` SHALL seguir existiendo con permisos de solo lectura.

#### Scenario: La aplicación no puede cambiar el esquema
- **WHEN** `recon_app` intenta crear una tabla en la base del despliegue
- **THEN** SQL Server lo rechaza por permisos

#### Scenario: Flujo completo sin DDL de la aplicación
- **WHEN** la API se ejecuta como `recon_app` en el despliegue
- **THEN** el recorrido import → validaciones → settlement → descargas funciona con `data/samples/batch-clean`

#### Scenario: Despliegue desde cero
- **WHEN** se levanta el despliegue sobre un volumen vacío
- **THEN** `sys.sql_logins` no contiene `recon_reader`

#### Scenario: Despliegue existente con recon_reader
- **GIVEN** un despliegue cuyo SQL Server tiene el login y el usuario `recon_reader`
- **WHEN** se sigue el procedimiento de actualización de `docs/deploy.md`
- **THEN** `recon_reader` ya no existe, los datos siguen ahí y la API está `healthy`

#### Scenario: Entorno local
- **WHEN** se levanta la base local con `pnpm db:up`
- **THEN** `recon_reader` existe y solo tiene `db_datareader`

### Requirement: Comprobación de imágenes en la CI
La CI SHALL construir las imágenes en cada pull request, sin publicarlas, y SHALL validar la configuración del despliegue. Además SHALL arrancarlas con la configuración del despliegue en modo de depuración, con secretos ficticios y sin `cloudflared`, migrar y comprobar a través de `web` que el despliegue responde. Una imagen que se construye pero no arranca SHALL hacer fallar el check.

#### Scenario: Dockerfile roto
- **WHEN** un pull request rompe un Dockerfile
- **THEN** el check de la CI falla

#### Scenario: Sin publicación
- **WHEN** el job termina en verde
- **THEN** no se ha subido ninguna imagen a un registro

#### Scenario: Imagen que no arranca
- **WHEN** un pull request quita `--conditions=recon-dist` del `CMD` de la imagen de la API
- **THEN** la imagen se construye, la API no llega a `healthy` y el check falla

#### Scenario: Despliegue arrancado
- **WHEN** el job termina en verde
- **THEN** han quedado comprobados a través de `127.0.0.1:8080`:
  - `/api/v1/health` responde `200` con `db = "ok"`;
  - una ruta profunda de la SPA responde `200` con `index.html`;
  - las respuestas llevan `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y `Content-Security-Policy`;
  - la IP de un login fallido sale de `CF-Connecting-IP`;
  - `recon_reader` no existe.

#### Scenario: Sin secretos reales ni túnel
- **WHEN** corre el job
- **THEN** usa solo valores ficticios escritos en el workflow, ningún secreto del repositorio ni `TUNNEL_TOKEN`, y `cloudflared` no arranca
