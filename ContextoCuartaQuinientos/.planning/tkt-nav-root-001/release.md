[← index](_index.md)

# release.md — NAV-ROOT-001 *(esqueleto)*

## Piezas

| Pieza | Repo | Artefacto |
|-------|------|-----------|
| SQL | SQL | `DB-008_sgr_menus_nav_root.sql` (+ opcional demo BI) |
| API | GraphApi | Endpoints fases D, E, F (según impl.md) |
| Web | Web | Manifest + pantallas A–G |

## Orden de despliegue

1. Backup `sgr.Menus` / `sgr.PerfilMenus` (SELECT count).
2. Ejecutar DB-008 en TEST → smoke `.http` TC-NAV-08.
3. Desplegar API.
4. Desplegar Web.
5. Repetir en PROD tras UAT matriz [MATRIZ_MODULOS.md](MATRIZ_MODULOS.md).

## Rollback

- Web: versión anterior (menú estático fallback si API seed intacto).
- SQL: no DELETE masivo; revertir `bVisible=0` en nodos nuevos si emergencia.

## Canario

- Un usuario por perfil valida sidebar antes de anunciar a todos.
