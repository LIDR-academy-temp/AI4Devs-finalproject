# Spec — FE-ADMIN-CAT-001 (ligero)

> [← index](_index.md)

## 0. Documentos de entrada

| Documento | Fuente |
|-----------|--------|
| Contexto requerimiento | Huecos en admin: sin **Nuevo** / **Acciones** en mascotas; combos vacíos (categorías almacén, tipos ID visitas); sin CRUD marca/modelo en vehículos |
| Contexto técnico | [specs/frontend.md](../../specs/frontend.md) FE-PAT-002, dominios mascotas/almacén/visitas/vehículos |
| Mockup | N/A (misma UX que pestañas vehículos / panel lateral) |

## 1. Objetivo

Dar trazabilidad SDD al bloque ya implementado: **mantener catálogos desde el admin** y que el padrón use datos normalizados (sin listas hardcodeadas ni PascalCase sin mapper).

## 2. Alcance

### In

| Módulo | UI | API (admin) |
|--------|-----|-------------|
| Mascotas | Padrón \| Tipos \| Razas; CRUD padrón `.../admin` | `POST/PUT/DELETE` `/USR/Mascotas/admin`, `/{id}/admin`; CRUD `TiposMascota`, `RazasMascota` |
| Almacén | Tab **Categorías**; fix combo categorías | `POST/PUT/DELETE` `/WMS/Articulos/categorias` |
| Visitas | Tab **Tipos de ID**; casa en filtros/form | `POST/PUT/DELETE` `/VTS/TiposIdentificacion`; seed `SQL/DB-008_*` si tabla vacía |
| Vehículos | Padrón \| Marcas \| Modelos | `POST/PUT/DELETE` `/USR/Marcas`, `/USR/Modelos` |

### Out

- Cambios de esquema WMS masivos (solo scripts ya existentes `DB-005_*` si aplica en BD local).
- Rediseño FE-UX residente ([[FE-UX-006]]).

## 3. Criterios de aceptación

| CA | Criterio |
|----|----------|
| CA-1 | Admin puede crear/editar/eliminar (soft) cada ítem de catálogo en las 4 pantallas |
| CA-2 | Tras alta en catálogo, combos del padrón del mismo módulo muestran el nuevo valor sin recargar la SPA completa |
| CA-3 | Categorías almacén: listado API PascalCase normalizado en front (`almacenMappers`) |
| CA-4 | Visitas: tipos de identificación desde API (no constante en `visitasAdminSchemas`) |
| CA-5 | Mascotas admin: botón nuevo + columna acciones + panel lateral como vehículos |
| CA-T | `npm test` Web en verde |

## 4. Trazabilidad

- Ticket documental **posterior** al código (mismo estilo [[FE-UX-006]]).
- No reabre deltas de [[FE-CRUD-003]] archivados; extiende comportamiento admin.
