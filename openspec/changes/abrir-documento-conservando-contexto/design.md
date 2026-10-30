# Design

## Context

Flujo vigente: UI → API (`DocumentosController` → `DocumentosSG` → MAPI por HTTP) → MAPI (`DocumentosController` → `DocumentosBW` → `DocumentoConsultaDA` → SQL Server). Hoy solo existen `GET Documentos/Tipos` y `GET Documentos?codigoTipo=`; [`ConsultaDocumentos.jsx`](../../../VES/Bccr.Supen.Ves.UI/Codigo/src/Documentacion/Documentos/ConsultaDocumentos.jsx) guarda el filtro en `useState` y no pagina ni ordena. La UI ya usa `react-router-dom` 6 y `httpCliente` (axios), y MUI v7. El esquema y los procedimientos pertenecen a DBA; no hay migraciones EF. Los contratos de metadatos y `BajarArchivo` están pendientes de verificar contra implementación real. Ver `proposal.md` y `historia.md`.

## Goals / Non-Goals

**Goals:**
- Abrir un documento sin perder el contexto del listado y sin transferir el binario salvo para la previsualización.
- Restauración determinista y tolerante a estado obsoleto.
- Reutilizar capas, patrones de versionado y autorización existentes.

**Non-Goals:**
- Crear, editar, eliminar, subir o descargar documentos (D4).
- Conversión de documentos Office a PDF (D2).
- Cambios en esquema SQL o migraciones EF.

## Decisions

1. **Ruta de detalle propia (`/documentos/:codigoDocumento`)** en lugar de modal o panel. Permite recarga, enlace y botón «Atrás» nativo. Alternativa descartada: modal, que complica la restauración y el historial. La ruta exige el mismo permiso que el listado.

2. **Estado del listado en dos niveles (decisión por defecto para D5/D6).**
   - Filtro, orden, página y tamaño de página en los parámetros de búsqueda de la URL del listado (restauran con «Atrás» y son compartibles).
   - Selección (`CodigoDocumento`) y desplazamiento en `sessionStorage`, con clave por pestaña y por usuario, que se limpia al cerrar sesión. Solo guarda identificadores y parámetros, nunca datos de documentos.
   - Un hook (p. ej. `useEstadoListado`) centraliza lectura, validación y escritura. Alternativas: solo `sessionStorage` (no sobrevive a enlaces ni «Atrás» consistente) o estado global en memoria (se pierde al recargar).

3. **Restauración con nueva consulta, no con caché.** Al montar el listado se valida el estado guardado contra los tipos activos y el total de páginas, se consulta de nuevo y, al terminar la carga, se aplica selección, desplazamiento y foco. Valores inválidos degradan (Todos, última página, sin selección). Evita datos obsoletos.

4. **Paginación y orden en cliente (D1 resuelta por defecto).** DBA no confirmó soporte de paginación en `ListarDocumentos`, por lo que no se cambia el contrato del listado: la UI recibe la lista filtrada por tipo (ya ordenada por `FechaPublicacion` descendente en SQL) y ordena/pagina en memoria con MUI. El estado restaurable (orden, página, tamaño) es el mismo si más adelante pasa a servidor. Alternativa: parámetros `pagina`/`ordenarPor` en servidor, pendiente de DBA.

5. **Metadatos separados del archivo.** `GET Documentos/{codigoDocumento}` devuelve los datos de `ObtenerDocumento` (sin binario) más `archivoDisponible` (nombre de archivo no vacío); BW devuelve 404 si el documento no existe o ya caducó (por fecha de calendario). `GET Documentos/{codigoDocumento}/Archivo` entrega el binario vía `BajarArchivo` (nombre más contenido en Base64 entre MAPI y API) y responde 404 si el contenido es nulo o vacío; la UI interpreta ese 404 como «No disponible». No se calcula `tamanioBytes` en servidor: el límite de 10 MB se valida en el API tras recibir el contenido y en la UI con `Content-Length`/tamaño del blob. El nombre del tipo se resuelve en la UI con la lista de tipos activos a partir de `codigoTipoDoc`.

6. **Previsualización en cliente.** Se pide el archivo con `responseType: 'blob'`, se valida extensión y `Content-Type` contra la lista permitida y el límite de tamaño (10 MB, a confirmar en D7), los PDF se muestran con un `<iframe>` sobre una URL `blob:` con tipo forzado a `application/pdf` (no se usa `sandbox`: verificado en el navegador que el visor de PDF lo bloquea con `ERR_BLOCKED_BY_CLIENT`; la mitigación es la validación de extensión, `Content-Type` y tamaño más `nosniff` en el API), que se libera con `URL.revokeObjectURL` al desmontar. Los formatos Office muestran mensaje. Alternativa: visor de terceros o conversión en servidor, descartada por dependencia nueva y por D2.

7. **Entrega segura en API.** El API retransmite el flujo desde MAPI, fija `Content-Type` según la extensión permitida, `X-Content-Type-Options: nosniff` y `Content-Disposition: inline` con nombre saneado. Ambos endpoints llevan `[Authorize]`; los errores devuelven mensajes genéricos en español y registran el detalle.

8. **Capas y contratos.** API: `DocumentoDetalle` y `ArchivoDocumento` en `Abstracciones/Contenedores`, acciones en `IDocumentosController`/`DocumentosController`, métodos en `IDocumentosSG`/`DocumentosSG`. MAPI: mismas operaciones en controlador, `IDocumentosBW`/`DocumentosBW` (validación de código y parámetros) y `IDocumentosDA`/`DocumentoConsultaDA` con modelos sin propiedad binaria salvo el de archivo. Se mantiene la pluralización e interfaces vigentes.

## Risks / Trade-offs

- [Contratos de `BajarArchivo` y metadatos no verificados] → Marcarlos como pendientes, validarlos con DBA antes de las tareas de DA y registrar la evidencia sin afirmar verificación de producción.
- [DBA no puede cambiar el procedimiento de listado para paginar] → Fallback a paginación/orden en cliente (decisión 4), documentado.
- [Archivos grandes degradan memoria en API/UI] → Límite de tamaño, flujo en el API y previsualización condicionada al tamaño.
- [PDF malicioso o tipo falsificado] → Validación de extensión y `Content-Type`, `nosniff`, blob con tipo forzado a PDF; sin inyección HTML.
- [Estado guardado obsoleto] → Validación y degradación (decisión 3); estado ilegible se ignora.
- [Fuga de estado entre usuarios en el mismo navegador] → Clave por usuario y limpieza al cerrar sesión.
- [Restauración de desplazamiento antes de que haya datos] → Aplicarla solo tras terminar la carga.

## Open Questions

- D2 (conversión de Office) y D4 (descarga) se resuelven con los responsables sin alterar el diseño base; los supuestos por defecto son: solo PDF y sin descarga. D3 (campos extra del detalle) se resolvió el 2026-10-22: se exponen `Resumen` (multilínea, solo lectura) y `UsuarioPublica`; `Publico` no.
- Valor final del límite de tamaño y permisos por tipo (D7).
