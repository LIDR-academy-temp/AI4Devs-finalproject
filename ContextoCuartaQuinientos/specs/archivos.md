# specs/archivos.md — Archivos (source of truth SDD)
> Contexto de dominio SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado; lo nuevo (delta).

## Propósito
Repositorio de documentos oficiales del fraccionamiento (reglamentos, actas, formatos), tipificados y con bitácora de descarga/visualización. Esquema real `arc`. Es también el destino físico de los adjuntos de otros dominios: `tkt.DocumentosTicket` liga a `arc.Archivos`.

## Objetos del dominio (tablas + vistas reales)
Esquema `arc`:
- `arc.Archivos` — documento almacenado (nombre, tipo, ruta/URL, metadatos).
- `arc.TiposArchivo` — catálogo de tipos de archivo.
- `arc.LogVisualizacionArchivos` — bitácora de descargas/visualizaciones (qué usuario, qué archivo, cuándo).
- Vista: `arc.vsArchivos` — archivos con datos denormalizados de tipo para listados.

Todas las tablas comparten el patrón de auditoría (`Creado`, `Modificado`, `UsuarioCreacionID`, `UsuarioModificacionID`, `FechaCreacion`, `FechaModificacion`) y **soft delete** con `bEliminado`.

## Catálogos y estados
- `arc.TiposArchivo`: catálogo data-driven (valores sembrados concretos `(asumido)`; p. ej. Reglamento, Acta, Formato).
- Sin máquina de estados; el ciclo de vida es alta → disponible → baja lógica (`bEliminado`).

## Invariantes (INV-x)
- **INV-1**: toda descarga/visualización por un usuario se registra en `arc.LogVisualizacionArchivos`.
- **INV-2**: borrado lógico (`bEliminado = 1`); nunca DELETE físico.
- **INV-3**: `arc.Archivos.TipoArchivoID` referencia siempre un tipo existente en `arc.TiposArchivo`.
- **INV-4**: alta/gestión restringida a Administrador (`bAdministrador = 1`); descarga abierta a residentes autorizados.
- **INV-5**: los adjuntos de tickets (`tkt.DocumentosTicket`) apuntan a filas vivas de `arc.Archivos`.

## Historias del dominio (HU-XXX [M/S/C] + 1 línea)
- **HU-ARC-01 [S]** — Descargar documentos del fraccionamiento: el residente ve nombre/tipo/fecha (`arc.Archivos`, `arc.TiposArchivo`) y la descarga se registra en `arc.LogVisualizacionArchivos`.
- **HU-ARC-02 [S]** — Gestionar documentos (Admin): el administrador sube y organiza documentos oficiales.

## Endpoints (/{Dominio}/{Controller})
Base `/ARC` (CRUD estándar; JWT + validación de perfil):
- `/ARC/Archivos`
- `/ARC/TiposArchivo`
- `/ARC/LogVisualizacionArchivos`

Controllers backend reales: `ARC/Archivos`, `ARC/TiposArchivo`, `ARC/LogVisualizacionArchivos`.

## Reutilización / objetos existentes (escalera)
1. **Reutilizar**: tablas `arc.*` y vista `arc.vsArchivos` ya existen.
2. Acceso a datos: Dapper + `arc.vsArchivos`; sin stored procedures.
3. Reutilizado por TKT como almacén de adjuntos (`tkt.DocumentosTicket` → `arc.Archivos`); JNT también adjunta archivos (`jnt.JuntaDetalleArchivos`, esquema propio).
4. Autorización por perfil vía menús dinámicos `sgr.*`.

## Deltas del proyecto (nuevo)
- (delta) Subida de evidencia de trabajador desde el bot «C500 Asiste» (foto de resolución de ticket) que aterriza en `arc.Archivos` y se liga vía `tkt.DocumentosTicket`.
- (delta) Los reportes BI/RPT exportados (PDF/Excel) pueden opcionalmente archivarse en `arc.Archivos` `(asumido)`.

## Notas
- Sin stored procedures: Dapper + vista `arc.vsArchivos` + servicios C#.
- Soft delete con `bEliminado` en todas las tablas.
- `arc` es el repositorio documental transversal; otros dominios reutilizan sus archivos en vez de duplicar almacenamiento.
