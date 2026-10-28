# specs/anuncios.md — Anuncios (source of truth SDD)
> Contexto de dominio SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado; lo nuevo (delta).

## Propósito
Comunicados generales del fraccionamiento (avisos, comunicados de administración), tipificados y con bitácora de quién los visualizó. Dominio de solo lectura para el residente; publicación para Administrador. Esquema real `anm` (ANM = **Anuncios/comunicados**, NO mascotas — corrección confirmada contra el DDL).

## Objetos del dominio (tablas + vistas reales)
Esquema `anm`:
- `anm.Anuncios` — comunicado publicado (título, contenido, tipo, vigencia).
- `anm.TiposAnuncio` — catálogo de tipos de anuncio.
- `anm.LogVisualizacionAnuncios` — bitácora de lecturas (qué usuario vio qué anuncio y cuándo).
- Vista: `anm.vsAnuncios` — anuncios con datos denormalizados de tipo/autor para listados.

Todas las tablas comparten el patrón de auditoría del sistema (`Creado`, `Modificado`, `UsuarioCreacionID`, `UsuarioModificacionID`, `FechaCreacion`, `FechaModificacion`) y **soft delete** con `bEliminado`.

## Catálogos y estados
- `anm.TiposAnuncio`: catálogo data-driven (valores sembrados concretos `(asumido)`; p. ej. General, Urgente, Mantenimiento).
- Estado de vigencia: se maneja por fechas/bandera de activo en `anm.Anuncios` (`(asumido)` los nombres exactos de columnas de vigencia). No hay máquina de estados compleja.

## Invariantes (INV-x)
- **INV-1**: todo acceso a un anuncio por un residente se registra en `anm.LogVisualizacionAnuncios` (una lectura => una fila; idempotencia por usuario+anuncio `(asumido)`).
- **INV-2**: el borrado es lógico (`bEliminado = 1`); nunca DELETE físico.
- **INV-3**: `anm.Anuncios.TipoAnuncioID` referencia siempre un tipo existente en `anm.TiposAnuncio`.
- **INV-4**: publicación restringida a perfiles con `bAdministrador = 1` (Administrador); lectura abierta a residentes autorizados.

## Historias del dominio (HU-XXX [M/S/C] + 1 línea)
- **HU-ANM-01 [S]** — Ver anuncios del fraccionamiento: el residente ve comunicados por tipo y fecha; su lectura se registra en `anm.LogVisualizacionAnuncios`.
- **HU-ANM-02 [S]** — Publicar anuncio (Admin): el administrador publica comunicados generales para los residentes.

## Endpoints (/{Dominio}/{Controller})
Base `/ANM` (REST `/{Dominio}/{Controller}`, CRUD estándar: GET lista, GET `/{id}`, POST, PUT, DELETE lógico con `bEliminado`; JWT + validación de perfil):
- `/ANM/Anuncios`
- `/ANM/TiposAnuncio`
- `/ANM/LogVisualizacionAnuncios`

Controllers backend reales: `ANM/Anuncios`, `ANM/TiposAnuncio`, `ANM/LogVisualizacionAnuncios`. Vistas compuestas del portal disponibles vía GraphQL (`/graphql`).

## UI web (SPA React — post [[FE-043]])

| Ruta | Rol | Comportamiento |
|------|-----|----------------|
| `/anuncios` | Residente (`PrivateRoute`) | Lista vigentes; badge «Nuevo» si `visto === false` |
| `/anuncios/:id` | Residente | Detalle; al montar: `PATCH …/visto` |
| `/admin/anuncios` | Administrador (`AdminRoute`) | [[FE-CRUD-002]]: `AdminFilterableTable` + panel lateral CRUD; `GET ?incluirNoVigentes=true` |

Cliente: `Web/src/features/anuncios/useAnuncios.ts` + páginas en `Web/src/pages/*Anuncios*`. Contrato REST documentado en `.planning/tkt-anm-be-027/ANM-BE-027-APIS.md`.

## Reutilización / objetos existentes (escalera)
1. **Reutilizar**: tablas `anm.*` y vista `anm.vsAnuncios` ya existen en la referencia.
2. Acceso a datos: Dapper + `anm.vsAnuncios` para listados; sin stored procedures.
3. Autorización por perfil vía `sgr.Perfiles` + menús dinámicos (`sgr.Menus`/`MenusBotones`/`PerfilMenus`/`PerfilMenuBotones`).
4. Autoría/auditoría con `UsuarioCreacionID` (= `sub` del JWT = `UsuarioID`).

## Deltas del proyecto (nuevo)
- (delta) Entrega de anuncios como notificación por Telegram: se apoya en `ntf.*` + notificador saliente (no altera `anm.*`).
- (delta) Publicación de anuncios desde el bot «C500 Asiste» por Administrador (reutiliza `/ANM/Anuncios`, no duplica lógica).
- 2026-10-19 — Planning: [[ANM-BE-027]] API JWT Cuarta + [[FE-043]] UI `/anuncios` y `/admin/anuncios` (`.planning/tkt-anm-be-027`, `tkt-fe-043`).
- 2026-10-19 — Design: seed `SQL/DB-003_anm_tipos_seed.sql` (General, Urgente, Mantenimiento).
- 2026-10-19 — **[[FE-043]] ARCHIVADO**: rutas y hooks UI anuncios en SPA (ver sección UI web).

## Changelog

| Fecha | Requerimiento | Cambio |
|-------|---------------|--------|
| 2026-10-26 | [[FE-CRUD-002]] | Admin anuncios: patrón CRUD admin (tabla filtrable + split panel) |
| 2026-10-19 | [[FE-043]] | UI `/anuncios`, `/anuncios/:id`, `/admin/anuncios`; nav Anuncios habilitado |
| 2026-10-19 | [[ANM-BE-027]] | API JWT Cuarta `/ANM/*` (planning; ver delta backend) |

## Notas
- Sin stored procedures: acceso Dapper sobre tablas + vista `anm.vsAnuncios` + servicios C#.
- Soft delete con `bEliminado` en todas las tablas (NO `IsActive`).
- Nombres reales del esquema en español; NO confundir `anm` (anuncios) con mascotas (viven en `usr`).
