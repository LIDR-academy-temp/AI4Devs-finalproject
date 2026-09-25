[← index](_index.md) | [← spec](spec.md)

# design.md — DB-001: Alinear esquema físico al modelo

## Estrategia técnica

Script incremental `SQL/DB-001_alineacion_modelo.sql` ejecutado **después** de DB-000. Orden interno: renombres tablas base → columnas nuevas → índices/FK → backfill `Orden` → vistas `CREATE OR ALTER`. Diccionario §3.2 es checklist autoritativa.

### Escalera de decisión

| Capacidad | Peldaño | Objeto | Descarte |
|---|---|---|---|
| Renombrar columnas | 2 | `sp_rename` + guardas | — |
| Vistas idempotentes | 2 | `CREATE OR ALTER VIEW` | — |
| Índice filtrado correo | 4 | drop UNIQUE legacy + CREATE INDEX | no hay alternativa sin DDL |
| Suite pruebas | 5 | `DB-001_PruebasIntegracion.sql` | template toolkit |

## database:CuartaQuinientos

| Objeto | Tipo | Acción | Notas |
|---|---|---|---|
| `SQL/DB-001_alineacion_modelo.sql` | Script | crear | Todo §3.2 + vistas ampliadas Ticket 34 |
| `sgr.Usuarios`, `tkt.Tickets`, … | Column | modificar | nombres lógicos |
| `sgr.vsUsuarios`, `tkt.vsTickets`, `tkt.vsTicketsUsuariosAsignados` | View | modificar | sin PasswordHash |
| `SQL/pruebas/DB-001_PruebasIntegracion.sql` | Test | crear | 18 vistas + índices |

```sql
-- Esqueleto renombre idempotente — ⏳ MCP [CQ500hub] pendiente Entrega 2
IF COL_LENGTH(N'sgr.Usuarios', N'CorreoUsuario') IS NOT NULL
    EXEC sp_rename N'sgr.Usuarios.CorreoUsuario', N'Correo', N'COLUMN';
GO
-- Repetir patrón por fila del diccionario §3.2
```

## Orden de implementación

| # | Paso | Target | Entregable | Dep | Verificación |
|---|------|--------|------------|-----|--------------|
| 1 | Checklist §3.2 | database | lista renombres | DB-000 | revisión manual |
| 2 | Script renombres/DDL | database | DB-001.sql | 1 | sqlcmd local |
| 3 | Vistas | database | CREATE OR ALTER batch | 2 | CA-10 |
| 4 | Suite | database | pruebas | 3 | TRAN+ROLLBACK |

## Plan de pruebas

| Prueba | Target | Tipo | Cubre |
|---|---|---|---|
| TC-INV-1 | database | regresión | CA-R1 INV-2 |
| TC-ERR-1 | database | negativo | correo duplicado activo → 2601 |
| TC-ERR-2 | database | negativo | cuota duplicada → 2601 |
| TC-ERR-3 | database | negativo | Column_20 con datos → abort |
| TC-RB | database | rollback | script inverso manual `(asumido)` — renombres no auto-reversibles; backup BD |

Ratio integración 100 % vía MCP/sqlcmd.

## Estrategia de rollback

Restaurar backup BD o script inverso parcial documentado en `impl.md`; `sp_rename` inverso solo en ventana controlada.

## Decisiones técnicas

| # | Decisión | Justificación |
|---|---|---|
| 1 | No tocar `CanalID` en NotificacionesEntrega | Ticket 34 excepción |
| 2 | Orden prioridades en DB-001, MERGE Orden en DB-002 | readme Ticket 34/35 |

## Autoverificación

- [x] Won't sin datos DB-002
- [x] TC-INV por invariante
- [ ] Queries MCP — pendiente Entrega 2
