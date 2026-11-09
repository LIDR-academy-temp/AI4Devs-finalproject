[← index](_index.md) | [← spec](spec.md)

# design.md — DB-000: Esquema base desplegable e idempotente (solo estructura)

> Generado por: **generador de contexto SDD** tras validar spec.md
> Consumido por: implementador (`implementer.tool` = cursor — `desarrollador-sql` → `tester-sql` → `auditor-sql`)

## Estrategia técnica

**Decisión central:** modificar mecánicamente `SQL/cuartaquinientos_schema.sql` (fuente única) para que sea solo DDL, sin contexto de BD fijo e idempotente por bloque, sin cambiar columnas ni tipos del modelo §3.

1. **Quitar el contexto fijo de BD:** eliminar las 56 líneas `USE [db24572]`; la BD se elige con `sqlcmd -d` (o selector de SSMS). Encabezado con guarda `IF DB_NAME() IN (N'master', N'model', N'msdb', N'tempdb')` → `RAISERROR(..., 16, 1)` seguido de `SET NOEXEC ON` para que los batches posteriores no se ejecuten aunque `sqlcmd` corra sin `-b` `(asumido — spec P-1)`; `SQL/README.md` documenta además `sqlcmd -b`.
2. **Esquemas base:** al inicio, bloque idempotente `IF SCHEMA_ID(N'<esq>') IS NULL EXEC (N'CREATE SCHEMA [<esq>]')` para `sgr`, `tkt`, `fnz`, `ntf`, `usr`, `vts`, `enc`, `jnt`, `anm`, `arc`, `api` (`dbo` ya existe; `bot`, `ia`, `bi`, `wms` conservan su guarda actual).
3. **Idempotencia de estructura:** envolver cada `CREATE TABLE` del baseline en `IF OBJECT_ID(N'[esq].[Tabla]', N'U') IS NULL BEGIN … END` (patrón ya usado en extensiones §3.3); vistas con `CREATE OR ALTER VIEW`.
4. **Vistas duplicadas:** eliminar el segundo `CREATE VIEW usr.vsMascotas` / `usr.vsAutomoviles` (versión `INNER JOIN`) y conservar la versión `CREATE OR ALTER VIEW` con `LEFT JOIN`; cada vista en su propio batch terminado en `GO`.
5. **Cero datos:** el script es solo DDL (datos del baseline y 4 scripts seed ya retirados 2026-09-24). Regla para PRs: ningún `INSERT`/`UPDATE`/`MERGE`/`IDENTITY_INSERT` en este archivo.
6. **Orden físico:** guarda BD → esquemas → catálogos (tabla vacía) → tablas núcleo (`sgr` → `usr`/`vts` → `tkt` → `fnz` → `ntf` → resto) → extensiones (`bot`, `ia`, `bi`, `wms`) → vistas. Bloques separados por `GO`.
7. **Pruebas:** `SQL/pruebas/DB-000_PruebasIntegracion.sql` a partir de `sdd-toolkit/templates/pruebas.sql` (`#TestResults`, `BEGIN TRAN … ROLLBACK`, anotación `[OK] TESTS`).

**Alternativas descartadas:**

- Mantener seeds dentro del script de esquema: mezcla estructura con datos y expone datos personales en el repo; se separa estructura (DB-000) de datos (DB-002).
- Aplicar aquí los renombres del diccionario §3.2: rompe el carácter mecánico del ticket; los hace DB-001.
- Migraciones automáticas (EF / DbUp / Flyway): contradicen ADR-001 (scripts SQL versionados a mano) para Fase 1.
- `DROP` + `CREATE` de vistas: `CREATE OR ALTER VIEW` es nativo y no pierde permisos.

### Escalera de decisión (methodology.md regla 6) — recorrer ANTES de las tablas de objetos

