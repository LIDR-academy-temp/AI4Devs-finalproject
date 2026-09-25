# CLAUDE.md — CuartaQuinientos

Contexto mínimo para agentes (Claude Code, Cursor). Léelo antes de planificar o escribir código.

## Qué es
Portal de administración condominial: **API ASP.NET Core .NET 9** (REST + GraphQL/HotChocolate, JWT, Dapper) sobre **SQL Server**, **SPA React 18 + TS + Vite + Apollo + Tailwind** y **bot de Telegram en Python** (`python-telegram-bot` 21) que es solo un cliente REST del mismo API.

## Fuentes de verdad (en este orden)
1. `readme.md` — contrato del diseño: modelo §3 (nombres lógicos, ADR-008), API §4, historias §5, tickets §6.
2. `ContextoCuartaQuinientos/.planning/<ticket>/spec.md` + `design.md` — detalle SDD del ticket en curso.
3. `SQL/cuartaquinientos_schema.sql` + `SQL/DB-00N_*.sql` — esquema físico (tras DB-001 coincide con el readme).
Si encuentras una contradicción, **detente y repórtala**; no la resuelvas en silencio.

## Convenciones no negociables
- Sin stored procedures de negocio: servicios C# + Dapper con consultas **parametrizadas** y `IDbTransaction` (ADR-001).
- REST `/{Dominio}/{Controller}` sin prefijo `/api`; errores en `ProblemDetails` con `code` de negocio.
- Identidad siempre del JWT (`sub` = `UsuarioID`); nunca del cuerpo de la petición.
- Catálogos resueltos **por nombre** (estado, prioridad, categoría, canal, tipo de notificación); nada de IDs hardcodeados.
- Auditoría por columnas (`Creado`/`Modificado` = correo, `UsuarioCreacionID`, `FechaCreacion`, …) y soft delete `bEliminado`.
- Notificaciones solo vía `INotificacionService`; envío a Telegram por outbox `ntf.NotificacionesEntrega` (ADR-009).
- El bot no guarda claves de LLM, no consulta la BD y no duplica reglas de negocio.
- Secretos solo en user-secrets / variables de entorno.

## Flujo de trabajo (SDD, modo hybrid)
`/iniciar` → `/definir` (spec + skill `abogado-del-diablo`) → `/diseñar` → `/ejecutar` → `/revisar` → `/completar`.
Un ticket = una rama `feature/<ticket-id>-<slug>` = un PR pequeño hacia `feature/entrega-2-AFS`.
Orden de arranque: `SETUP-000 → DB-000 → DB-001 → DB-002 → USR-BE-007` (ver `ContextoCuartaQuinientos/.planning/FASE1_ROADMAP.md`).

## Comandos
- API: `cd GraphApi && dotnet run` · tests: `dotnet test GraphApi.Tests`
- Web: `cd Web && npm run dev` · tests: `npm test`
- Bot (Entrega 2): `cd Bot && python -m bot.main` · tests: `pytest`
- BD: `sqlcmd -S localhost -E -d CuartaQuinientos -i SQL/<script>.sql`

## Definición de hecho
AC del ticket verificados, tests en verde (unitarios + integración del endpoint), contrato §4 actualizado si cambió, sin romper tests existentes.
