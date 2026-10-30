# Tasks

## 0. Preparación: rama de trabajo (MANDATORY - FIRST STEP)

- [x] 0.1 Crear `feature/abrir-documento-conservando-contexto` desde la rama base vigente en la raíz Git compartida por UI, API y MAPI (confirmar base en README/AGENT.md de cada componente); verificar con `git branch --show-current` y que los cambios preexistentes se conservan.
- [ ] 0.2 Confirmar raíces Git y `git status --short` de cada componente antes de modificar código; verificar que el resultado queda anotado en el reporte de la sección 7.

## 1. SQL Server / DBA: confirmar contratos de apertura

- [x] 1.1 (Evidencia: el solicitante aportó la firma `[VES].[BajarArchivo] @CodigoDocumento int` y el contrato documentado de `ObtenerDocumento` sin binario; sin informe DBA ni verificación independiente) Solicitar a DBA confirmar en ambiente no productivo la firma/permisos de `BajarArchivo` y del procedimiento de metadatos, y cómo obtener disponibilidad y tamaño sin leer el binario; verificar que la evidencia (o su ausencia) queda registrada sin inferir estado de producción.
- [x] 1.2 (Sin respuesta de DBA: se adopta el fallback a paginación y orden en cliente; el listado no cambia) Solicitar a DBA, si se aprueba D1, el soporte de paginación, orden (lista blanca) y total en el listado, conservando `FechaPublicacion` descendente por defecto; verificar la respuesta de DBA y, si no es viable, registrar el fallback a paginación en cliente.
- [x] 1.3 (Aceptados los supuestos por defecto del diseño: solo PDF, sin campos extra, sin descarga, 10 MB) Resolver con los responsables D2, D3, D4 y D7 (formatos, campos extra, descarga, límite de tamaño y permisos); verificar que las decisiones quedan registradas en `design.md`/`historia.md`.
- [x] 1.4 Actualizar `VES/Bccr.Supen.Ves.Mapi/Documentacion/SCHEMA.md` con los contratos confirmados y su estado de verificación; verificar por diff que no hay cambios de esquema ni migraciones EF.

## 2. MAPI: metadatos, archivo y listado extendido

- [x] 2.1 Revisar y actualizar las pruebas existentes de `DA.Pruebas`, `BW.Pruebas` y `MAPI.UnitTests` para Documentos; verificar con `dotnet test` focalizado que pasan antes de modificar código.
- [x] 2.2 Crear en DA el modelo de metadatos (sin binario), el modelo de archivo y las llamadas parametrizadas; verificar con pruebas DA que los parámetros se transmiten sin concatenar SQL y que el modelo de metadatos no puede materializar `Documento`.
- [x] 2.3 Implementar en BW la obtención de metadatos y archivo y la validación de código positivo (los documentos caducados se pueden abrir, por decisión del usuario); verificar casos válidos, inválidos, inexistente, caducado y archivo nulo en `BW.Pruebas`.
- [x] 2.4 Agregar al controlador MAPI versionado `GET {codigoDocumento}` y `GET {codigoDocumento}/Archivo` (el listado no se extiende por el fallback de 1.2; DI ya registrado); verificar rutas, versión y códigos 200/400/404 en `MAPI.UnitTests`.
- [x] 2.5 Actualizar `ComoImplementarUnMAPI.md` y `SCHEMA.md`; verificar que describen los contratos y distinguen confirmación no productiva informada de verificación independiente.

## 3. API: contratos, autorización y gateway

- [x] 3.1 Revisar y actualizar las pruebas existentes de `Bccr.Supen.Ves.Api.UnitTests` y `SI.SG.Pruebas` para Documentos; verificar que pasan antes de modificar código.
- [x] 3.2 Crear `DocumentoDetalle` y el contenedor paginado en `Abstracciones/Contenedores` y ampliar `IDocumentosSG`/`DocumentosSG` hacia MAPI; verificar con pruebas `SI.SG.Pruebas` la ruta, los parámetros y que los DTO no incluyen binario.
- [x] 3.3 Agregar a `IDocumentosController`/`DocumentosController` v1 las acciones de metadatos y archivo (`[Authorize]`), el listado extendido y los encabezados `nosniff`/`Content-Disposition` con nombre saneado y tipo de contenido permitido; verificar 200/400/401/403/404/5xx y mensajes genéricos en español en las pruebas del controlador.
- [x] 3.4 Actualizar `docs/api-spec.yml` (o el documento de contratos vigente), `docs/data-model.md` y `ComoCrearUnNuevoEndpoint.md` si aplica; verificar que los contratos coinciden con las rutas y DTO implementados.

## 4. UI: listado con acción Abrir, orden y paginación 