| Capacidad pedida | Peldaño (1-5) | Objeto resultante | Por qué se descartaron los anteriores |
|---|---|---|---|
| Elegir BD destino al desplegar | 2 (nativo) | `sqlcmd -d` / selector de SSMS | 1: es Must (CA-1) |
| Abortar en BD de sistema | 2 (nativo) | `DB_NAME()` + `RAISERROR` + `SET NOEXEC ON` en el encabezado del script | 1: es Must (CA-2) |
| Crear esquemas de forma idempotente | 2 (nativo) | `IF SCHEMA_ID(...) IS NULL EXEC (N'CREATE SCHEMA …')` | 1: es Must (CA-5) |
| Tablas idempotentes | 3 (reuso) | patrón `IF OBJECT_ID(...) IS NULL` de las extensiones §3.3 | 2: `CREATE TABLE` no tiene `IF NOT EXISTS` en SQL Server; el patrón ya existe en el script |
| Vistas idempotentes y sin duplicado | 2 (nativo) + 4 (cambio mínimo) | `CREATE OR ALTER VIEW`; borrar la definición `INNER JOIN` | 3: la versión `LEFT JOIN` ya existe, solo se elimina la duplicada |
| Script sin datos | 4 (cambio mínimo) | `SQL/cuartaquinientos_schema.sql` (ya sin `INSERT`) | 1-3: el retiro de datos ya se hizo; solo se blinda con CA-8 |
| Suite de pruebas | 5 (nuevo) | `SQL/pruebas/DB-000_PruebasIntegracion.sql` | 2: no hay feature nativa de tests en SQL Server; 3: no existe suite previa; 4: no hay objeto a modificar — se parte de `sdd-toolkit/templates/pruebas.sql` |

## database:CuartaQuinientos

| Objeto | Tipo | Acción | Notas |
|---|---|---|---|
| `SQL/cuartaquinientos_schema.sql` | Script DDL | modificar | Sin cambiar columnas ni tipos del modelo §3; quitar 56 `USE`, guarda BD de sistema, 11 esquemas base, guardas `IF OBJECT_ID`, `CREATE OR ALTER VIEW`, deduplicar `usr.vsMascotas` / `usr.vsAutomoviles` |
| 16 esquemas (`sgr`, `tkt`, `fnz`, `ntf`, `usr`, `vts`, `enc`, `jnt`, `anm`, `arc`, `api`, `dbo`, `bot`, `ia`, `bi`, `wms`) | Schema | crear (idempotente) | 11 base nuevos en el script + 4 extensiones existentes + `dbo` |
| 73 tablas | Table | crear (idempotente) | Sin tablas nuevas; solo guardas |
| 18 vistas `vs*` | View | crear/modificar | `CREATE OR ALTER VIEW`; `usr.vsMascotas` y `usr.vsAutomoviles` una sola vez con `LEFT JOIN` |
| `SQL/pruebas/DB-000_PruebasIntegracion.sql` | Script de pruebas | crear | Desde `sdd-toolkit/templates/pruebas.sql` |
| `SQL/README.md` | Documentación | modificar | Comando de despliegue (`sqlcmd -b -d`) y ejecución de la suite |

Sin SP de negocio. Sin EF. Sin tablas nuevas. Sin datos.

```sql
-- Esqueleto propuesto (readme §6 Ticket 0). No es la implementación completa.
-- ⏳ MCP [nesgotest] pendiente Entrega 2 — BD no desplegada; sin resultado MCP todavía.
IF DB_NAME() IN (N'master', N'model', N'msdb', N'tempdb')
BEGIN
    RAISERROR(N'Ejecutar sobre la BD de CuartaQuinientos (sqlcmd -d), no en una BD de sistema.', 16, 1);
    SET NOEXEC ON;  -- (asumido, spec P-1)
END;
GO
IF SCHEMA_ID(N'tkt') IS NULL EXEC (N'CREATE SCHEMA [tkt]');
GO
IF OBJECT_ID(N'[tkt].[EstadosTickets]', N'U') IS NULL
BEGIN
    CREATE TABLE [tkt].[EstadosTickets] ( /* columnas sin cambios respecto a §3 */ );
END;
GO
-- Sin INSERT: la tabla queda vacía; los catálogos se cargan en DB-002.
```

