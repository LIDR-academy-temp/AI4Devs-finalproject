# specs/base-datos.md — Base de datos (source of truth SDD, transversal)
> Contexto de dominio para SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado contra `SQL/cuartaquinientos_schema.sql`.
#database #sql #esquema #transversal

## Propósito
Dominio transversal: el esquema físico SQL Server que soporta el modelo lógico de `readme.md` §3 y las extensiones §3.3. Todos los tickets con target `database` dependen de él. Requerimiento de planificación: [DB-000](../.planning/tkt-db-000/_index.md) → [.planning/tkt-db-000](../.planning/tkt-db-000/_index.md).

## Objetos (inventario verificado)
- **Fuente única:** `SQL/cuartaquinientos_schema.sql` (solo estructura: tablas, vistas `vs*`, extensiones `bot`, `ia`, `bi`, `wms`).
- **16 esquemas:** `sgr`, `tkt`, `fnz`, `ntf`, `usr`, `vts`, `enc`, `jnt`, `anm`, `arc`, `api`, `dbo`, `bot`, `ia`, `bi`, `wms`.
- **73 tablas · 18 vistas `vs*`.**
- Auditoría estándar en todas las tablas + soft delete `bEliminado`.

## Invariantes (INV-x)
- **INV-1** Un solo script despliega todo el modelo sobre una BD vacía con `sqlcmd -d <BD>`; sin nombre de BD fijo.
- **INV-2** El script es idempotente: re-ejecutarlo no falla ni duplica filas.
- **INV-3** El script base no contiene datos (`INSERT`/`UPDATE`/`MERGE`); todas las tablas quedan vacías tras desplegar (los datos de referencia van en DB-002).
- **INV-4** Sin stored procedures de negocio (ADR-001: servicios C# + Dapper).
- **INV-5** Toda tabla de negocio tiene PK; todas las FK declaradas están habilitadas.

## Deuda conocida (estado actual del script)
- 56 `USE [db24572]` fijos y tablas baseline sin guarda `IF OBJECT_ID` → se corrigen en DB-000.
- 2026-09-24: se retiraron todos los datos del script (baseline + 4 scripts seed).
- Nombres físicos distintos al contrato (físico actual `CorreoUsuario`/`PasswordUsuario`/`bActivoUsuario` → readme `Correo`/`PasswordHash`/`bActivo`; errata en `ntf.TiposNotificacion` → `TipoNotificacion`; `tkt.DocumentosTicket.DocumentoID` → `ArchivoID`) → fuera de alcance de DB-000; los alinea **DB-001** (diccionario lógico ↔ físico, readme §3.2) antes de escribir código.
- Catálogos y administrador inicial → **DB-002** (sin datos personales).

## Tickets
- [DB-000](../.planning/tkt-db-000/_index.md) (Fase 0, bloquea DB-001 y todo target `database`).
- [DB-001](../.planning/tkt-db-001/_index.md) (readme §6 Ticket 34) — `SQL/DB-001_alineacion_modelo.sql`: renombres `sp_rename` + columnas/FK/índices nuevos, idempotente; recrea con `CREATE OR ALTER VIEW` las vistas afectadas (las 18 compilan). Bloqueado por DB-000.
- [DB-002](../.planning/tkt-db-002/_index.md) (readme §6 Ticket 35) — `SQL/DB-002_seeds_catalogos.sql`: `MERGE` idempotente de perfiles (Administrador, Residente, Guardia, Trabajador), catálogos `tkt.*`, 9 `ntf.TiposNotificacion`, `fnz.TiposMovimiento` + cuenta de mantenimiento, condominio y administrador inicial (`$(AdminCorreo)`, `$(AdminPasswordHash)`); demo opcional `-v Demo=1`. Bloqueado por DB-001; bloquea USR-BE-007.
- Consumidores Fase 2–3: `BOT-BE-004` (readme §6) (`bot.*`), `IA-BE-005` (readme §6) (`ia.*`), `WMS-BE-029` (readme §6) (`wms.*`).
