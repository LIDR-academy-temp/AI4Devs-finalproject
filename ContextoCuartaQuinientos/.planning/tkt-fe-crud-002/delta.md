# Delta: tkt-fe-crud-002-comunidad-admin

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Pantallas admin **Comunidad** alineadas a [PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md): `AdminListToolbar`, `AdminFilterableTable`, split panel (`AdminSplitLayout` / `AdminSidePanel`), RHF + Zod, `ConfirmDialog` (publicar / eliminar).
- Filtros cliente: `anunciosTableFilter.ts`, `juntasTableFilter.ts`, `encuestasTableFilter.ts`.
- Esquemas Zod: `archivosAdminSchemas.ts` (+ schemas por dominio en `features/admin/*`).
- Upload archivos: `mapArchivoUploadHttpError` — mensaje amigable en HTTP 413 (CA-2).
- `ResultadosEncuestaPage`: lectura con `PageHeader` + cards; consumo correcto de `apiGet` (`{ data, problem, status }`).

## Comportamiento modificado

- **(Antes)** `AdminAnunciosPage`: modal / UI previa a patrón Casas.
- **(Después)** Tabla filtrable + panel lateral CRUD; sin `window.confirm`.

- **(Antes)** `AdminArchivosPage`: upload sin mapeo explícito 413.
- **(Después)** Panel upload con Bearer vía `getAccessToken()` + `credentials: 'include'`; error 413 legible.

- **(Antes)** `AdminJuntasPage`: listado sin stack admin canónico.
- **(Después)** Tabla filtrable + split panel (convocatoria / detalle según JNT API).

- **(Antes)** `AdminEncuestasPage`: bandeja sin patrón unificado / publicar sin test.
- **(Después)** Patrón CRUD admin; publicar con `ConfirmDialog` + Vitest; flujo hacia resultados.

- **(Antes)** `useArchivos`: desalineado con contrato `apiGet`.
- **(Después)** Mismo patrón que hooks admin del ticket.

## Comportamiento eliminado

- `window.confirm` en páginas del scope del ticket (anuncios, archivos, juntas, encuestas admin).

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| — | — | Ninguno |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| — | — | Ninguno (ANM, ARC, JNT, ENC sin cambio de contrato) |

## Para el reviewer

- **Qué se hizo**: CRUD admin Comunidad (anuncios, archivos, juntas, encuestas + resultados lectura) al patrón FE-PAT-002 / FE-CRUD-001.
- **Por qué**: FE-CRUD-002 — DoD ENTREGA_MODULOS + CA-1/CA-2.
- **Riesgo**: Bajo (solo SPA).
- **Qué probar**: `/admin/anuncios`, `/admin/archivos` (subir PDF >5MB → mensaje 413), `/admin/juntas`, `/admin/encuestas` (crear borrador → publicar → `/admin/encuestas/:id/resultados`).
- **Rollback**: Revertir commits en `Web/`; sin migración BD.
