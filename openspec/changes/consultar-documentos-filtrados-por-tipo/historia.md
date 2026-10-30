# Historia: Consultar documentos filtrados por tipo

## Original

> Quiero tener un proceso para consultar los documentos de la tabla, pero que se filtren por tipo de documento.

## Enhanced

### Historia de usuario

**Como** persona usuaria autenticada y autorizada de VES,

**quiero** consultar los documentos disponibles y filtrar la lista por tipo de documento,

**para** encontrar rápidamente los documentos vigentes que necesito.

### Alcance

La funcionalidad permite consultar tipos de documento activos y listar documentos elegibles, filtrados por un tipo o por todos los tipos. La UI llama únicamente a la API; la API se comunica con MAPI, y MAPI consulta SQL Server mediante las capas existentes.

Este cambio solo cubre la consulta. No incluye crear, editar, eliminar ni descargar documentos, ni mostrar el contenido binario en la lista. La operación es de solo lectura: no actualiza ni modifica columnas de las tablas.

### Criterios de aceptación

1. **Tipos disponibles**
   - Al abrir la consulta, la UI obtiene y muestra únicamente los tipos cuyo `Estado` sea `A`.
   - El selector incluye **Todos**, con el valor heredado `-1`.

2. **Filtrado y orden**
   - Al elegir un tipo, la lista contiene solo los documentos asociados a ese código.
   - Al elegir **Todos**, la lista incluye documentos elegibles de tipos activos e inactivos, y excluye documentos sin tipo asociado.
   - Los documentos se ordenan por `FechaPublicacion`, de la más reciente a la más antigua.
   - El filtrado y el ordenamiento se ejecutan en el acceso a datos, no sobre una lista completa descargada a la UI.

3. **Documentos elegibles**
   - Se incluyen documentos con `NombreArchivo IS NOT NULL` y `Documento IS NOT NULL`.
   - Se incluyen todos los documentos elegibles sin importar `FechaCaduca` (decisión 2026-10-22: se muestran también los caducados).
   - Se excluyen documentos sin nombre de archivo o sin contenido binario.
   - La existencia del binario se usa solo como criterio de elegibilidad: el contenido de `Documento` no se devuelve ni se muestra en el resultado.

4. **Campos del resultado**
   - Cada fila muestra únicamente:
     - `CodigoDocumento` como código.
     - `NombreArchivo` como nombre de archivo.
     - `Nombre` de `STI_TiposDocumento` como tipo.
     - `Titulo`.
     - `FechaPublicacion`, en formato de fecha `yyyy-MM-dd`.
   - El resultado no incluye `Documento`, `Resumen`, `Publico`, `UsuarioPublica` ni otros campos que no se muestran en la lista.

5. **Estados de la UI**
   - Mientras se cargan tipos o documentos, se indica que la consulta está cargando.
   - Si el filtro no devuelve filas, se muestra un mensaje de lista vacía comprensible en español.
   - Si falla una llamada, se presenta un mensaje comprensible en español, sin exponer detalles técnicos. El error detallado se registra mediante el mecanismo existente.

6. **Autorización**
   - Las operaciones de consulta de la API requieren un usuario autenticado, siguiendo `[Authorize]` y la autorización existente en VES.
   - Las llamadas API–MAPI mantienen el mecanismo de autenticación entre componentes configurado para cada entorno.
   - Las solicitudes no autorizadas no reciben los datos de documentos.

### Contratos HTTP implementados

Las rutas inicialmente propuestas ya están implementadas siguiendo el patrón de controladores versionados y cuentan con pruebas unitarias. La integración autorizada en un ambiente no productivo sigue pendiente.

| Método | Ruta propuesta | Resultado |
|---|---|---|
| `GET` | `/Documentos/Tipos?api-version=1.0` | Lista de tipos activos: código y nombre. |
| `GET` | `/Documentos?codigoTipo={codigoTipo}&api-version=1.0` | Lista elegible; `codigoTipo=-1` significa todos los tipos. |

La respuesta de listado contiene solo los cinco campos definidos en **Campos del resultado**. El contrato no transmite el campo binario. La integración pendiente debe confirmar el comportamiento con la configuración efectiva de API/MAPI.

**Respuestas esperadas:**

- `200 OK`: lista de tipos o documentos; una lista vacía es válida.
- `400 Bad Request`: código de tipo inválido, con respuesta de error comprensible en español.
- `401 Unauthorized` / `403 Forbidden`: usuario no autenticado o no autorizado.
- `5xx`: error de consulta; mensaje público genérico en español y detalle técnico solo en el registro del servidor.

