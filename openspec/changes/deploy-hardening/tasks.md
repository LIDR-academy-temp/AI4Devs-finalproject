# Tasks — deploy-hardening

Orden aprobado en el gate: #107 → #108 → #106. Cada grupo se cierra con su commit, su documentación y su `git push`. Si el lunes 9 a las 18:00 un grupo no está terminado, se queda fuera del PR y su issue sigue abierto. Por eso el smoke crece por grupos: cada uno añade las comprobaciones de su issue.

Ninguna tarea usa la base local salvo la 2.4, que necesita turno pedido antes. Lo que necesita las imágenes o SQL Server se comprueba en la CI de la rama `fix/deploy-hardening`. No se edita ningún `.env` ni `infra/.env.deploy.example`.

## 1. `deploy.sh check` y smoke en la CI (#107, D4, D6)

- [x] 1.1 `scripts/deploy.sh check`: las dos consultas de solo lectura en `mssql` con el `sa` del contenedor, la orden en `usage` y la cabecera del script.
- [x] 1.2 En el job `images` de `.github/workflows/ci.yml`:
  - `load: true` y `tags:` en las tres construcciones;
  - después del paso de configuración, los pasos de D4 que no dependen de #106 ni de #108: `cp` de la plantilla, `up --no-build --wait`, `migrate`, health, ruta profunda de la SPA, cabeceras de seguridad, login fallido `401`, `check` y `ps` sin `cloudflared`;
  - logs si falla y `down -v` al final;
  - secretos ficticios propios del paso, sin `TUNNEL_TOKEN`.
- [x] 1.3 `docs/deploy.md`: `check` en la lista de órdenes (§12). El smoke de la CI se describe en el README, junto a la comprobación de imágenes, porque `docs/deploy.md` no habla de la CI.
- [ ] 1.4 Commit: ci: arrancar las imágenes de despliegue con un smoke (#107), y `git push`. Abrir el PR en borrador para que corra la CI. Verificar en la CI: el job `images` en verde, `cloudflared` sin arrancar y ningún `docker push`.
- [ ] 1.5 Anotar la duración del job `images` antes (1 min 12 s – 1 min 22 s) y después, y comprobar que el camino crítico del PR no cambia.
- [ ] 1.6 Rotura deliberada (D7): un commit temporal quita `--conditions=recon-dist` del `CMD` de `backend/Dockerfile`. Verificar que `images` falla en `up --wait` y muestra los logs de la API. Revertirlo con `git revert` y ver el job en verde otra vez. Los dos commits se quedan en el historial.

## 2. Sin `recon_reader` en el despliegue (#108, D5)

- [ ] 2.1 Mover el bloque de `recon_reader` de `infra/mssql/init.sql` a `infra/mssql/init.local.sql` (nuevo). Montarlo en `infra/docker-compose.yml` y ejecutarlo desde `entrypoint.sh` si existe. Borrado idempotente con `TRY/CATCH` en `infra/mssql/init.deploy.sql`, antes del bloque de `recon_migrator`, que sigue siendo el último. Actualizar los comentarios de los cuatro archivos.
- [ ] 2.2 Smoke: la salida de `check` no lista `recon_reader`.
- [ ] 2.3 Documentación:
  - `docs/deploy.md`: §11 añade `down` / `up --wait` cuando cambian los scripts de `mssql`, y las menciones de los usuarios de la base;
  - README §1.4 (`recon_reader` solo en local), §2.4 si menciona los usuarios del despliegue, y el árbol de `infra/mssql/` con `init.local.sql`.
- [ ] 2.4 **Con turno de base:**
  - `pnpm db:up` recrea el contenedor local;
  - `recon_reader` sigue existiendo con `db_datareader` y nada más;
  - `pnpm db:migrate` no tiene cambios.

  Anotar la salida en el scratchpad.
- [ ] 2.5 Commit: fix(infra): no crear recon_reader en el despliegue (#108), y `git push`. Verificar en la CI el job `images` en verde.

## 3. IP real del cliente (#106, D1, D2, D3)

- [ ] 3.1 Pruebas primero:
  - **`env.test.ts`:** `TRUST_PROXY` ausente da `undefined`; `"uniquelocal"` y `"loopback, 10.0.0.0/8"` se aceptan; un elemento vacío (`"uniquelocal,"`) falla nombrando la variable.
  - **`auth.int.test.ts`:** los cuatro escenarios nuevos de `auth`, con `inject({ remoteAddress, headers })` y la app construida con y sin `TRUST_PROXY`.

  Verlas en rojo.
- [ ] 3.2 `TRUST_PROXY` en `backend/src/config/env.ts`, `trustProxy` en `buildApp` solo si está definida, y la guarda `isIP` en `auth-routes.ts`. Verificar `pnpm --filter @recon/backend test` y `typecheck`. Las de integración se verifican en la CI.
- [ ] 3.3 `TRUST_PROXY: uniquelocal` en el servicio `api` de `infra/docker-compose.deploy.yml`, con un comentario que remita a design D2.
- [ ] 3.4 En `frontend/nginx/default.conf`: el `map` de `$client_ip`, `X-Real-IP` y `X-Forwarded-For` con `$client_ip`, `X-Forwarded-Host` vacío y comentarios en inglés.
- [ ] 3.5 Smoke: el login fallido manda `CF-Connecting-IP: 203.0.113.7` y `X-Forwarded-For: 198.51.100.66`, y la salida de `check` contiene `203.0.113.7` y no `198.51.100.66`.
- [ ] 3.6 `docs/deploy.md` §16 deja de ser una "limitación conocida" y explica de dónde sale la IP.
- [ ] 3.7 Commit: fix(auth): IP real del cliente detrás del túnel (#106), y `git push`. Verificar en la CI `integration` e `images` en verde.

## 4. Verificación de conjunto y PR

- [ ] 4.1 En verde:
  - `pnpm lint`, `pnpm typecheck`, `pnpm test` y `openspec validate deploy-hardening --strict`;
  - todos los jobs de la CI de la rama.
- [ ] 4.2 PR listo para revisar hacia `feature/entrega-3-MVP` con la plantilla:
  - un `Closes` por cada grupo que haya entrado;
  - la duración medida y los runs de la rotura;
  - en "Notas para el revisor" y en la descripción, los pasos del martes (Migration Plan de design.md).
- [ ] 4.3 **Martes, en el servidor (lo hace la persona):** el Migration Plan de design.md. Con su resultado, los criterios de producción de #106 (1 y 2) y de #108 (2) quedan comprobados y se anotan en los issues.

## Workflow follow-up

- `/opsx:verify deploy-hardening` y `/review-diff` en otra sesión, cuando lo pida la persona.
- `/opsx:archive deploy-hardening` después del merge.
