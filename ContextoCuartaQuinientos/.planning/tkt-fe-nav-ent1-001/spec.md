[← index](_index.md) | [design →](design.md)

# spec.md — FE-NAV-ENT1-001: Ocultar menús NAV fases E/F/G (entrega 1)

## User story

Como **administrador** en la entrega 1 del portal, no debo ver en el sidebar **Reportes**, **Integración BOT** ni **Aviso general**, porque esas capacidades pertenecen a [[NAV-ROOT-001]] fases E–G y no forman parte del alcance demostrable de esta entrega.

## Alcance (Must)

- Ocultar en sidebar (y guard de rutas) las rutas:
  - `/admin/reportes`
  - `/admin/integraciones/bot`
  - `/admin/notificaciones/aviso`
- Mantener claves en `navCatalog.manifest.ts` y filas en `sgr.Menus` (DB-008) para reactivación en entrega 2.
- Documentar script SQL opcional `bVisible = 0` en `sgr.PerfilMenus` (alineación BD con producto).
- Retro-SDD completo: spec, design, impl, delta, entregables, inventario, changelog `specs/frontend.md`.

## Fuera de alcance

- Implementar pantallas E/F/G (Reportes, BOT, aviso NTF admin).
- Eliminar filas de `sgr.Menus` o rutas React.
- Cambiar [[NAV-ROOT-001]] epic (sigue pendiente E→G).

## Criterios de aceptación

- [x] **CA-1** Admin no ve los tres ítems en sidebar tras ocultar en BD y desplegar Web.
- [x] **CA-2** Ocultar solo en BD **no basta**: el manifest no re-inyecta ítems (`implemented: false` + filtro).
- [x] **CA-3** `NavMenuGuard` no permite navegar a esas rutas (no están en `allowedPaths`).
- [x] **CA-4** Vitest navegación en verde (`tsc --noEmit`).
- [x] **CA-5** SDD cerrado: `_index` ARCHIVADO, delta, entregables, inventario SQL, `_graph.md`.

## Dependencias

- [[NAV-ROOT-001]] (claves `admin-reportes`, `admin-bot`, `admin-ntf-aviso`)
- [[SGR-FE-001]] (`useNavegacionMenus`, `supplementApiNavWithManifest`)
- [[ENTREGA_MODULOS]] — alcance sin BOT / BI / RPT UI

## Invariantes

- `supplementApiNavWithManifest` sigue añadiendo solo ítems con `implemented: true`.
- Reversión entrega 2: `implemented: true` en manifest + `bVisible = 1` vía script inverso o admin perfiles.