- [ ] 4.0 Usa el cambio consultar-documentos-filtrados-por-tipo
- [x] 4.1 Revisar y actualizar `ConsultaDocumentos.test.jsx` y `Dashboard.test.jsx`; verificar con `npx vitest run` focalizado que pasan antes de modificar código.
- [x] 4.2 (Ajuste: el Dashboard no usa rutas por módulo; Abrir cambia a la vista de detalle dentro de `ConsultaDocumentos`.) Agregar constantes de endpoints en `Constantes.js` y la acción **Abrir** mediante la `Botonera` común (`componentes/botones`), generada según las opciones de seguridad del usuario en BD (módulo 20, opción padre 1, `nombreFisico` = `abrir`), actuando sobre la fila seleccionada (también doble clic o Enter/espacio en la fila); la Botonera muestra todas las opciones del usuario y las no implementadas avisan «Opción no disponible aún» (propiedad opcional `funcionOpcionNoImplementada`); verificar con pruebas que Abrir sin selección avisa y con selección muestra el detalle.
- [x] 4.3 Agregar ordenamiento (`TableSortLabel`) y paginación (`TablePagination`) conservando el orden por defecto; verificar con pruebas el cambio de orden, de página y de tamaño.
- [x] 4.4 (Ajuste: todo el estado, incluido filtro/orden/página, se guarda en `sessionStorage`, no en la URL.) Implementar el hook de estado del listado (URL para filtro/orden/página; `sessionStorage` por pestaña y usuario para selección y desplazamiento), con validación y limpieza al cerrar sesión; verificar con pruebas estado válido, tipo inactivo, página inexistente, selección ausente y estado corrupto.
- [x] 4.5 Aplicar selección, desplazamiento y foco tras terminar la carga del listado restaurado; verificar con pruebas el orden de aplicación y el foco en la fila seleccionada tras volver.

## 5. UI: detalle, disponibilidad y previsualización

- [x] 5.1 (Ajuste: sin ruta propia; vista interna del módulo ya protegido por el permiso del listado.) Crear `DetalleDocumento.jsx` y registrar la ruta protegida en `Dashboard.jsx`/navegación con el mismo permiso que el listado; verificar con pruebas el acceso autorizado, no autorizado y el 404 con mensaje «El documento no está disponible».
- [x] 5.2 Mostrar datos, «Vigencia indefinida», usuario que publicó, resumen en campo multilínea de solo lectura (agregados 2026-10-22, D3) y estado de disponibilidad (Disponible / No disponible / No se pudo verificar con reintento); verificar cada estado con pruebas.
- [x] 5.3 Implementar la previsualización PDF con `responseType: 'blob'`, validación de extensión/`Content-Type`/tamaño, `iframe sandbox` y `URL.revokeObjectURL` al desmontar; verificar con pruebas PDF, formato Office, archivo excedido, fallo aislado y liberación de la URL.
- [x] 5.4 Implementar **Volver al listado** y el comportamiento de «Atrás»; verificar con pruebas de ida y vuelta que se restauran filtro, orden, página, selección y desplazamiento, incluida la recarga del detalle.
- [x] 5.5 Revisar accesibilidad (ARIA, `aria-busy`, foco, teclado) y estilos según `USABILIDAD.md` y el sistema de diseño; verificar con `npm run lint` y pruebas de accesibilidad.
- [x] 5.6 Actualizar `DEVELOPMENT.md`/guía de UI y `Constantes.js` documentados; verificar que describen la ruta, el estado guardado y la previsualización.

## 6. Pruebas, verificación manual y documentación

- [x] 6.1 Ejecutar las suites focalizadas y las completas de cada componente (UI: `npm run lint`, `npm test`, `npm run build:local`; API: `dotnet build` y `dotnet test` de la solución; MAPI: `dotnet build --no-restore` y `dotnet test`); verificar que pasan sin SQL Server y sin cambios no deseados en `package.json`.
- [x] 6.2 Verificar el estado de base de datos antes/después solo si la ejecución toca SQL Server real (por defecto «N/A - suites aisladas») y crear `openspec/changes/abrir-documento-conservando-contexto/specs/documentos-sti-apertura/reports/YYYY-MM-DD-step-N-unit-test-and-db-verification.md` con comandos, resultados y estado de BD; verificar que el archivo existe.
- [ ] 6.3 Ejecutar pruebas manuales con curl (el agente las ejecuta) arrancando MAPI → API → UI y confirmando URL/puertos efectivos: metadatos 200/400/404, archivo 200/404, listado extendido y 401/403 sin credenciales; verificar que las respuestas coinciden con los contratos, sin secretos en el reporte. _Parcial (ver `reports/2026-10-21-step-6-manual-curl-e2e-local.md`): 200/400 y archivo OK; 404 del API devolvía 500 por el logger de Event Log y quedó en 404 al registrarse las fuentes `VES` y `VES.API` (verificado 2026-10-22 con `Documentos/99999999`); 401/403 no verificables sin GAUDI._
- [x] 6.4 Ejecutar E2E con Playwright MCP (el agente lo ejecuta): filtrar, ordenar, paginar, seleccionar, abrir, previsualizar, volver y comprobar el estado restaurado, incluida la recarga y «Atrás»; verificar capturas/resultados en el reporte. _Playwright verificó la restauración del estado; el render del PDF (que cuelga el navegador automatizado) y el botón «Volver al listado» los confirmó manualmente el usuario en Edge y Chrome el 2026-10-22. No hay capturas ni verificación independiente del agente de esa parte._
- [x] 6.5 Actualizar documentación técnica final (`docs/exercise.md` con el estado de verificación, `historia.md` si cambian decisiones, READMEs afectados); verificar que no hay afirmaciones de verificación de producción y que no se introdujeron edición, eliminación, subida ni descarga.

