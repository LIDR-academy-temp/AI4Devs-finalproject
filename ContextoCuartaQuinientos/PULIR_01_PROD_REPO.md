# Pulir Entrega 2 — Punto 1: operación prod = repo

Hub de cierre operativo. Un sub-paso a la vez; marcar `[x]` al terminar.

**BD producción (API):** `db24572` · SmarterASP  
**URLs:** API `https://apicuartaquinientos.runasp.net` · Web `https://cuartaquinientosresidencial.runasp.net`

Referencias: [SQL/20261029_PROD-ADMIN-001_DESPLIEGUE_PROD.md](../SQL/20261029_PROD-ADMIN-001_DESPLIEGUE_PROD.md) · [scripts/Deploy-Produccion.ps1](../scripts/Deploy-Produccion.ps1)

---

## 1.1 Diagnóstico BD (sin tocar nada)

Ejecutar en la BD de la API (panel SmarterASP o `sqlcmd`):

```powershell
$root = "d:\LIDR\ProyectoFinal\feature-entrega-1-AFS\SQL"
sqlcmd -S "<servidor>" -d db24572 -b -I -i "$root\20261029_PROD-ADMIN-001_VALIDAR_GAPS.sql"
sqlcmd -S "<servidor>" -d db24572 -b -I -i "$root\20261029_PROD-ADMIN-001_VALIDAR_BD_COMPLETA.sql"
```

**Criterio de paso:** anotar filas `FALTA` / `BLOQUEANTE`. Si todo `OK` en gaps WMS/ARC/RefreshTokens → ir a **1.3** (deploy binarios).

**Snapshot MCP 2026-10-30 (db24572):**

| Check | Resultado |
|-------|-----------|
| `wms.Articulos` | OK |
| `arc.vsArchivos.FechaCreacion` | OK |
| `sgr.RefreshTokens` | OK |
| Menú `/visitas/pases` | OK (1 fila) |

---

## 1.2 Aplicar SQL faltantes (solo si 1.1 marca FALTA)

**No ejecutar `DB-001` en prod legacy** (ver DESPLIEGUE_PROD.md).

Orden idempotente recomendado:

```powershell
sqlcmd ... -i "$root\20261029_PROD-ADMIN-001_APLICAR_FALTANTES.sql"
# Si sigue faltando algo puntual:
# DB-005_wms_schema.sql, DB-006_arc_vsarchivos_fechacreacion.sql, DB-009_fix_views_y_tablas.sql
```

Scripts **posteriores al núcleo** (según ticket / smoke):

| Script | Ticket |
|--------|--------|
| `20261030_sgr_visitas_pases_menu_residente.sql` | PROD-RES-001 |
| `20261029_vts_areas_menus_y_seed.sql` | VTS áreas |
| `20261029_fnz_tipos_cuenta_catalog.sql` | Finanzas admin |
| `20261029_fnz_cuotas_monto_mora.sql` | Finanzas |
| `20261030_vts_visitas_una_ocasion.sql` | Visitas |
| `20261029_FIX-PROD-002_vistas_rotas.sql` | Solo si VALIDAR lo pide |

Smoke SQL rápido:

```sql
SELECT COL_LENGTH('arc.vsArchivos','FechaCreacion') AS ArcFecha;
SELECT OBJECT_ID('wms.Articulos','U') AS Wms;
SELECT COUNT(*) FROM sgr.Menus WHERE Ruta = N'/visitas/pases' AND bEliminado = 0;
```

---

## 1.3 Desplegar GraphApi

Desde raíz del repo (requiere `.publishSettings` local):

```powershell
.\scripts\Deploy-Produccion.ps1 -Solo Api
```

Incluye: `dotnet test` (Release, sin Smoke) + `dotnet publish` + Web Deploy.

**Criterio:** `https://apicuartaquinientos.runasp.net/health` → 200.

---

## 1.4 Desplegar Web

```powershell
.\scripts\Deploy-Produccion.ps1 -Solo Web
```

Incluye: `npm ci`, `vitest run`, `npm run build`, Web Deploy.

**Criterio:** portal carga login; versión incluye fixes PROD-RES / VTS-AREAS-CRUD de la rama actual.

---

## 1.5 Smoke manual admin + residente

| Ruta | Perfil | Esperado |
|------|--------|----------|
| `/admin/archivos` | Admin | Sin 500 |
| `/admin/almacen` | Admin | Alta artículo OK |
| `/admin/encuestas/1/resultados` | Admin | Resultados OK |
| `/admin/areas-reservas` | Admin | CRUD área + cancelar reserva |
| `/visitas/pases` | Residente | Menú + combo Tipo ID |
| `/encuestas` | Residente | Título visible, responder OK |
| POST ticket | Residente | 201 |

Registrar fecha y captura o nota en este archivo (sección abajo).

---

## 1.6 Cierre SDD (después de smoke OK)

| Ticket | Estado repo | Acción |
|--------|-------------|--------|
| VTS-AREAS-CRUD-001 | **ARCHIVADO** | — |
| PROD-ADMIN-001 | **ARCHIVADO** | — |

---

## Bitácora (rellenar en sesión)

| Fecha | Paso | Resultado |
|-------|------|-----------|
| 2026-10-30 | 1.1 MCP | WMS, ARC FechaCreacion, RefreshTokens, menú pases → OK |
| 2026-10-30 | 1.2 | Omitido (1.1 OK) |
| 2026-10-30 | 1.3 | API publicada — `/health` 200 |
| 2026-10-30 | 1.4 | Web publicada — `/login` 200 |
| 2026-10-30 | 1.5 | Smoke admin + residente OK (autor + otras personas) |
| 2026-10-30 | **Punto 1** | **CERRADO** — prod = repo operativo |
| 2026-10-30 | 1.6 SDD | **VTS-AREAS-CRUD-001** + **PROD-ADMIN-001** → ARCHIVADO |
