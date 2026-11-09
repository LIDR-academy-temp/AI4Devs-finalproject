[← index](_index.md) | [← design](design.md)

# Impl: DB-001

- `SQL/DB-001_alineacion_modelo.sql`: renombres §3.2, `fnz.Cuotas` (`CuentaID`, `MontoPagado`, índice único), vistas `tkt.vsTickets`, `sgr.vsUsuarios`, `tkt.vsTicketsUsuariosAsignados`.
- `UserRepository`: detecta columnas lógicas vs físicas.

## Ejecución 2026-10-16

- **MCP `user-CQ500hub`:** renombres + índices OK; smoke 3/3 (Correo, PrioridadesTicket, TipoNotificacion).
- **Vistas:** fallan si falta DB-000 completo (`CategoriasTicket`, `CasaOcupantes`, …).
- **Local (2026-10-16):** BD `CuartaQuinientos` en `localhost` (SQL Server 2022, `-E`); schema reordenado por FK (`SQL/tools/reorder_schema_tables.py`); DB-001/DB-002 con `sqlcmd -I`.

## Pendiente (readme Ticket 34 completo)

- `bi.KpiSnapshots`, FK `ntf.NotificacionesEntrega`, drop `Column_20/21` si aplica.
