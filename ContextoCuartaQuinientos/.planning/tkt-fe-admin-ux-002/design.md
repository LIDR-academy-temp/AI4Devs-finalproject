[← index](_index.md) | [← spec](spec.md) | [impl →](impl.md)

# Design — FE-ADMIN-UX-002

## Estrategia

| Área | Enfoque |
|------|---------|
| Menús | Reutilizar `AdminSplitLayout` + `AdminSidePanel`; nueva API inversa perfil↔menú |
| Finanzas | Extraer `*TableFilter.ts` + componentes tabla; mismo patrón Morosos |
| Vigencia ANM | **Semántica negocio:** vigente hasta fecha D = visible todo el día D; API compara `CAST(... AS date)` |

## API nueva (SGR)

```
GET  /SGR/Menus/admin/{menuId}/permisos-perfiles
PUT  /SGR/Menus/admin/{menuId}/permisos-perfiles
Body: { "perfiles": [ { "perfilId", "visible" } ] }
```

Sincroniza solo filas de ese `MenuID` (soft-delete perfiles no listados).

## Frontend menús

- `MenuPerfilPermisosPanel` — espejo de `PerfilPermisosPanel`.
- Guardar menú + permisos en un clic (editar).
- `menuAdminFormUtils.ts`, `MenuTreeEditor`, CSS `.cq-admin-menu-tree*`.

## Plan de pruebas

| ID | Capa | Qué |
|----|------|-----|
| T-W1 | Vitest | `menuAdminFormUtils`, `anunciosAdminSchemas.vigenteHastaToIso`, `CuotasAdminTable` |
| T-W2 | Vitest | Suite Web completa |
| T-B1 | Manual | Reiniciar GraphApi; residente `/anuncios` tras publicar con vigencia hoy |
| T-B2 | Manual | Admin `/admin/menus` → perfil Residente asignado a `/anuncios` |
