# Proposal

## Why

Las personas usuarias autorizadas necesitan localizar documentos STI vigentes sin revisar registros irrelevantes. La funcionalidad de Documentos fue retirada de API, MAPI y UI, por lo que se requiere restablecer únicamente una consulta protegida y filtrable, con reglas explícitas para la elegibilidad del archivo y sin transportar el contenido binario.

## What Changes

- Introducir una pantalla de consulta en la UI, accesible mediante la opción de menú de Documentación que el backend ya proporciona.
- Exponer operaciones de lectura versionadas en API para tipos activos y para documentos filtrados por tipo o por **Todos**.
- Implementar la consulta en MAPI a través de las capas Controller → BW → DA, usando los procedimientos SQL gestionados por DBA.
- Incluir solamente documentos con nombre y contenido binario no nulos (la fecha de caducidad no excluye: se listan también los caducados, decisión 2026-10-22), y devolver solo código, nombre de archivo, tipo, título y fecha de publicación.
- Definir el estado de carga, lista vacía y error comprensible en español en la UI, y requerir autenticación/autorización en la API.
- Agregar pruebas unitarias por capa y pruebas de integración de la consulta; actualizar la documentación técnica correspondiente.
- Mantener el alcance como consulta de solo lectura: no crear, editar, eliminar ni descargar documentos.

## Capabilities

### New Capabilities

- `documentos-sti`: consulta autorizada de documentos STI por tipo, incluidos sus filtros, elegibilidad, resultados y estados de presentación.

### Modified Capabilities

Ninguna. No hay especificaciones de capacidades existentes en `openspec/specs/`.

## Impact

- **UI:** `VES/Bccr.Supen.Ves.UI/Codigo/src`, especialmente el componente de consulta, `Dashboard.jsx`, `Constantes.js` y sus pruebas; consumo exclusivo de la API.
- **API:** contratos de `Bccr.Supen.Ves.Abstracciones`, controlador versionado, gateway `SI.SG`, registro de dependencias/configuración `ApiEndpoints` y pruebas en `VES/Bccr.Supen.Ves.Api/Codigo`.
- **MAPI:** contratos de `Abstracciones`, controlador, capas `BW` y `DA`, modelos de resultados sin binario, configuración DI y pruebas en `VES/Bccr.Supen.Ves.Mapi/Codigo`.
- **SQL Server / DBA:** documentar tablas y contratos de procedimientos en `VES/Bccr.Supen.Ves.Mapi/Documentacion/SCHEMA.md`. El solicitante confirmó la verificación de DBA en un ambiente no productivo; no se adjuntó evidencia ni se verificó producción de forma independiente. `ListarDocumentos` requiere `Documento IS NOT NULL` y comparar `FechaCaduca` por día calendario, manteniendo el binario fuera de su proyección. No se generan migraciones EF ni se modifica SQL desde el código de aplicación.
- **Contratos HTTP implementados:** `GET /Documentos/Tipos?api-version=1.0` y `GET /Documentos?codigoTipo={codigoTipo}&api-version=1.0`, con `codigoTipo=-1` para **Todos**. Las rutas están respaldadas por controladores y pruebas unitarias; la integración autorizada en ambiente no productivo sigue pendiente.
- **Documentación:** actualizar la guía de endpoints de API, `docs/api-spec.yml`, `docs/data-model.md` y la documentación MAPI/SQL que corresponda, distinguiendo expectativas documentadas de objetos verificados en una base real.
- **Trazabilidad:** conservar `historia.md` como documento adicional con la historia enriquecida, no como sustituto de los artefactos OpenSpec.
