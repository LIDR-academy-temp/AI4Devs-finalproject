# Incidente de seguridad — secretos en repositorio y despliegue (2026-11-09)

## Resumen

Durante revisión pre-entrega se detectó exposición de **credenciales de producción** (SQL Server y configuración JWT) fuera del panel de hosting. Se aplicó contención en Git, rotación de secretos y recuperación operativa del API en MonsterASP.

**Severidad:** Crítica (acceso a BD de producción para cualquier lector del repo).  
**Estado:** Contenido y operación restaurada; **riesgo residual** en historial Git antiguo (ver §6).

## Hallazgos

| Origen | En Git `HEAD` (post-fix) | Historial Git | Notas |
|--------|--------------------------|---------------|--------|
| `GraphApi/appsettings.Production.json` | No (`.gitignore`) | No en objetos | Valores reales solo local / servidor |
| `GraphApi/appsettings.json` | Solo `PLACEHOLDER` | OK en punta | |
| `GraphApi/.continue/mcpServers/new-mcp-server.yaml` | Eliminado del índice | Sí (password SQL en commits antiguos) | Commit `cd6bbd0` |
| Deploy rutinario (`Deploy-Produccion.ps1`) | N/A | N/A | **No sube** `appsettings.Production.json` al servidor (`-skip`) |

## Causa raíz

1. **Config local de Continue** versionada con `DB_PASSWORD` en texto plano.
2. **Despliegue por diseño** deja fijo el `appsettings.Production.json` del servidor → rotar password en SQL **sin** actualizar el archivo en el sitio API provoca `503`/`500` (health y endpoints).
3. **`appsettings.Production.json` local** con secretos (gitignored) mezclado con expectativa de que un `git push` actualice prod.

## Medidas aplicadas

| Fecha | Acción |
|-------|--------|
| 2026-11-09 | Placeholders en `appsettings.Production.json` local; `GraphApi/.continue/` en `.gitignore` |
| 2026-11-09 | `git rm --cached` de `.continue`; commit `cd6bbd0`; push `final-project-AFS` |
| 2026-11-09 | Rotación password usuario SQL `db24572` (panel hosting) |
| 2026-11-09 | Nueva `JwtSettings:Key` (solo servidor + archivo local gitignored) |
| 2026-11-09 | Sincronización puntual de `appsettings.Production.json` al sitio API vía Web Deploy (un archivo) |

## Recuperación en producción (playbook)

1. **Secretos:** panel MonsterASP o `GraphApi/appsettings.Production.json` en el **servidor** (no el repo).
2. Tras rotar SQL o JWT: actualizar el JSON en el sitio o variables de entorno (ver nombres en §4).
3. **No confiar** en `Deploy-Produccion.ps1` para propagar secretos.
4. Usuarios del portal: **cerrar sesión** tras rotar JWT (tokens antiguos inválidos).
5. Verificar: login API `POST /SGR/AuthService/GenerateToken` y `GET /SGR/Menus/admin` con Bearer.

### Subir solo `appsettings.Production.json` (emergencia)

Desde máquina con `appsettings.Production.json` local (gitignored) y `apicuartaquinientos*.publishSettings`:

```powershell
$root = "<raíz del repo>"
$src  = Join-Path $root "GraphApi\appsettings.Production.json"
$msdeploy = "$env:ProgramFiles\IIS\Microsoft Web Deploy V3\msdeploy.exe"
[xml]$x = Get-Content (Get-ChildItem $root -Filter "apicuartaquinientos*.publishSettings" | Select-Object -First 1).FullName
$p = $x.publishData.publishProfile | Where-Object publishMethod -eq 'MSDeploy' | Select-Object -First 1
$site = $p.msdeploySite
$dest = "contentPath=$site/appsettings.Production.json,ComputerName=https://$($p.publishUrl):8172/msdeploy.axd?site=$site,UserName=$($p.userName),Password=$($p.userPWD),AuthType=Basic"
& $msdeploy -verb:sync "-source:contentPath=$src" "-dest:$dest" -allowUntrusted -enableRule:AppOffline
```

Reiniciar sitio si hace falta; comprobar endpoints de negocio (no solo `/health` — en hosting puede quedar `Unhealthy` con SQL operativo).

## Variables de entorno (API)

La API usa `ConnectionStrings:Default` y `JwtSettings:Key` (`GraphApi/Infrastructure/Extensions/ServiceCollectionExtensions.cs`).

| Variable IIS / MonsterASP | Equivalente JSON |
|---------------------------|------------------|
| `ConnectionStrings__Default` | `ConnectionStrings:Default` |
| `JwtSettings__Key` | `JwtSettings:Key` |

**No** usar `ConnectionStrings__DefaultConnection` (nombre incorrecto en doc previo).

Si existe una variable de entorno con password antigua, **prevalece sobre** el JSON y simula “nada cambió” tras publicar.

## Riesgo residual

- Password SQL antigua permanece en commits que contenían `new-mcp-server.yaml` hasta reescritura de historial (`git filter-repo` / BFG) o aceptación académica con rotación ya hecha.
- No pegar secretos en chat, issues ni commits; MCP local: `DB_PASSWORD` en variables de usuario Windows.

## Referencias

- Convención: [CLAUDE.md](../../CLAUDE.md) — secretos en user-secrets / env.
- Deploy: [scripts/Deploy-Produccion.ps1](../../scripts/Deploy-Produccion.ps1) (línea `skip` de Production).
- Guard: `.cursor/rules/11_guard_seguridad.mdc`.
- Commit seguridad: `cd6bbd0` — `fix(security): dejar de versionar Continue MCP y reforzar gitignore`.

## Registro de cambios de contexto

- **2026-11-09** — Documento creado tras cierre operativo (API + portal OK post-rotación).
