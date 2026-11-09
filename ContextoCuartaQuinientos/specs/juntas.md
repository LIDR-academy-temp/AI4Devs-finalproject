# specs/juntas.md — Juntas (source of truth SDD)
> Contexto de dominio SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado; lo nuevo (delta).

## Propósito
Gestionar las **asambleas del condominio**: convocatoria, contenido/acuerdos y archivos adjuntos. Permite al residente ver convocatorias y acuerdos, y al administrador publicar convocatorias y registrar el detalle de cada junta. **No existe votación/Vote** en el modelo real (los acuerdos son texto en `JuntaDetalle`).

## Objetos del dominio (tablas + vistas reales)
Esquema `jnt`:
- `jnt.Juntas` — cabecera de la asamblea. Campos: `JuntaID` (PK), `Titulo`, `Descripcion`, `FechaProgramada`, `Ubicacion`, `Activa` (bit).
- `jnt.JuntaDetalle` — contenido/acuerdos de la junta. Campos: `JuntaDetalleID` (PK), `JuntaID` (FK), `Contenido` (= acuerdos).
- `jnt.JuntaDetalleArchivos` — archivos adjuntos del detalle (tabla secundaria/catálogo de adjuntos).

Todas comparten patrón de auditoría (`Creado`, `Modificado`, `UsuarioCreacionID`, `UsuarioModificacionID`, `FechaCreacion`, `FechaModificacion`) y soft delete `bEliminado`.

Vistas: no hay vista `vs*` específica del dominio en las 20 reales `(asumido)`; la lectura se resuelve con Dapper sobre tablas + joins.

## Catálogos y estados
- Estado de junta: bandera `Activa` (bit) en `jnt.Juntas` (programada/publicada vs inactiva). No hay catálogo de estados separado.
- `jnt.JuntaDetalleArchivos` actúa como colección de adjuntos por detalle.

## Invariantes (INV-x)
- **INV-1** Una junta es visible al residente solo si `bActivo=1` y `bEliminado=0`.
- **INV-2** `jnt.JuntaDetalle.JuntaID` debe referenciar una junta existente (FK); los acuerdos viven en `Contenido`.
- **INV-3** Los archivos (`jnt.JuntaDetalleArchivos`) se ligan a un `JuntaDetalle`; sin detalle no hay adjuntos.
- **INV-4** Soft delete: nunca borrado físico; se marca `bEliminado=1`.
- **INV-5** No hay votación ni conteo de votos (no existe en el esquema).

## Historias del dominio (HU-XXX [M/S/C] + 1 línea)
- **HU-JNT-01 [S]** — Ver convocatoria y acuerdos de junta: el residente ve fecha/ubicación/descripción de juntas `bActivo=1` y lee acuerdos (`JuntaDetalle`) + descarga adjuntos (`JuntaDetalleArchivos`).
- **HU-JNT-02 [S]** — Publicar convocatoria (Admin): al publicar, los residentes activos reciben notificación (portal + Telegram vía notificador saliente).

## Endpoints (/{Dominio}/{Controller})
Convención REST real `/{DOMINIO}/{Controller}` (NO `/api/...`). Controllers reales JNT:
- `/JNT/Juntas` — CRUD de convocatorias.
- `/JNT/JuntaDetalle` — contenido/acuerdos.
- `/JNT/JuntaDetalleArchivos` — adjuntos.

Verbos concretos por controller `(asumido)`: GET (listar/detalle), POST (crear), PUT/PATCH (editar), DELETE (soft).

## Frontend admin (SPA) — vigente

- Ruta `/admin/juntas` ([[FE-CRUD-002]]): `AdminFilterableTable` + split panel (convocatoria / detalle y adjuntos según JNT API); `juntasTableFilter.ts`.

## Reutilización / objetos existentes (escalera)
- **Reutiliza** el patrón Dapper + servicios C# + FluentValidation + `IDbTransaction` (sin SPs).
- **Reutiliza** notificación: la publicación (HU-JNT-02) inserta en `ntf.Notificaciones` (tipo `JUNTA_CONVOCADA`, delta sembrado) y despacha por el notificador saliente → dominio Notificaciones.
- **Reutiliza** archivos/adjuntos con el mismo enfoque de documentos del sistema.
- **Reutiliza** `sgr.Usuarios`/`sgr.Perfiles` para autorización (Administrador publica; residente lee).

## Deltas del proyecto (nuevo)
- Tipo de notificación `JUNTA_CONVOCADA` sembrado en `ntf.TiposNotificacion` (delta) para la publicación de convocatorias.
- Entrega por Telegram vía `ntf.NotificacionesEntrega` (delta) al publicar convocatoria.
- No hay deltas de esquema propios de `jnt` en el rediseño (el modelo de juntas se conserva tal cual).

## Changelog

| Fecha | Requerimiento | Cambio |
|-------|---------------|--------|
| 2026-10-26 | [[FE-CRUD-002]] | Admin juntas: patrón CRUD admin (tabla filtrable + panel) |

## Notas
- Sin stored procedures: acceso por Dapper + servicios.
- No existe entidad `Meeting`/`Vote` en inglés ni votación (alucinación del doc viejo).
- Nombres reales del esquema español respetados; soft delete `bEliminado`.
