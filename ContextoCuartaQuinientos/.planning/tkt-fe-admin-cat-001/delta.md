# Delta: tkt-fe-admin-cat-001-admin-catalog-crud

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

### API (todos `SoloAdministrador` salvo GET catálogos ya públicos al admin)

| Método | Ruta | Notas |
|--------|------|--------|
| POST | `/USR/Mascotas/admin` | Alta padrón por `usuarioId` |
| PUT | `/USR/Mascotas/{id}/admin` | Edición padrón |
| DELETE | `/USR/Mascotas/{id}/admin` | Soft delete |
| POST/PUT/DELETE | `/USR/TiposMascota`, `/USR/TiposMascota/{id}` | Catálogo tipos |
| POST/PUT/DELETE | `/USR/RazasMascota`, `/USR/RazasMascota/{id}` | Catálogo razas |
| POST/PUT/DELETE | `/WMS/Articulos/categorias`, `.../categorias/{categoriaId}` | Catálogo categorías |
| POST/PUT/DELETE | `/VTS/TiposIdentificacion`, `.../{id}` | Catálogo tipos identificación |
| POST/PUT/DELETE | `/USR/Marcas`, `/USR/Marcas/{id}` | Catálogo marcas |
| POST/PUT/DELETE | `/USR/Modelos`, `/USR/Modelos/{id}` | Catálogo modelos (`marcaId` + `modelo`) |

### UI admin

- **Mascotas:** pestañas Padrón \| Tipos \| Razas; toolbar nuevo; acciones en tabla; panel lateral CRUD padrón.
- **Almacén:** pestaña Categorías; hooks con `reload`; mappers PascalCase → DTO front.
- **Visitas:** pestaña Tipos de ID; tipos desde API; selector casa (`useCasasSelect`, `formatCasaLabel`).
- **Vehículos:** pestañas Padrón \| Marcas \| Modelos; `useMarcasCatalog` / `useModelosCatalog` con `reload` tras mutación.

## Comportamiento modificado

- Combos de formularios admin dejan de depender de constantes locales o lecturas sin normalizar.
- Padrón vehículos/mascotas recarga catálogos tras alta en pestaña catálogo.

## Comportamiento eliminado

- Lista hardcodeada `TIPOS_IDENTIFICACION` en schemas admin visitas (sustituida por API).

## Objetos SQL afectados

| Objeto | Tipo | Cambio |
|--------|------|--------|
| `vts.TipoIdentificacion` | tabla | DML seed opcional (`DB-008`) |
| `wms.CategoriasArticulo` | tabla | Uso vía CRUD (esquema `DB-005`) |
| `usr.TiposMascota`, `usr.RazasMascota`, `usr.Marcas`, `usr.Modelos` | tabla | DML vía API soft delete |

## Endpoints API afectados

Ver tabla en **Comportamiento agregado** (todos **NUEVO** o **CAMBIO** respecto a solo-lectura previa en admin).

## Para el reviewer

- **Qué se hizo:** CRUD de catálogos y padrón mascotas admin; alineación visitas/almacén/vehículos.
- **Por qué:** Operación diaria del admin sin SQL manual; combos coherentes con BD.
- **Riesgo:** Medio-bajo — nuevos endpoints mutación; validar autorización admin y soft delete.
- **Qué probar:** Cada pestaña catálogo CRUD → combo en padrón; almacén categorías en artículo; visita con tipo ID nuevo; reiniciar API tras deploy.
- **Rollback:** Revertir `GraphApi` + `Web` + scripts SQL aplicados en BD.

## Aprendizajes

- Respuestas API PascalCase exigen `*Mappers.ts` + hooks `reload` (mismo patrón que visitas/vehículos residente).
- Pestañas catálogo + `refreshCatalogs` en padrón evitan estado stale en selects.

## Decisiones (ADR)

| Fecha | Decisión | Alternativa descartada | Motivo |
|-------|----------|------------------------|--------|
| 2026-10-27 | Ticket FE-ADMIN-CAT-001 documental | Reabrir FE-CRUD-003 | 003 ya ARCHIVADO; bloque entregado en rama actual |
| 2026-10-27 | CRUD inline en pestaña (no modal extra) | Solo modal FormModal | Consistencia con secciones mascotas/vehículos ya usadas |
