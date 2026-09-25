# Referencia — Esquema SQL Server

> Guía rápida del esquema físico. Modelo lógico oficial: `readme.md` §3 (ERD) y §3.3 (extensiones).
> Fuente única: [`SQL/cuartaquinientos_schema.sql`](../../SQL/cuartaquinientos_schema.sql) — **solo estructura, sin datos**. Despliegue: [`SQL/README.md`](../../SQL/README.md).

## Inventario

| Tipo | Cantidad |
|------|----------|
| Esquemas | **16**: `sgr`, `tkt`, `fnz`, `ntf`, `usr`, `vts`, `enc`, `jnt`, `anm`, `arc`, `api`, `dbo`, `bot`, `ia`, `bi`, `wms` |
| Tablas | **73** |
| Vistas `vs*` | **18** |

Sin stored procedures de negocio (ADR-001). Sin `INSERT`/`UPDATE` en el script: los catálogos se cargan en un ticket posterior de Entrega 2.

## Vistas `vs*` principales

| Esquema | Vistas |
|---------|--------|
| sgr | vsCasas, vsUsuarios, vsPerfiles, vsPerfilMenus, vsMenusBotones, vsPerfilMenuBotones |
| usr | vsMascotas, vsAutomoviles, vsParientes |
| vts | vsReservacionesArea, vsVisitasGeneradas |
| tkt | vsTickets, vsTicketsUsuariosAsignados |
| fnz | vsTransacciones |
| anm / arc | vsAnuncios / vsArchivos |
| wms | vsArticulos, vsPrestamos |

## Extensiones del diseño (§3.3)

| Área | Objetos |
|------|---------|
| Identidad | `sgr.CasaOcupantes`, `sgr.RefreshTokens` |
| Tickets | `tkt.CategoriasTicket`, `tkt.CanalesTicket`, `EsInterno` en comentarios |
| Bot / IA / BI | esquemas `bot`, `ia` (RAG: `ia.Fragmentos`, `ia.Consultas`), `bi.KpiSnapshots` |
| Notificaciones | `ntf.NotificacionesEntrega` (idempotencia de envíos) |
| Almacén | esquema `wms` |

## Convenciones

- Auditoría en todas las tablas: `Creado`, `Modificado`, `UsuarioCreacionID`, `UsuarioModificacionID`, `FechaCreacion`, `FechaModificacion`.
- Soft delete con `bEliminado` (nunca `DELETE` físico en negocio).
- Catálogos por tabla (estados, prioridades, perfiles, tipos): nunca texto libre ni enteros arbitrarios.
- Residente = `sgr.Usuarios` + `PerfilID` + casa (`sgr.Casas` / `sgr.CasaOcupantes`); no existe tabla `Residentes`.

## Entidades ancla

- **`sgr.Usuarios`** — identidad y login.
- **`tkt.Tickets`** — `UsuarioSolicitanteID`, estado/prioridad por catálogo, asignación en `tkt.TicketsUsuariosAsignados`.
- **`fnz.Cuotas`** — cobranza; morosidad = `Pagado = 0` y `FechaVencimiento < hoy`.

## Decisiones pendientes (documentadas)

| Tema | Decisión |
|------|----------|
| Despliegue idempotente y sin nombre de BD fijo | Ticket DB-000 — [../.planning/tkt-db-000/_index.md](../.planning/tkt-db-000/_index.md) |
| Typo `ntf.TiposNotificacion.TipoNotiicfacion` | DB-001 lo renombra a `TipoNotificacion` antes de TKT-BE-001 / NTF-BE-013 (no en DB-000) |
| Carga de catálogos | Ticket posterior de Entrega 2 `(asumido)` |

Ficha de dominio SDD: [../specs/base-datos.md](../specs/base-datos.md).
