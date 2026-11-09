[← index](_index.md) | [← design](design.md)

# Impl: DB-002

- `SQL/DB-002_seeds_catalogos.sql`: MERGE catálogos + admin (post DB-001), `Orden` en prioridades, guard `Correo` obligatorio.

## Ejecución 2026-10-16

- MCP: perfiles, estados, prioridades, tipos NTF, admin `admin@local` (`bActivo=1`, `bActualizarPassword=1`).
- Dev hash ejemplo: `dotnet run -c Release --project SQL/tools/hash_password -- Admin@Cuarta1` → pasar a sqlcmd `-v AdminPasswordHash=…`.

## Pendiente

- `Demo=1`; MERGE categorías/canales/fnz/condominio en BD con DB-000 completo; smoke `POST /SGR/AuthService/GenerateToken`.
