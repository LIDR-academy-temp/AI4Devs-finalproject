# Verificaciones pendientes — modelos y esquemas VES (criterio V)

**Estado:** asuntos abiertos, no corroborados por esta edición. Esta consolidación no ejecutó consultas, builds ni pruebas, y no autoriza cambios SQL, C#, React, permisos o migraciones EF. Las afirmaciones de los documentos fuente se mantienen, incluidas las que se contradicen.

| ID | Verificación pendiente | Evidencia necesaria | Referencias |
|---|---|---|---|
| V-DAT-01 | Caducados en listado vs. “la caducidad solo filtra el listado” | Historia aprobada, implementación real de `ListarDocumentos`, prueba por ambiente | `SCHEMA.md`, `data-model.md`, API/MAPI/UI |
| V-DAT-02 | Tipos, longitud, nulabilidad, claves y FKs en STI | DDL/versiones DBA, ambiente y fecha | `SCHEMA.md`, `data-model.md` |
| V-DAT-03 | DTO, serialización y contratos reales UI/API/MAPI | C# `Abstracciones` de ambas soluciones, SG, controllers y consumidores React | `data-model.md` |
| V-DAT-04 | Uso real de `ListarDocumentos`, `BajarArchivo`, `ObtenerDocumento`, `ListarTiposDocumentos` | Invocaciones DA y procedimientos efectivos con versiones | `SCHEMA.md` y guía MAPI |
| V-DAT-05 | Tabla conceptual `ARCHIVO_ADJUNTO`, atributo `Estado` inferido | DDL y aclaración de diseño histórico | `legacy-data-access-flow.md` |
| V-DAT-06 | Clave `BDSupen` frente a catálogos `BSSupen`, `BSSupen_Des` y `BDSUPEN_Des` | Configuración ambiente, DBA y conexión efectiva | `SCHEMA.md` y documentación MAPI |
| V-DAT-07 | Almacenamiento de binarios y límites de archivos | Procedimientos, DDL, contratos API y políticas vigentes | `data-model.md`, `SCHEMA.md` |
| V-DAT-08 | Permisos efectivos y botonera documental actual | Historias, controladores y consultas de seguridad en UI/API/MAPI | Histórico `legacy-domain-data-model.md` y UI |
| V-DAT-09 | Relaciones y perfiles del dominio de seguridad | Metadata de claves y catálogos en esquema real | `legacy-domain-data-model.md`, `SCHEMA.md` |
| V-DAT-10 | Semántica específica `@codigoFondo=''` vs. `NULL`, y SP cruzados | Texto y versión real del SP, pruebas | `SCHEMA.md` |

**Regla de seguimiento:** para cada V registrar ambiente, fuente/propietario, fecha, evidencia, decisión autorizada y documentos afectados. No dar por cerrada ninguna V solo por consolidación documental.
