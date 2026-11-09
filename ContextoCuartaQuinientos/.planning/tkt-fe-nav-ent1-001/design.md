[← spec](spec.md) | [index](_index.md) | [impl →](impl.md)

# design.md — FE-NAV-ENT1-001

## Root cause

1. Admin oculta ítems en **PerfilMenus** (`bVisible = 0`).
2. El API ya no devuelve esas rutas.
3. **`supplementApiNavWithManifest`** las volvía a insertar porque el manifest tenía `implemented: true` (diseño PROD-RES-001 para huecos SGR).

## Estrategia (peldaño 4 — cambio mínimo)

| Capa | Acción |
|------|--------|
| Manifest | `implemented: false` en claves E/F/G |
| Web | `filterNavItemsByManifest` + `filterNavGroupsForItems` en `useNavegacionMenus`; `allowedPaths` derivado de ítems visibles |
| SQL (opcional) | UPDATE idempotente `PerfilMenus.bVisible = 0` por rutas (documentado en inventario) |

No tocar GraphApi ni `menuToNav` supplement (sigue válido para visitas-pases y similares).

## Archivos

| Archivo | Cambio |
|---------|--------|
| `Web/src/shared/navigation/navCatalog.manifest.ts` | `implemented: false` ×3 |
| `Web/src/shared/navigation/appNavigation.ts` | `filterNavItemsByManifest`, `filterNavGroupsForItems` |
| `Web/src/features/navegacion/useNavegacionMenus.ts` | Aplicar filtros post API/static |
| `Web/src/shared/navigation/appNavigation.manifestVisibility.test.ts` | TC-NAV-ENT1-01 |

## Plan de pruebas

| ID | Tipo | Expected |
|----|------|----------|
| TC-NAV-ENT1-01 | Vitest | Rutas E/F/G excluidas con `implemented: false` aunque estén en lista cruda |
| TC-NAV-02 | Vitest existente | Paridad DB-008 claves sigue OK (claves existen; no exigen `implemented: true`) |
| TC-build | tsc | Sin errores |

## Riesgos

- **Bajo**: entrega 2 debe revertir manifest + SQL visible.
- Acceso directo URL si alguien despliega Web viejo: mitigado con guard + manifest en build nuevo.

## Reversión entrega 2

1. Manifest: `implemented: true` en las tres claves.
2. SQL: script inverso `bVisible = 1` o UI Admin → Perfiles.
