[← index](_index.md) | [← spec](spec.md)

# design.md — DB-002: Catálogos y administrador inicial

## Estrategia técnica

Script DML puro post DB-001. `MERGE` por catálogo; variables `sqlcmd` para admin; bloque Demo condicional `IF $(Demo) = 1`. Sin DDL.

### Escalera

| Capacidad | Peldaño | Objeto |
|---|---|---|
| Idempotencia datos | 2 | `MERGE` T-SQL |
| Admin parametrizado | 4 | variables sqlcmd |
| Suite | 5 | `DB-002_PruebasIntegracion.sql` |

## database:CuartaQuinientos

| Objeto | Tipo | Acción |
|---|---|---|
| `SQL/DB-002_seeds_catalogos.sql` | Script DML | crear |
| Tablas catálogo §6 Ticket 35 | Data | MERGE |

```sql
-- ⏳ MCP [CQ500hub] pendiente Entrega 2
IF N'$(AdminCorreo)' = N'' OR N'$(AdminPasswordHash)' = N''
    RAISERROR(N'AdminCorreo y AdminPasswordHash son obligatorios.', 16, 1);
GO
MERGE sgr.Perfiles AS t USING (VALUES ...) AS s ON ...
```

## Orden de implementación

| # | Paso | Dep | Verificación |
|---|------|-----|--------------|
| 1 | MERGE catálogos | DB-001 | SELECT por nombre |
| 2 | Condominio + admin | 1 | login USR-BE-007 smoke |
| 3 | Bloque Demo | 2 | flag |
| 4 | Suite | 3 | idempotencia |

## Plan de pruebas

| Prueba | Tipo | Cubre |
|---|---|---|
| TC-INV-1 | regresión | CA-R1 |
| TC-ERR-1 | negativo | sin variables → fail |
| TC-ERR-2 | negativo | segundo MERGE 0 inserts |
| TC-RB | rollback | DELETE seeds en TRAN test |

## Rollback

DELETE por claves de negocio en entorno dev; prod: restore backup.

## Autoverificación

- [x] Sin credenciales embebidas
- [ ] MCP — pendiente Entrega 2
