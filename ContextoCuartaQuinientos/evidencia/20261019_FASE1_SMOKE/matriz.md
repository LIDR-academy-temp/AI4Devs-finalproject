# Matriz smoke — Fase 1 (MVP archivado)

> **Tipo:** regresión / evidencia de cierre. **No** sustituye TDD de un ticket Fase 2 (`/test` en rojo).

## Precondiciones

1. SQL Server local con BD `CuartaQuinientos` (ver [SQL/README.md](../../../SQL/README.md)).
2. Scripts aplicados: `cuartaquinientos_schema.sql` → `DB-001` → `DB-002`.
3. Admin: `admin@local`. Tras DB-002 el seed es `Admin@Cuarta1`; en local, si cambiaste contraseña, usa `fase1-smoke.env` (ver `fase1-smoke.env.example`) o variables `FASE1_SMOKE_*`.

## Automatizado (repo)

| ID | Capa | Comando | Criterio |
|----|------|---------|----------|
| SMK-API-1 | API in-process | `dotnet test --filter Category=Smoke` | Login + GET núcleo → HTTP 200 |
| SMK-WEB-1 | Web Vitest | `cd Web && npm test` | Tests componente/rutas existentes en verde |
| SMK-WEB-2 | Web Vitest | `fase1Routes.test.tsx` | `/login` renderiza (rutas Fase 1) |
| SMK-RUN | Orquestación | `.\scripts\Invoke-Fase1Smoke.ps1` | Genera `resultado.md` + logs |

## Manual UI (navegador)

| ID | Ruta | Criterio |
|----|------|----------|
| SMK-UI-1 | `/login` | Login sin error CORS |
| SMK-UI-2 | `/cambiar-password` | Tras seed, cambio obligatorio OK |
| SMK-UI-3 | `/` | Dashboard admin carga KPIs |
| SMK-UI-4 | `/admin/tickets` | Lista admin (vacía permitida) |
| SMK-UI-5 | `/admin/finanzas` | Pantalla finanzas admin |
| SMK-UI-6 | Campana NTF | Bandeja abre sin 500 |

Web: `npm run dev` + API `dotnet run --urls http://localhost:5180` (`DOTNET_ROLL_FORWARD=Major` si no hay .NET 9).

## Endpoints API (tras login)

| Módulo | GET |
|--------|-----|
| Health | `/health` |
| Dashboard | `/Dashboard/Resumen` |
| Tickets | `/TKT/Tickets/admin`, `/TKT/Tickets/mis` |
| Catálogos | `/TKT/CategoriasTicket`, `/TKT/EstadosTickets` |
| Finanzas | `/FNZ/Cuotas?usuarioId={id}`, `/FNZ/Cuotas/mis` |
| Notificaciones | `/NTF/Notificaciones?pagina=1&tamano=20` |
