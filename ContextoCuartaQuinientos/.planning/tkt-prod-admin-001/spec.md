# spec.md — PROD-ADMIN-001: Cierre huecos admin y alineación sitio publicado

[← index](_index.md) | [design →](design.md)

> **Tipo:** Feature (correctivo multi-dominio + despliegue BD)  
> Generado: 2026-10-29

## User story

Como **administrador del condominio**, quiero **gestionar catálogos y perfiles desde la web publicada y que los módulos de comunidad/registro no fallen con error interno**, para **operar el portal en producción sin intervención técnica manual**.

## Contexto / problema

Tras publicar API + SPA en SmarterASP, la prueba funcional reveló:

1. **Huecos de producto:** no hay CRUD admin de tipos de anuncio; perfiles sin alta/edición/acciones; archivos y tipos de documento en rutas separadas (no pestañas).
2. **Fallas de despliegue BD:** almacén sin esquema WMS; vista `arc.vsArchivos` desactualizada respecto al contrato del API (columna `FechaCreacion`).
3. **Fallas de robustez API:** resultados de encuestas y altas admin de vehículos/mascotas pueden devolver **500** por excepciones no mapeadas o esquema/vistas desalineados (`DB-009` documenta el escenario prod).

**Causas raíz confirmadas (evidencia en [entrada-contexto-tecnico.md](entrada-contexto-tecnico.md)):**

| ID | Causa | Evidencia |
|----|--------|-----------|
| RC-1 | Vista `arc.vsArchivos` sin `FechaCreacion` | MCP: `COL_LENGTH` null; definición sin columna |
| RC-2 | Esquema `wms` no desplegado | UI + código `WMS_SCHEMA_MISSING` |
| RC-3 | Tipos anuncio: API solo lectura JWT | `TiposAnuncioController` sin POST/PUT/DELETE Cuarta |
| RC-4 | Perfiles: API admin solo listado + permisos | Sin endpoints JWT de upsert/delete perfil |
| RC-5 | Encuestas resultados: agregación Dapper | `COUNT` → `bigint`; cast `(int)` en fila dinámica |
| RC-6 | USR admin: `SqlException` sin mapear | `catch { throw; }` en servicios Cuarta |

## TKTs relacionados

- [[FE-ADMIN-CAT-001]] — catálogos mascotas/almacén/visitas/vehículos (patrón a extender)
- [[ANM-BE-027]] — anuncios JWT
- Script **`SQL/DB-009_fix_views_y_tablas.sql`** — alineación prod (mascotas/vehículos/login)

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra

- Desplegar en prod el **paquete SQL** acordado en `design.md` (incluye `DB-005`, `DB-006`, `DB-009` como mínimo verificado).
- **Archivos:** `GET/POST /ARC/Archivos` operativos tras SQL; UI con pestañas **Archivos | Tipos de documento** (una ruta admin).
- **Almacén:** `POST /WMS/Articulos` operativo tras `DB-005`.
- **Encuestas:** `GET /ENC/Encuestas/{id}/resultados` → 200 para admin con encuesta existente (sin 500).
- **Vehículos / mascotas admin:** errores de validación/FK → 4xx con `code`; no 500 por FK/columna conocida.
- **Tipos de anuncio:** CRUD admin JWT + pestaña en `AdminAnunciosPage`.
- **Perfiles:** CRUD admin JWT + acciones en `AdminPerfilesPage` (mantener permisos menú).

### Should

- Redirigir `/admin/archivos/tipos` → pestaña tipos (compatibilidad menú `admin-archivos-tipos`).
- `PROD-ADMIN-001_api_tests.http` + `TKT-PROD-ADMIN-001-APIS.md` en `/revisar`.
- Inventario de cambios en `SQL/` según plantilla del proyecto.

### Could

- Checklist automatizado pre-deploy (`SetupDiagnostics` ampliado, solo lectura esquema).

### Won't

- Rediseño visual global ([[FE-UX-006]]).
- BOT / GraphQL / nuevos dominios.
- Stored procedures de negocio (ADR-001).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | Ejecutar scripts; validar vistas/tablas |
| `backend:GraphApi` | Endpoints ANM/SGR; fixes ENC/USR; manejo SqlException |
| `frontend:cuartaquinientos-web` | Pestañas archivos/anuncios; CRUD perfiles |

## Invariantes

| # | Regla | Fuente |
|---|---|---|
| INV-1 | Soft delete `bEliminado = 0` en consultas | `_graph.md` INV-G1 |
| INV-2 | Sin SP de negocio; Dapper parametrizado | CLAUDE.md ADR-001 |
| INV-3 | Admin vía policy `SoloAdministrador` | Controllers existentes |
| INV-4 | Catálogos resueltos por **nombre**, no IDs hardcodeados en UI | readme § convenciones |
| INV-5 | Identidad JWT (`sub`), nunca del body | CLAUDE.md |

## Criterios de aceptación

### Despliegue BD

- [x] **CA-1 [M] BD-ARC** — **Dado** prod sin `FechaCreacion` en `arc.vsArchivos` **Cuando** se ejecuta `DB-006` **Entonces** `COL_LENGTH('arc.vsArchivos','FechaCreacion')` IS NOT NULL.
- [x] **CA-2 [M] BD-WMS** — **Dado** prod sin `wms.Articulos` **Cuando** se ejecuta `DB-005_wms_schema.sql` **Entonces** `OBJECT_ID('wms.Articulos')` IS NOT NULL.
- [x] **CA-3 [M] BD-USR** — **Dado** prod con vistas usr desalineadas **Cuando** se ejecuta `DB-009_fix_views_y_tablas.sql` **Entonces** `SELECT TOP 1 1 FROM usr.vsMascotas` no error.