```sql
-- Verificación de inventario (CA-4) — ⏳ MCP [nesgotest] pendiente Entrega 2
SELECT
    (SELECT COUNT(*) FROM sys.schemas WHERE name IN (N'sgr',N'tkt',N'fnz',N'ntf',N'usr',N'vts',N'enc',N'jnt',N'anm',N'arc',N'api',N'dbo',N'bot',N'ia',N'bi',N'wms')) AS Esquemas,
    (SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped = 0) AS Tablas,
    (SELECT COUNT(*) FROM sys.views WHERE is_ms_shipped = 0 AND name LIKE N'vs%') AS Vistas;
-- Esperado: 16 / 73 / 18
```

## Orden de implementación

| # | Paso | Target:Instancia | Entregable | Dependencia | Verificación |
|---|------|-------------------|------------|-------------|--------------|
| 1 | `tester-sql` escribe la suite en ROJO (CA-1..CA-11, CA-R1) contra BD vacía | `database:CuartaQuinientos` | `SQL/pruebas/DB-000_PruebasIntegracion.sql` | — | Suite falla en CA-1/CA-5 sobre BD vacía (Red phase) |
| 2 | `desarrollador-sql` quita `USE`, agrega guarda anti-BD de sistema y bloque de 11 esquemas base | `database:CuartaQuinientos` | Encabezado del script | 1 | `sqlcmd -d master` aborta; `sys.schemas` = 16 |
| 3 | `desarrollador-sql` agrega guardas `IF OBJECT_ID` al baseline, `CREATE OR ALTER VIEW` y elimina duplicados de `usr.vsMascotas` / `usr.vsAutomoviles` | `database:CuartaQuinientos` | `SQL/cuartaquinientos_schema.sql` | 2 | Primera corrida sin errores en BD vacía |
| 4 | `tester-sql` ejecuta doble despliegue + suite en VERDE y anota `[OK] TESTS` | `database:CuartaQuinientos` | Suite con evidencia | 3 | `-- [OK] TESTS [nesgotest] -> <N> PASS` |
| 5 | `desarrollador-sql` actualiza `SQL/README.md`; `auditor-sql` revisa diff (CA-R2) | `database:CuartaQuinientos` | `SQL/README.md` + veredicto auditor | 4 | `auditor-sql` APROBADO |

## Plan de pruebas

| Prueba | Target | Tipo | Cubre CA |
|---|---|---|---|
| `TC-01` | `CuartaQuinientos` | integración (happy) | CA-1 — despliegue en BD vacía sin `USE` fijo |
| `TC-02` | `CuartaQuinientos` | integración | CA-5 — 11 esquemas base antes de la primera tabla |
| `TC-03` | `CuartaQuinientos` | integración (borde) | CA-3 — segunda corrida sin error |
| `TC-04` | `CuartaQuinientos` | integración | CA-4 — inventario 16/73/18 |
| `TC-05` | `CuartaQuinientos` | estático | CA-6 — una sola definición de `usr.vsMascotas` / `usr.vsAutomoviles` |
| `TC-06` | `CuartaQuinientos` | integración | CA-7 — fila con `RazaMascotaID`/`ModeloID` `NULL` aparece en la vista |
| `TC-07` | `CuartaQuinientos` | integración | CA-11 — `SELECT TOP 0` de `tkt.vsTickets`, `sgr.vsUsuarios` |
| `TC-INV-1` | `CuartaQuinientos` | regresión | CA-1 (INV-1: un script, sin BD fija) |
| `TC-INV-2` | `CuartaQuinientos` | regresión | CA-3 (INV-2: idempotente) |
| `TC-INV-3` | `CuartaQuinientos` | regresión | CA-8 (INV-3: 0 filas, sin DML) |
| `TC-INV-4` | `CuartaQuinientos` | regresión | CA-R1 (INV-4: 0 `sys.procedures` de usuario) |
| `TC-INV-5` | `CuartaQuinientos` | regresión | CA-9 (INV-5: FK habilitadas, PK en toda tabla de negocio) |
| `TC-ERR-1` | `CuartaQuinientos` | negativo | CA-10 — `INSERT tkt.Tickets` con `UsuarioSolicitanteID` inexistente → error 547 |
| `TC-ERR-2` | `CuartaQuinientos` | negativo | CA-2 — ejecución con `-d master` → `RAISERROR` sev. 16, sin objetos creados |
| `TC-RB` | `CuartaQuinientos` | rollback | Tras `DROP DATABASE` de la BD de prueba y recreación vacía, el script vuelve a desplegar sin error |

