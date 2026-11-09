[← index](_index.md) | [design →](design.md)

# spec.md — DB-001: Alinear esquema físico al modelo del readme (ADR-008)

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`desarrollador-sql`, `tester-sql`, `auditor-sql`)
> **Tipo:** Feature (habilitador SQL)

## User story

Como desarrollador backend, quiero que el esquema físico use los nombres lógicos del readme §3.2, para que Dapper, vistas `vs*` y contratos §4 hablen el mismo idioma (ADR-008).

## Contexto / problema

**Documentos de entrada**

| Tipo | Fuente |
|---|---|
| Requerimiento | [readme.md](../../../README.md) §6 Ticket 34, §3.2 (diccionario lógico ↔ físico), ADR-008 |
| Técnico | `SQL/cuartaquinientos_schema.sql` (post DB-000), [specs/base-datos.md](../../specs/base-datos.md) |
| Mockup | N/A |

**Comportamiento actual:** columnas físicas heredadas (`CorreoUsuario`, `PasswordUsuario`, …) y vistas que exponen nombres viejos; verificado en script; **sin evidencia MCP** (BD no desplegada — Entrega 2).

**Comportamiento esperado:** script idempotente `SQL/DB-001_alineacion_modelo.sql` aplica renombres, columnas nuevas, índices y recrea vistas; ningún nombre "Físico actual" del diccionario §3.2 permanece (excepción documentada: `ntf.NotificacionesEntrega.CanalID`).

## Alcance (MoSCoW)

### Must
- Script `SQL/DB-001_alineacion_modelo.sql` idempotente: `IF COL_LENGTH` para renombres y columnas nuevas.
- Todas las filas del diccionario §3.2 (renombres `sp_rename`, columnas, FK, índices).
- Vistas ampliadas: `tkt.vsTickets`, `sgr.vsUsuarios` (sin `PasswordHash`), `tkt.vsTicketsUsuariosAsignados`; recrear vistas afectadas con `CREATE OR ALTER VIEW`.
- `tkt.PrioridadesTicket.Orden` + backfill por nombre + índice único filtrado.
- `sgr.Usuarios`: quitar UNIQUE heredado sobre correo; índice único filtrado `Correo WHERE bEliminado = 0`.
- `fnz.Cuotas`: índice único `(CasaID, PeriodoInicio) WHERE bEliminado = 0 AND CasaID IS NOT NULL`.
- `vts.VisitasGeneradas`: eliminar `Column_20`/`Column_21` solo si vacías; si hay datos → abortar con mensaje.
- Suite `SQL/pruebas/DB-001_PruebasIntegracion.sql` (18 vistas `SELECT TOP 0`, casos de índice único, segunda ejecución).

### Should
- Consulta de verificación post-script sobre `sys.columns` (nombres físicos viejos = 0).
- Actualizar `SQL/README.md` con orden DB-000 → DB-001.

### Could
- ninguno

### Won't
- Datos / catálogos → **DB-002**.
- Cambios al baseline de DB-000 salvo lo que DB-001 aplica incrementalmente.
- Stored procedures de negocio.

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | Nuevo `SQL/DB-001_alineacion_modelo.sql`, suite de pruebas |

## Invariantes

| # | Regla | Fuente |
|---|---|---|
| INV-1 | Script idempotente (re-ejecución sin error ni duplicación) | `specs/base-datos.md` INV-2 |
| INV-2 | Sin SP de negocio | INV-4 ADR-001 |
| INV-3 | PK y FK habilitadas tras migración | INV-5 |
| INV-4 | Contrato lógico §3.2 = nombres en código (ADR-008) | readme §3.2 |
| INV-5 | `sgr.vsUsuarios` no expone hash de contraseña | Ticket 34, USR-BE-007 |

## Criterios de aceptación

- [ ] **CA-1 [M]**: idempotencia renombres — **Dado** BD con DB-000 aplicado **Cuando** se ejecuta `sqlcmd … -i SQL/DB-001_alineacion_modelo.sql` dos veces **Entonces** ambas terminan sin error y la segunda no altera metadatos.
- [ ] **CA-2 [M]**: diccionario — **Dado** la suite post-script **Cuando** consulta `sys.columns` **Entonces** ninguna columna listada como "Físico actual" en §3.2 existe (excepto `CanalID` en `ntf.NotificacionesEntrega`).
- [ ] **CA-3 [M]**: correo único filtrado — **Dado** dos usuarios mismo `Correo`, uno `bEliminado=1` y otro `bEliminado=0` **Cuando** inserta/actualiza **Entonces** se permite; dos con `bEliminado=0` **Entonces** error 2601.
- [ ] **CA-4 [M]**: `fnz.Cuotas` — **Dado** cuota existente `(CasaID, PeriodoInicio)` con `bEliminado=0` **Cuando** inserta duplicado **Entonces** error 2601.
- [ ] **CA-5 [M]**: `tkt.vsTickets` — **Cuando** `SELECT TOP 0 CategoriaTicketID, Categoria, CanalID, Canal, CasaID FROM tkt.vsTickets` **Entonces** compila; filas con NULL en esas columnas siguen visibles.
- [ ] **CA-6 [M]**: `sgr.vsUsuarios` — **Entonces** expone `CasaID`, `Numero`, `CondominioID`, `Condominio`; `COL_LENGTH(...,'PasswordHash') IS NULL`; usuario sin casa vigente aparece una fila con NULLs en casa.
- [ ] **CA-7 [M]**: `tkt.vsTicketsUsuariosAsignados` — **Cuando** `SELECT TOP 0 PrioridadTicketID, PrioridadTicket, OrdenPrioridad, FechaCreacionTicket` **Entonces** compila.
- [ ] **CA-8 [M]**: prioridades — **Entonces** `COL_LENGTH('tkt.PrioridadesTicket','Orden') IS NOT NULL` y valores Baja=1…Crítica=4 en filas existentes.
- [ ] **CA-9 [M]**: visitas — **Entonces** `COL_LENGTH('vts.VisitasGeneradas','Column_20') IS NULL` y lo mismo para `Column_21`.
- [ ] **CA-10 [M]**: 18 vistas — **Cuando** la suite hace `SELECT TOP 0` sobre cada vista `vs*` **Entonces** las 18 compilan.
- [ ] **CA-R1 [M]**: regresión INV-2 — **Dado** script aplicado **Cuando** cuenta SP de negocio **Entonces** 0 nuevos SP.

## Reutilización detectada

- `sp_rename`, `IF COL_LENGTH`, `CREATE OR ALTER VIEW` — nativos SQL Server (peldaño 2).
- Diccionario §3.2 readme — fuente única de renombres; no duplicar lista en otro doc.
- Patrón suite desde `sdd-toolkit/templates/pruebas.sql`.

## Definition of Ready

- [x] Dependencia DB-000 documentada
- [x] Objetos confirmados en script fuente (MCP pendiente Entrega 2)
- [x] Must con CA Given/When/Then

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| `Column_20/21` con datos en algún entorno | Alta | Script aborta; escalación manual |
| Renombre en tabla grande | Media | Ventana de mantenimiento; idempotencia |

## Preguntas abiertas

- Ninguna que bloquee Must.

## Quick Checks

- [x] No se citan nombres físicos viejos como contrato de código
- [x] MCP anotado pendiente en design
