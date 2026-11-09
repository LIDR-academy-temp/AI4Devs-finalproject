[← index](_index.md)

# FE-ADMIN-UX-002 — Spec (retro)

## Objetivo

Unificar UX admin en tres frentes detectados en operación:

1. **`/admin/menus`**: árbol usable + panel CRUD; asignar **perfiles** que ven cada menú sin ir solo a permisos por perfil.
2. **`/admin/finanzas`**: pestañas **Cuotas residente** y **Movimientos** con `AdminFilterableTable` (zebra, búsqueda, filtros columna) como Morosos/Cuentas.
3. **Anuncios residente**: comunicados con **Vigente hasta = hoy** deben mostrarse todo el día (bug hora UTC).

## Alcance

| In | Out |
|----|-----|
| Web: `AdminMenusPage`, finanzas tablas, `vigenteHastaToIso` | Rediseño portal residente completo |
| API: `GET/PUT /SGR/Menus/admin/{id}/permisos-perfiles` | Cambio esquema SQL `anm.Anuncios` |
| Repo ANM: comparación vigencia por **fecha** | Nuevo módulo anuncios admin |

## Criterios de aceptación

- [x] **CA-M1** Admin edita menú y marca perfiles Asignado/Visible; guardar persiste `sgr.PerfilMenus`.
- [x] **CA-M2** Árbol menús: buscar, icono, submenú (+), select padre jerárquico, icono desde catálogo.
- [x] **CA-F1** Cuotas residente y movimientos usan toolbar de tabla + `table-striped`.
- [x] **CA-A1** Anuncio con `VigenteHasta` en el día calendario actual aparece en `GET /ANM/Anuncios` (residente).
- [x] **CA-T1** Vitest Web en verde; `tsc --noEmit` OK.

## Operación (recordatorio usuario)

- Publicar anuncios: **`/admin/anuncios`** (perfil Administrador), no desde residente.
- Ver comunicados: **`/anuncios`** (Residente).