### API

- [x] **CA-4 [M] ENC** — **Dado** encuesta id=1 con preguntas y al menos una respuesta opción **Cuando** `GET /ENC/Encuestas/1/resultados` con JWT admin **Entonces** HTTP 200 y JSON con `preguntas[].opciones[].conteo` numérico.
- [x] **CA-5 [M] ARC** — **Dado** BD post CA-1 **Cuando** `GET /ARC/Archivos` JWT admin **Entonces** HTTP 200 (array, puede vacío).
- [x] **CA-6 [M] WMS** — **Dado** BD post CA-2 **Cuando** `POST /WMS/Articulos` body válido **Entonces** HTTP 201 (no 400 WMS_SCHEMA_MISSING).
- [x] **CA-7 [M] ANM tipos** — **Cuando** `POST /ANM/TiposAnuncio` nombre nuevo **Entonces** 201; duplicado → 409 `TIPO_DUPLICADO`; `PUT`/`DELETE` soft delete coherentes.
- [x] **CA-8 [M] SGR perfiles** — **Cuando** `POST /SGR/Perfiles/admin` perfil nuevo **Entonces** 201; `PUT`/`DELETE` admin; perfil con usuarios asignados → delete 409 `PERFIL_EN_USO`.
- [x] **CA-9 [M] USR admin** — **Cuando** `POST /USR/Automoviles/admin` con `marcaId` inexistente **Entonces** HTTP 422 `VEH_MARCA_INVALIDA` (no 500). Análogo mascotas `MAS_TIPO_INVALIDO`.

### Frontend

- [x] **CA-10 [M] UI archivos** — **Dado** admin en `/admin/archivos` **Entonces** pestañas visibles Archivos | Tipos de documento; CRUD tipos sin navegar a otra ruta.
- [x] **CA-11 [M] UI anuncios** — **Entonces** pestaña Tipos de anuncio con CRUD; combo de nuevo anuncio recarga tras alta de tipo.
- [x] **CA-12 [M] UI perfiles** — **Entonces** botón Nuevo perfil, editar, eliminar (confirmación), columna acciones; enlace Permisos menú se mantiene.

### Regresión

- [x] **CA-R1 [M]** — **Dado** residente **Cuando** `GET /ANM/TiposAnuncio` **Entonces** sigue 200 (solo lectura).
- [x] **CA-R2 [M]** — **Dado** admin **Cuando** `PUT /SGR/Perfiles/{id}/permisos-menus` **Entonces** comportamiento idéntico a hoy (INV permisos).

## Reutilización detectada

| Objeto / patrón | Decisión |
|-----------------|----------|
| `TiposArchivoController` + `CuartaArchivosService.CrearTipoAsync` | Peldaño 3 — replicar contrato en ANM tipos |
| `AdminTiposIdentificacionSection` | Peldaño 3 — sección embebida en pestaña |
| `AdminTiposArchivoPage` | Peldaño 4 — fusionar en `AdminArchivosPage`, no duplicar lógica |
| `IPerfilesService` legacy | Peldaño 3 — lógica insert/update/delete reutilizable desde servicio Cuarta |
| `DB-006`, `DB-005`, `DB-009` | Peldaño 2 — scripts existentes, no nuevo DDL salvo doc orden |

## Definition of Ready

- [x] Entradas obligatorias en carpeta ticket
- [x] Must con CA Given/When/Then
- [x] Causas RC-1..RC-6 con evidencia
- [x] Usuario confirma Must MoSCoW (smoke prod 2026-10-30)
- [x] Instancias scope identificadas
- [x] Reutilización documentada

## Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Prod distinta a MCP test | Alta | `release.md` + smoke en prod post-deploy |
| Delete perfil sistema (Administrador) | Alta | Bloquear delete IDs sembrados DB-002 |
| Tipos anuncio en uso | Media | Soft delete; validar FK `anm.Anuncios` |
| Ventana SQL en SmarterASP | Media | Scripts idempotentes; orden en design |

## Preguntas abiertas

- ¿Prod ya ejecutó `DB-001`? → **(asumido)** parcial; `DB-009` cubre vistas críticas.
- ¿Consolidar menú `admin-archivos-tipos` en NAV? → **Should** redirect en FE.

## Pasada adversarial (abogado-del-diablo)

| # | Objeción | Respuesta / acción en design |
|---|----------|------------------------------|
| A1 | “Solo ejecutar SQL” arregla todo | Insuficiente: ANM/SGR/ENC/USR requieren código; CA-7..CA-9 obligan API |
| A2 | CA-9 imposible sin saber error prod exacto | Spike acotado en paso 2 design: reproducir en TEST con FK inválida; mapeo SqlException 547 |
| A3 | XL mezcla deploy + 4 dominios | Orden fijo: SQL → API fixes → API nuevos → FE; release.md por fase |
| A4 | Pestañas archivos rompen bookmark `/tipos` | Should: redirect + test Vitest ruta |
| A5 | `(int)` cast única causa ENC 500 | CA-4 + TC-ROJO-ENC; si persiste, escalar con log prod |

**Veredicto adversarial:** spec aprobable tras validar design y suite TEST.

## Quick Checks

- [x] CA nombran endpoints reales
- [x] Must medibles
- [x] Reutilización evaluada
- [x] INV listados