### Contexto técnico y componentes afectados

La base técnica documenta `STI_Documentos`, `STI_TiposDocumento` y el contrato de `ListarTiposDocumentos` y `ListarDocumentos` en [`docs/data-model.md`](../../../docs/data-model.md) y [`VES/Bccr.Supen.Ves.Mapi/Documentacion/SCHEMA.md`](../../../VES/Bccr.Supen.Ves.Mapi/Documentacion/SCHEMA.md). El solicitante confirmó que DBA verificó los objetos y el contrato en un ambiente no productivo; no se adjuntó informe, el agente no realizó una verificación directa y no se verificó producción. El contrato requiere que `Documento` no sea nulo y que la caducidad se compare por fecha de calendario, manteniendo vigentes durante todo el día los documentos que vencen hoy.

La solución debe respetar el flujo **UI → API → MAPI → SQL Server** y las responsabilidades actuales:

- **UI** (`VES/Bccr.Supen.Ves.UI/Codigo/src`): crear el componente de consulta bajo `Documentacion/Documentos`; integrarlo en `Dashboard.jsx` y en la navegación/opciones existentes; definir las llamadas en `Constantes.js`; agregar pruebas del componente y actualizar pruebas de integración/navegación pertinentes.
- **API** (`VES/Bccr.Supen.Ves.Api/Codigo`): crear el contrato y controlador versionado de consulta, la interfaz/implementación de servicio `SI.SG` y la configuración de endpoints hacia MAPI. Proteger los endpoints de negocio con la autorización existente.
- **MAPI** (`VES/Bccr.Supen.Ves.Mapi/Codigo`): crear el contrato requerido, controlador, capas `BW` y `DA`, y su registro DI siguiendo los patrones existentes. La operación `DA` debe llamar los procedimientos almacenados y mapear solamente los campos del resultado de lista.
- **SQL Server / DBA**: validar los procedimientos y su resultado en el entorno destino. La consulta de lista debe agregar el criterio `Documento IS NOT NULL` sin incluir el binario en la proyección. Los cambios de procedimientos o esquema son responsabilidad de DBA; no generar migraciones EF para este alcance.
- **Documentación**: actualizar el contrato API y la guía de endpoints, además de la documentación de datos/SQL que corresponda si cambia la proyección o el criterio de elegibilidad.

Los nombres de clases y archivos concretos deben seguir las convenciones de pluralización e interfaces de los componentes al implementarse; la lista anterior describe las capas obligatorias, no archivos que ya existan.

### Definición de terminado

- Los contratos API y MAPI, la pantalla y la consulta de acceso a datos implementan los criterios anteriores.
- Las pruebas unitarias cubren tipos activos, filtro por tipo, opción **Todos**, orden descendente, fecha de vencimiento nula/límite/expirada, nombre de archivo nulo, binario nulo, lista vacía, errores y autorización.
- Las pruebas verifican que la respuesta de lista no contiene ni serializa `Documento`.
- Pasan las pruebas de UI, API y MAPI pertinentes y se completa una comprobación de extremo a extremo de la consulta autorizada en el entorno de prueba disponible.
- Se actualiza la documentación de endpoints y del modelo/consulta de datos; cualquier verificación de SQL se registra sin afirmar que la base de datos fue comprobada si no se ejecutó contra ella.
- Se verifica que no se introducen operaciones de edición, eliminación o descarga dentro de este alcance.

### Requisitos no funcionales

- Mantener el acceso de solo lectura y minimizar los datos transferidos; el binario nunca forma parte de la respuesta del listado.
- Aplicar filtros, vigencia y ordenamiento en SQL mediante la consulta existente o su ajuste aprobado por DBA.
- No registrar el contenido binario ni datos sensibles del documento. Los mensajes al usuario no deben exponer excepciones, consultas ni detalles de infraestructura.
- Seguir los mecanismos de autorización, versionamiento, manejo de errores y registro ya establecidos en API y MAPI.

### Supuestos y verificación pendiente

- Decisión 2026-10-22: la fecha de caducidad no se usa para filtrar; el listado incluye los documentos caducados y no se requiere ajuste del procedimiento SQL por este concepto.
- `Todos` usa el valor heredado `-1`, incluye documentos asociados con tipos activos e inactivos y excluye los que no tienen tipo asociado.
- La verificación DBA en ambiente no productivo fue reportada por el solicitante y está reflejada en `SCHEMA.md`; el agente no consultó SQL Server y no afirma estado de producción.
- Las rutas implementadas deben confirmarse en las pruebas de integración autorizadas, contra la configuración efectiva de versionamiento y enrutamiento.
