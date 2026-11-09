[← index](_index.md) | [design →](design.md)

# spec.md — DB-000: Esquema base desplegable e idempotente (solo estructura)

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — agentes `desarrollador-sql`, `tester-sql`, `auditor-sql`)
> **Tipo:** Feature (habilitador de infraestructura; no es Refactor: el comportamiento del script cambia a propósito — idempotente, sin `USE` fijo, sin datos)

## User story

Como desarrollador del equipo CuartaQuinientos, quiero crear la estructura completa de la base de datos con un solo comando y en cualquier instancia (las veces que haga falta), para que backend, frontend y bot trabajen sobre el mismo modelo (`readme.md` §3 + extensiones §3.3) desde el primer ticket de Entrega 2.

## Contexto / problema

**Documentos de entrada**

| Tipo | Fuente |
|---|---|
| Requerimiento | [readme.md](../../../README.md) §6 Ticket 0 (DB-000), §3 (modelo de datos), §3.3 (extensiones), §5.0 (núcleo: DB-000 es habilitador de HU-USR-01, HU-TKT-01, HU-TKT-03, HU-FNZ-01, HU-FNZ-02) |
| Técnico | `SQL/cuartaquinientos_schema.sql` (fuente única, solo estructura), `SQL/README.md`, [specs/base-datos.md](../../specs/base-datos.md), ADR-001 y ADR-008 (`readme.md` §2.5.1) |
| Mockup | N/A (sin interfaz gráfica) |

**Comportamiento actual** (verificado leyendo el script; BD aún no desplegada, sin evidencia MCP):

- `SQL/cuartaquinientos_schema.sql` contiene 56 sentencias `USE [db24572]`: aunque se ejecute con `sqlcmd -d <BD>`, cada `USE` cambia el contexto y puede escribir en otra BD.
- Las tablas del bloque baseline se crean sin guarda `IF OBJECT_ID(...) IS NULL`: una segunda ejecución falla (las extensiones §3.3 ya tienen guarda).
- El script solo crea los esquemas `bot`, `ia`, `bi`, `wms`; en una BD vacía los `CREATE TABLE sgr.*`, `tkt.*`, etc. fallan porque los 11 esquemas base no existen.
- `usr.vsMascotas` y `usr.vsAutomoviles` están definidas dos veces (bloque `20260425_alter_views_mascotas_automoviles.sql` con `LEFT JOIN` sin `GO` entre ambas, y bloque `vistas_relacionadas.sql` con `INNER JOIN`): la segunda falla en re-ejecución y pisa la versión `LEFT JOIN`.
- 2026-09-24: ya se retiraron del script todos los bloques de datos (baseline + 4 scripts seed); copia histórica fuera del repo de entrega.

**Comportamiento esperado:** `sqlcmd -S <srv> -d CuartaQuinientos -i SQL/cuartaquinientos_schema.sql` despliega 16 esquemas, 73 tablas y 18 vistas `vs*` sobre una BD vacía, sin datos, y puede re-ejecutarse sin errores.

**Requerimientos relacionados** ([_graph.md](../../_graph.md), [FASE1_ROADMAP](../FASE1_ROADMAP.md)): DB-000 es el primer ticket de la cadena `SETUP-000 → DB-000 → DB-001 → DB-002 → USR-BE-007`.

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra
- Eliminar los 56 `USE [db24572]`; la BD se elige con `sqlcmd -d` (o selector de SSMS).
- Guarda inicial que aborta si `DB_NAME()` es `master`, `model`, `msdb` o `tempdb`.
- Crear de forma idempotente (`IF SCHEMA_ID(N'<esq>') IS NULL EXEC (N'CREATE SCHEMA [<esq>]')`) los 11 esquemas base `sgr`, `tkt`, `fnz`, `ntf`, `usr`, `vts`, `enc`, `jnt`, `anm`, `arc`, `api` antes de la primera tabla (`dbo` ya existe).
- Guardas `IF OBJECT_ID(N'[esq].[Tabla]', N'U') IS NULL` en cada `CREATE TABLE` del baseline; vistas con `CREATE OR ALTER VIEW`.
- Una sola definición de `usr.vsMascotas` y `usr.vsAutomoviles` (versión `LEFT JOIN`), cada una en su batch terminado en `GO`.
- Script solo DDL: sin `INSERT`, `UPDATE`, `MERGE` ni `IDENTITY_INSERT`.
- Suite `SQL/pruebas/DB-000_PruebasIntegracion.sql` a partir de `sdd-toolkit/templates/pruebas.sql` (`BEGIN TRAN … ROLLBACK`, con caso negativo y anotación `[OK] TESTS`).

