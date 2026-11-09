# Matriz TDD — Entrega 3 (todos los módulos in-scope)

> **Fuente de verdad ejecutable:** los gates `ModulosTddCoverageTests` (API) y `entrega3ModulosTdd.test.ts` (Web) fallan si falta un dominio.
> **Alcance del gate:** presencia de al menos un archivo `*Tests.cs` / `*.test.tsx` por módulo; no mide cobertura de líneas ni flujos E2E.
> **Excluido:** `bot-ia` (v2, documentado en README §alcance).

## Capas por módulo

| Módulo | API (xUnit) | Web (Vitest) | SQL ticket |
|--------|-------------|--------------|------------|
| SGR | Navegación, usuarios, auth, **casas** | Login, admin SGR, navegación | NAV-ROOT, DB-* |
| TKT | Ticket*, validators, transitions | Tickets residente/admin/trabajador | — |
| FNZ | FinanzasService*, cuotas | Estado cuenta, admin finanzas | — |
| ANM | CuartaAnuncios* | Anuncios | ANM-BE-027 |
| ENC | CuartaEncuestas* | Encuestas | ENC-BE-024 |
| JNT | CuartaJuntas* | Juntas | — |
| VTS | Visitas*, reservaciones | Áreas, pases, **validar pase** | — |
| USR | Auto, mascotas | Mis vehículos/mascotas, admin catálogos | — |
| ARC | CuartaArchivos* | Archivos | — |
| WMS | CuartaAlmacen* | Almacén admin | — |
| NTF | Notificacion*, **AvisoGeneral** | Bandeja, **aviso admin** | — |
| Dashboard | DashboardKpi* | HomePage | — |
| BI/RPT | BiKpi*, BiRpt* | Reportes, **biTrendsUtils** | BI-RPT-001 |
| Trabajador | (rutas TKT trabajador vía API compartida) | TrabajadorRoute, TrabajadorTicketsPage | — |
| Shell | — | AppShell, PortalPageLayout, Perfil (layout transversal) | — |

**Runner Entrega 3 vs CI:** ver README §2.6 (filtro xUnit en `Invoke-Entrega3Tests.ps1`).

## Ejecutar todo (local)

```powershell
cd d:\LIDR\ProyectoFinal\feature-entrega-1-AFS   # raíz del repo
.\scripts\Invoke-Entrega3Tests.ps1
```

## SQL TDD (solo tickets con DDL — no por dominio de negocio)

La lógica de negocio vive en C# (ADR-001). Las suites `.sql` en `.planning/tkt-*` validan **cambios de esquema/DML del ticket**, no un SP por módulo.

**BI-RPT-001** — tras aplicar `SQL/DB-010_bi_kpi_snapshots.sql` y menús en BD local:

```powershell
sqlcmd -S localhost -E -d CuartaQuinientos -b -I `
  -i "ContextoCuartaQuinientos\.planning\tkt-bi-rpt-001\20261104_BI-RPT-001_PruebasUnitarias.sql"
```

Esperado en el script: anotación `-- [OK] TESTS [...]` (suite del ticket; requiere MCP/BD según diseño del TKT).

Otras suites SQL de referencia: `SQL/pruebas/DB-000_*`, `DB-001_*`; tickets `ANM-BE-027`, `ENC-BE-024`, `NAV-ROOT-001` en sus carpetas `.planning/`.

## E2E (opt-in)

```powershell
$env:E2E_SMOKE='1'
$env:FASE1_SMOKE_PASSWORD='...'
cd Web; npm run test:e2e
```
