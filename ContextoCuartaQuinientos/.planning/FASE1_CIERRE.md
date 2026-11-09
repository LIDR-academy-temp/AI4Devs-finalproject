# Fase 1 — Cierre SDD (2026-10-16)

Hub: [FASE1_ROADMAP.md](FASE1_ROADMAP.md) · Grafo: [_graph.md](../_graph.md)

## Estado

**24/24 tickets ARCHIVADO** (filas 0–23). Implementación en repo `feature-entrega-1-AFS`; sin PR/git en esta sesión.

## Verificación automática

| Capa | Comando | Resultado |
|------|---------|-----------|
| API | `dotnet test` (GraphApi.Tests) | ver último `resultado.md` en evidencia |
| Web | `npm test` (Web) | ver último `resultado.md` en evidencia |
| **Smoke Fase 1** | `.\scripts\Invoke-Fase1Smoke.ps1` | [evidencia/20261019_FASE1_SMOKE](../evidencia/20261019_FASE1_SMOKE/README.md) |

## Despliegue BD local

Orden: `cuartaquinientos_schema.sql` → `DB-001` → `DB-002` → pruebas `SQL/pruebas/DB-*`. Ver [SQL/README.md](../../SQL/README.md).

## Dominios entregados (MVP)

- Auth JWT + sesión web (USR/FE-030)
- Perfil, cambio contraseña, padrón admin (USR-008/009/036)
- Tickets crear/listar/gestionar (TKT + FE-031/038)
- Notificaciones bandeja + aviso (NTF)
- Finanzas cuenta, admin, morosos, generar cuotas (FNZ + FE-032/039)
- Dashboard KPI (DASH + FE-040)

## Siguiente fase

Fase 2 según [specs/_index.md](../specs/_index.md): bot, encuestas, anuncios, archivos.