### Should — esperado; negociable vía escalación al usuario si tiempo/riesgo aprieta
- Smoke de contrato de lectura: `SELECT TOP 0` sobre `tkt.vsTickets` y `sgr.vsUsuarios` (consumidos por TKT-BE-001 y USR-BE-007).
- `SQL/README.md` actualizado con el comando de despliegue y cómo correr la suite.

### Could — solo si sale gratis durante la implementación; jamás bloquea
- Marcadores `-- BEGIN: <bloque>` / `-- END: <bloque>` por sección para facilitar el diff del PR (script de ~3.4k líneas).

### Won't — fuera de alcance explícito
- Cualquier dato, catálogo o administrador inicial (estados, prioridades, perfiles, tipos de notificación) → **DB-002** (`readme.md` §6 Ticket 35).
- Renombres y columnas nuevas del diccionario lógico ↔ físico §3.2 (incluida la errata de columna en `ntf.TiposNotificacion`) → **DB-001** (`readme.md` §6 Ticket 34).
- Tablas o columnas de negocio nuevas.
- Stored procedures de negocio (ADR-001: servicios C# + Dapper).
- EF / migraciones automáticas (DbUp, Flyway) — Fase 2 `(asumido)`.

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | `SQL/cuartaquinientos_schema.sql` modificado (estructura idempotente, sin `USE`, sin datos); `SQL/pruebas/DB-000_PruebasIntegracion.sql` nuevo; `SQL/README.md` actualizado |

## Invariantes — reglas existentes que DEBEN sobrevivir al cambio

| # | Regla existente que NO se toca | Fuente |
|---|---|---|
| INV-1 | Un solo script despliega todo el modelo sobre una BD vacía con `sqlcmd -d <BD>`; sin nombre de BD fijo | `specs/base-datos.md` (INV-1) |
| INV-2 | El script es idempotente: re-ejecutarlo no falla ni duplica filas | `specs/base-datos.md` (INV-2) |
| INV-3 | El script base no contiene datos; todas las tablas quedan vacías tras desplegar (datos de referencia en DB-002) | `specs/base-datos.md` (INV-3) |
| INV-4 | Sin stored procedures de negocio | `specs/base-datos.md` (INV-4), ADR-001 |
| INV-5 | Toda tabla de negocio tiene PK; todas las FK declaradas están habilitadas | `specs/base-datos.md` (INV-5) |

## Propiedades (PBT-x) — invariantes a nivel dato (OPCIONAL)

- PBT-1: Para toda tabla de usuario `t` en `sys.tables` tras desplegar, `SUM(p.rows)` de `t` = 0.
- PBT-2: Para toda FK `f` en `sys.foreign_keys`, `f.is_disabled = 0` y `f.is_not_trusted = 0`.
- PBT-3: Para toda tabla de negocio `t` en `sys.tables`, existe una fila en `sys.key_constraints` con `type = 'PK'` y `parent_object_id = t.object_id`.

## Criterios de aceptación

- [ ] **CA-1 [M]**: despliegue en BD vacía — **Dado** una BD vacía `CuartaQuinientos` (solo `dbo`) **Cuando** se ejecuta `sqlcmd -S <srv> -d CuartaQuinientos -i SQL/cuartaquinientos_schema.sql` **Entonces** termina sin errores y `SQL/cuartaquinientos_schema.sql` contiene 0 ocurrencias de `USE [` con nombre de BD fijo.
- [ ] **CA-2 [M]**: guarda anti-BD de sistema — **Dado** una conexión a `master` (o `model`, `msdb`, `tempdb`) **Cuando** se ejecuta `sqlcmd -S <srv> -d master -i SQL/cuartaquinientos_schema.sql` **Entonces** el script emite `RAISERROR` de severidad 16 y `master` no gana ningún objeto de los 16 esquemas del dominio.
- [ ] **CA-3 [M]**: idempotencia — **Dado** una BD donde CA-1 ya se ejecutó **Cuando** se ejecuta el mismo comando `sqlcmd` una segunda vez **Entonces** termina sin errores y el inventario de CA-4 no cambia.
- [ ] **CA-4 [M]**: inventario — **Dado** la BD desplegada por CA-1 **Cuando** la suite `SQL/pruebas/DB-000_PruebasIntegracion.sql` cuenta `sys.schemas` (de usuario), `sys.tables` y `sys.views` con prefijo `vs` **Entonces** obtiene 16 esquemas, 73 tablas y 18 vistas.
- [ ] **CA-5 [M]**: esquemas base — **Dado** una BD vacía (solo `dbo`) **Cuando** se ejecuta el script **Entonces** los 11 esquemas base se crean con guarda `IF SCHEMA_ID(...) IS NULL` antes de la primera sentencia `CREATE TABLE` y `SELECT name FROM sys.schemas` devuelve los 16 esquemas del dominio.
- [ ] **CA-6 [M]**: vistas sin duplicado — **Dado** el archivo `SQL/cuartaquinientos_schema.sql` **Cuando** se busca la definición de `usr.vsMascotas` y `usr.vsAutomoviles` **Entonces** existe exactamente una sentencia `CREATE OR ALTER VIEW` por vista (versión `LEFT JOIN`), cada una seguida de `GO`, y ninguna vista del script aparece definida dos veces.
- [ ] **CA-7 [M]**: `LEFT JOIN` no pierde filas — **Dado** dentro de `BEGIN TRAN … ROLLBACK` una mascota con `RazaMascotaID = NULL` (con `RazaLibre`) y un vehículo con `ModeloID = NULL` (con `ModeloLibre`) **Cuando** la suite consulta `usr.vsMascotas` y `usr.vsAutomoviles` **Entonces** ambas filas aparecen en su vista.
- [ ] **CA-8 [M]**: sin datos — **Dado** la BD desplegada por CA-1 **Cuando** la suite suma `sys.partitions.rows` de todas las tablas de usuario **Entonces** el total es 0 y el script contiene 0 ocurrencias de `INSERT`, `UPDATE`, `MERGE` e `IDENTITY_INSERT`.
- [ ] **CA-9 [M]**: integridad referencial — **Dado** la BD desplegada por CA-1 **Cuando** la suite consulta `sys.foreign_keys` y `sys.key_constraints` **Entonces** 0 FK tienen `is_disabled = 1` y 0 tablas de negocio carecen de PK.
- [ ] **CA-10 [M]**: caso negativo FK — **Dado** la BD desplegada, dentro de `BEGIN TRAN … ROLLBACK` **Cuando** la suite inserta en `tkt.Tickets` con un `UsuarioSolicitanteID` inexistente **Entonces** SQL Server devuelve el error 547 (violación de FK) y no queda la fila.
- [ ] **CA-11 [S]**: contrato de lectura — **Dado** la BD desplegada **Cuando** la suite ejecuta `SELECT TOP 0 * FROM tkt.vsTickets` y `SELECT TOP 0 * FROM sgr.vsUsuarios` **Entonces** ambas compilan y responden sin error.
- [ ] **CA-R1 [M]**: regresión de INV-4 — **Dado** la BD desplegada por CA-1 **Cuando** la suite cuenta `sys.procedures WHERE is_ms_shipped = 0` **Entonces** el resultado es 0 (el script no introduce stored procedures de negocio).
- [ ] **CA-R2 [S]**: regresión del modelo §3 — **Dado** el diff del PR sobre `SQL/cuartaquinientos_schema.sql` **Cuando** `auditor-sql` revisa cada bloque `CREATE TABLE` **Entonces** ninguna columna, tipo ni nulabilidad cambia respecto a la versión previa (solo se agregan guardas, esquemas, `GO` y se quitan `USE` y la vista duplicada).

## Reutilización detectada (evidencia de la escalera — regla 6)

- `SQL/cuartaquinientos_schema.sql` → se reutiliza como fuente única: ya consolida baseline + extensiones (`sgr.CasaOcupantes`, `sgr.RefreshTokens`, `tkt.CategoriasTicket`, `tkt.CanalesTicket`, `bot.*`, `ia.*`, `bi.KpiSnapshots`, `ntf.NotificacionesEntrega`, `wms.*`).
- Patrón `IF OBJECT_ID(...) IS NULL` de las extensiones §3.3 → se replica tal cual en el bloque baseline (no se inventa patrón nuevo).
- `CREATE OR ALTER VIEW` (nativo de SQL Server) → idempotencia de vistas sin `DROP`.
- `sdd-toolkit/templates/pruebas.sql` → plantilla de la suite (`#TestResults`, `BEGIN TRAN … ROLLBACK`).
- No se crean tablas nuevas: el ticket vuelve desplegable e idempotente lo ya modelado.

## Definition of Ready

- [x] **I**ndependent — no depende de otra story (solo de SETUP-000 para el CI, no para el script)
- [x] **N**egotiable — Should/Could recortables vía escalación
- [x] **V**aluable — cada Must deja la BD desplegable para el resto de Fase 1
- [x] **E**stimable — 3 h (`readme.md` §6 Ticket 0)
- [x] **S**mall — cambios mecánicos por bloque, una sesión
- [x] **T**estable — cada Must tiene CA en Given/When/Then

- [x] Todos los Must tienen criterio de aceptación verificable en Given/When/Then
- [x] Ningún Must depende de un dato/objeto no confirmado por MCP ni declarado aquí (objetos confirmados contra el script; verificación MCP pendiente para Entrega 2 — BD no desplegada)
- [x] Cada Must cabe en una sesión de implementador
- [x] Instancias en scope identificadas (`database:CuartaQuinientos`)
- [x] Sin preguntas abiertas que afecten un Must — P-1 no bloquea: el design adopta ambas medidas (`SET NOEXEC ON` + `sqlcmd -b` documentado)
- [x] Sin dependencias con requerimientos no archivados
- [x] Reutilización evaluada (peldaños 2-3) antes de proponer crear
- [x] Toda cita a otro TKT/objeto se releyó una vez más antes de cerrar

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Datos personales en el repo (el script traía correos reales, hash BCrypt y un usuario API con contraseña en claro) | Alta | Resuelto retirando todos los datos; CA-8 lo blinda |
| `USE [db24572]` fijo escribe en otra BD aunque se ejecute con `-d` | Alta | CA-1 |
| `RAISERROR` sev. 16 no detiene los batches siguientes separados por `GO` si `sqlcmd` corre sin `-b` | Alta | `RAISERROR` + `SET NOEXEC ON` en la guarda `(asumido)` y documentar `sqlcmd -b`; CA-2; P-1 |
| Orden de dependencias: extensiones con FK a `tkt.Tickets` / `sgr.Usuarios` antes de su creación | Media | Orden físico prescrito en design; CA-1 sobre BD vacía |
| Tablas baseline sin guarda fallan en la segunda corrida | Media | CA-3 |
| Vista duplicada `INNER JOIN` pisa la versión `LEFT JOIN` y falla al re-ejecutar | Media | CA-6, CA-7 |
| BD vacía sin catálogos rompe el backend (crear ticket falla) | Media | DB-002 bloquea USR-BE-007 y TKT-BE-001 |
| Errata de columna en `ntf.TiposNotificacion` | Baja | Fuera de alcance: DB-001 |
| Desarrolladores con BD local ya poblada | Baja | CA-3 + recomendar BD nueva en `SQL/README.md` |

## Preguntas abiertas

- P-1: ¿La guarda anti-BD de sistema debe abortar por sí sola (`SET NOEXEC ON` tras `RAISERROR`) o basta documentar `sqlcmd -b`? → **pendiente** (design propone ambas `(asumido)`; el snippet de `readme.md` §6 Ticket 0 solo muestra `RAISERROR`).
- P-2: Migraciones automáticas (DbUp/Flyway) en Fase 2 → **pendiente** `(asumido)`; no afecta ningún Must.

## Quick Checks — antes del handoff al implementador

- [x] Todo CA nombra el actor real (`sqlcmd`, `SQL/cuartaquinientos_schema.sql`, suite `DB-000_PruebasIntegracion.sql`, `auditor-sql`)
- [x] Todo CA tiene criterio medible en Given/When/Then
- [x] Reutilización evaluada (peldaños 2-3 escalera) antes de proponer crear
- [x] Ningún Must depende de objeto no confirmado por MCP o declarado explícitamente (MCP pendiente Entrega 2)
- [x] Contexto/problema: actor real nombrado (`USE [db24572]`, bloques del script)
- [x] Instancias en scope identificadas para cada Must
- [x] Definition of Ready completa — ítems `(asumido)` listados en Preguntas abiertas
- [x] Tipo ≠ Refactor → CHAR-x no aplica
- [x] Toda propiedad PBT-x es universal sobre el dominio de entrada (todas las tablas / todas las FK)