### Ratio de pruebas (Testing Trophy)

- Integración: ~90 % (suite T-SQL sobre BD real `nesgotest` / instancia local vacía)
- Estático: ~10 % (búsqueda de `USE [`, `INSERT`, duplicados de vista en el archivo)
- Mocks: ninguno

### Triangulación

| Comportamiento | Dataset A | Dataset B | Qué generaliza |
|---|---|---|---|
| Despliegue idempotente | BD vacía (solo `dbo`) | BD ya desplegada por la corrida anterior | que las guardas funcionan en ambos estados, no solo en BD vacía |
| Vista `LEFT JOIN` | mascota/vehículo con catálogo (`RazaMascotaID`/`ModeloID` no `NULL`) | mascota/vehículo con catálogo `NULL` (`RazaLibre`/`ModeloLibre`) | que la vista no filtra filas por FK nula |

## Estrategia de rollback

El cambio es solo DDL sobre BD nueva y no mueve datos: rollback = revertir el PR en `feature/entrega-2-AFS` y, en la BD de desarrollo, `DROP DATABASE` + recrear vacía + desplegar la versión anterior del script. No hay datos que restaurar (INV-3).

## Pre-mortem

- **Si esto falla en PROD, la causa más probable es:** el script se ejecuta sin `-d` (o en `master`) y la guarda no detiene los batches siguientes, o una extensión con FK se crea antes que su tabla referenciada en una BD vacía.
- **Cómo lo detectamos:** `TC-ERR-2` y `TC-01` en CI (Testcontainers de SETUP-000 aplica el script sobre BD vacía); consulta de inventario de CA-4.
- **Acción inmediata:** `DROP DATABASE` de la BD afectada (vacía) y avisar al dueño del ticket; en BD de sistema, eliminar los esquemas del dominio creados por error.

## Decisiones técnicas (auditoría)

| # | Decisión | Justificación |
|---|---|---|
| D-1 | Suite nueva `SQL/pruebas/DB-000_PruebasIntegracion.sql` (único objeto peldaño 5) | 2: SQL Server no trae framework de pruebas nativo en el stack; 3: no existe suite previa en `SQL/pruebas/`; 4: no hay objeto existente que ampliar |
| D-2 | Conservar `LEFT JOIN` en `usr.vsMascotas` / `usr.vsAutomoviles` | No pierde filas con FK de catálogo `NULL` (`readme.md` §6 Ticket 0) |
| D-3 | Separar estructura (DB-000) de datos (DB-002) | Evita datos personales en el repo e idempotencia mezclada con DML |
| D-4 | `SET NOEXEC ON` tras `RAISERROR` `(asumido)` | `RAISERROR` sev. 16 no aborta batches posteriores sin `sqlcmd -b`; pendiente confirmar (spec P-1) |

## Autoverificación antes del handoff

**Consistencia con spec.md:**
- [x] Ningún objeto/tabla de este design.md implementa algo listado como `Won't` en spec.md (sin datos, sin renombres, sin SP, sin EF)
- [x] Cada fila de "Plan de pruebas" `TC-INV-x` corresponde a un invariante real de spec.md (INV-1..INV-5)

**Calidad del artefacto:**
- [ ] Toda query/comando SQL verificado con MCP — **pendiente Entrega 2** (BD no desplegada); snippets anotados `⏳ MCP [nesgotest] pendiente`
- [x] Orden de implementación: cada paso tiene Entregable + Dependencia explícita
- [x] Sin falsa agencia: cada paso nombra el actor real (`tester-sql`, `desarrollador-sql`, `auditor-sql`, `sqlcmd`)
- [ ] Toda query/comando propuesto verificado antes de escribirlo — objetos verificados contra `SQL/cuartaquinientos_schema.sql`; verificación MCP pendiente Entrega 2
- [x] Spec sin CHAR-x (Tipo Feature) → no aplica `TC-CHAR-x`
- [x] Cada comportamiento nuevo tiene ≥ 2 datasets en la tabla de Triangulación
