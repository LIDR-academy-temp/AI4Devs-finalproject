# Proposal

## Why

El listado de documentos STI (cambio `consultar-documentos-filtrados-por-tipo`) solo permite filtrar por tipo; la persona usuaria no puede consultar los datos de un documento, saber si su archivo está disponible ni previsualizarlo. Además, el estado del listado vive en `useState` local y se pierde al salir de la pantalla, lo que obliga a repetir filtros y búsquedas. Ver [historia.md](./historia.md).

## What Changes

- Agregar la acción estándar **Abrir** en la botonera de la panttalla según l manejo de opciones o acciones de la aplicación, que navega a una vista de detalle por `CodigoDocumento`.
- Nueva vista de detalle con datos del documento, estado de disponibilidad del archivo (Disponible / No disponible / No se pudo verificar) y previsualización (PDF; mensaje claro para formatos Office).
- Restaurar el estado del listado al regresar: filtro por tipo, ordenamiento, paginación, selección, posición de desplazamiento y foco, con degradación segura si el estado quedó obsoleto o inválido.
- Agregar ordenamiento y paginación al listado, necesarios para que exista contexto que restaurar (alcance final sujeto a decisión D1 de la historia).
- API y MAPI: nuevos endpoints de solo lectura para metadatos/disponibilidad y contenido del archivo (`BajarArchivo`), sin exponer el binario en el listado ni en los metadatos.
- Sin cambios en esquema SQL ni migraciones EF; cualquier procedimiento nuevo o ajustado lo define y verifica DBA.
- Fuera de alcance: crear, editar, eliminar, subir documentos y funciones del README evolucionado de VES Documentos. La descarga queda fuera salvo decisión explícita (D4).

## Capabilities

### New Capabilities
- `documentos-sti-apertura`: apertura de un documento desde el listado (datos, disponibilidad del archivo, previsualización) y restauración del contexto del listado al regresar.

### Modified Capabilities
<!-- Ninguna: la capacidad `documentos-sti` del cambio `consultar-documentos-filtrados-por-tipo` aún no está archivada en openspec/specs; el listado ordenado/paginado se especifica aquí como requisitos propios de esta capacidad. -->

## Impact

- **UI** (`VES/Bccr.Supen.Ves.UI/Codigo/src`): `Documentacion/Documentos/ConsultaDocumentos.jsx`, nuevo `DetalleDocumento.jsx`, persistencia del estado del listado, rutas en `Dashboard.jsx`/navegación, `Constantes.js` y pruebas Vitest.
- **API** (`VES/Bccr.Supen.Ves.Api/Codigo`): `IDocumentosController`/`DocumentosController` v1, `IDocumentosSG`/`DocumentosSG`, contenedores nuevos y pruebas MSTest.
- **MAPI** (`VES/Bccr.Supen.Ves.Mapi/Codigo`): controlador, `BW`, `DA`, modelos y pruebas MSTest.
- **SQL Server / DBA**: confirmación del procedimiento de descarga y de cómo obtener disponibilidad/tamaño sin leer el binario.
- **Documentación**: `docs/api-spec.yml` (si existe), `docs/data-model.md`, `docs/exercise.md`, `SCHEMA.md` y `ComoImplementarUnMAPI.md`.
- **Dependencias abiertas**: contratos `BajarArchivo`/metadatos pendientes de verificar contra implementación real; decisiones D1–D7 de la historia.
