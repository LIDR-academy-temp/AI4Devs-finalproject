# Guía de prueba de Concilia (entrega 1)

Cómo probar la aplicación desplegada en la nube con los archivos de ejemplo de `docs/archivos_ejemplo/`.

## 1. Acceso

| Dato | Valor |
|---|---|
| Aplicación (frontend) | https://conciliafe.vercel.app |
| API (documentación OpenAPI) | https://concilia-api-c1d2.onrender.com/api/docs |
| Usuario administrador | `admin@demo.concilia.app` |
| Usuario analista | `analista@demo.concilia.app` |
| Contraseña (ambos) | `Concilia2026!` |

Son usuarios de demostración de la empresa «Comercial Demo S.A.».

**Antes de empezar**
- La API corre en el plan gratuito de Render y se duerme tras unos 15 minutos sin uso. La primera petición (el login, por ejemplo) puede tardar de 30 a 60 segundos. No es un error: espera y no recargues.
- El disco de la API es efímero. Si la API se reinicia o se vuelve a desplegar, se pierden los archivos subidos y hay que volver a cargarlos.

## 2. Archivos de prueba

| Archivo | Para qué sirve | Paso |
|---|---|---|
| `docs/archivos_ejemplo/Intranet_ejemplo.xlsx` (hoja `Detalle`, 14.484 filas) | Ventas con tarjeta del POS (la intranet de la cadena) | Cargar POS |
| `docs/archivos_ejemplo/Liquidaciones_Diners_ejemplo.xlsx` (42 columnas, 7.578 filas) | Extracto de liquidaciones de Diners | Cargar extracto |
| `docs/archivos_ejemplo/Locales_mapeo_ejemplo.xlsx` (hoja `LOCALES`) | Relación entre el código de establecimiento del banco y el nombre del local del POS | Relación de locales |

Notas sobre los datos:
- El POS mezcla adquirentes (la columna `TARJETA` es en realidad el adquirente: DINERS, PRODUBANCO, GUAYAQUIL, PACIFICO). Solo las ventas DINERS pueden cruzar con este extracto, así que es normal que queden muchas pendientes.
- Los archivos cumplen el límite de 10 MB. Si la importación se corta por tiempo o memoria en el plan gratuito, repite la prueba con el dataset pequeño de `samples/standard/` (`pos.csv` y `bank.csv`, 1.205 ventas y 986 abonos), cuyo resultado esperado está en `samples/standard/expected.json`. Los formatos de esos CSV se describen en `samples/README.md`.

## 3. Paso a paso

### 3.1 Iniciar sesión
1. Abre https://conciliafe.vercel.app e inicia sesión con el usuario y la contraseña de la tabla anterior.
2. Entra en **Conciliaciones**.

### 3.2 Crear la conciliación (paso 1 de 3)
1. Pulsa **Nueva conciliación**.
2. Completa:
   - **Nombre:** `Prueba agosto 2026`.
   - **Inicio / Fin del período:** `01/08/2026` y `31/08/2026`.
   - Deja los parámetros por defecto: **Ventana de días** 3, **Tolerancia de monto** 0,05, **% comisión** 0, **% retención** 0.
3. Pulsa **Crear conciliación**. Se abre el detalle, en estado `DRAFT`.

### 3.3 Cargar la relación de locales
Sin ella el cruce por local + lote + referencia no puede aplicarse.
1. En el detalle, en la tarjeta **Relación de locales**, pulsa **Cargar relación**.
2. Selecciona `Locales_mapeo_ejemplo.xlsx`.
3. Debe aparecer un mensaje como «N locales relacionados». Se lee la primera hoja (`LOCALES`): primera columna = código del banco, segunda = nombre del local del POS, con cabecera en la primera fila.

### 3.4 Cargar el POS (paso 2 de 3)
1. En la tarjeta **Archivos**, pulsa **Cargar POS** y selecciona `Intranet_ejemplo.xlsx`.
2. Aparece la vista previa. Configura:
   - **Fila de cabeceras:** 1
   - **Formato de fecha:** `yyyy-MM-dd` (comprueba que «Primera fecha» muestre un valor interpretado, por ejemplo `2026-08-01`)
   - **Separador decimal:** Punto
3. Asigna cada columna del archivo al campo correspondiente:

| Columna del archivo | Campo en Concilia |
|---|---|
| `FECHA` | Fecha *(obligatorio)* |
| `VALOR TARJETA` | Monto *(obligatorio)* |
| `ALMACEN` | Código de local |
| `LOTE` | Lote |
| `REFERENCIA` | Referencia |

   Deja el resto sin asignar. No asignes `VALOR FACTURA` al campo Monto: un campo no puede estar en dos columnas.
4. Pulsa **Importar**. El resumen muestra las filas importadas y las rechazadas (puedes descargar el CSV de errores).

### 3.5 Cargar el extracto bancario (paso 3 de 3)
1. Vuelve al detalle, pulsa **Cargar extracto** y selecciona `Liquidaciones_Diners_ejemplo.xlsx`.
2. Configura:
   - **Fila de cabeceras:** 1
   - **Formato de fecha:** `yyyyMMdd`
   - **Separador decimal:** Punto
3. Asigna las columnas:

| Columna del archivo | Campo en Concilia |
|---|---|
| `Fecha del pago` | Fecha de contabilización *(obligatorio)* |
| `Valor Pago Cuota` | Monto *(obligatorio, neto acreditado)* |
| `Valor Bruto Cuota` | Monto bruto |
| `Valor Comisión Cuota` | Comisión |
| `Código único` | Código de local |
| `Número Recap o Lote` | Lote |
| `Número vale` | Referencia |
| `Número de autorización` | Código de autorización *(opcional)* |

   Si en tu navegador algunas cabeceras muestran caracteres raros (`Valor Comisi?n Cuota`), es solo un problema de codificación del archivo de ejemplo; asigna por posición y nombre aproximado.
4. Pulsa **Importar**.

### 3.6 Ejecutar la conciliación
1. En el detalle, tarjeta **Ejecución**, pulsa **Ejecutar**. Si falta algún archivo, el panel indica «Falta importar: …».
2. Revisa los parámetros del diálogo y confirma.
3. La conciliación pasa a `PROCESSING` y el panel se actualiza solo. Al terminar queda en `COMPLETED` con las estadísticas: porcentaje cruzado, cruces por nivel, propuestas por revisar y pendientes.
4. Resultado esperado con estos tres archivos y el mapeo de esta guía (verificado con la API):
   - Importación POS: 14.484 filas válidas, 0 rechazadas. Importación extracto: 7.578 filas válidas, 0 rechazadas.
   - Cruces automáticos: **4.171** de nivel 1 (`EXACT`: local + lote + referencia, comparando el monto bruto), es decir, un 28,8 % de las ventas del POS.
   - **395** propuestas por revisar, **9.918** ventas POS pendientes y **3.012** movimientos bancarios pendientes; 0 excepciones; diferencia total 0,00.
   - Es normal que la mayoría del POS quede pendiente: contiene ventas de otros adquirentes y de locales sin relación (por ejemplo `ALM. EXTERNOS 02`).

### 3.7 Revisar resultados
El panel de resultados muestra los indicadores principales (totales, conciliadas, pendientes, propuestas, excepciones y diferencia) y las pestañas **Conciliadas**, **Pendientes POS**, **Pendientes banco**, **Propuestas** y **Excepciones**, cada una con su contador.
- Prueba los **filtros** (fechas, monto, marca, método) y la paginación.
- Abre un cruce para ver las transacciones de ambos lados, el método (`EXACT` o `TOLERANCE`), la confianza y la diferencia.
- Abre una transacción para ver, bajo demanda, la **fila original** del archivo.

### 3.8 Cruce manual, confirmar, rechazar y deshacer
1. Abre la pestaña **Cruce manual**.
2. Selecciona una o varias ventas pendientes (izquierda) y uno o varios movimientos pendientes (derecha). La barra muestra la suma de cada lado y la diferencia.
3. Escribe una nota (máximo 500 caracteres) y pulsa **Crear cruce manual**. Si la diferencia no es cero, te pide confirmación.
4. El cruce aparece en **Conciliadas** con método `MANUAL`, el usuario y la nota, y los indicadores se recalculan sin recargar la página.
5. En **Propuestas**, confirma o rechaza una propuesta. Al rechazarla, sus transacciones vuelven a pendientes y el motor no la vuelve a proponer en esa conciliación.
6. En cualquier cruce puedes **Deshacer**: las transacciones vuelven a `PENDING`.

## 4. Qué todavía no está disponible

Quedan para la entrega 3: cruce agrupado (nivel 3, lote → abono único), sugerencias con IA, gestión de excepciones y auditoría completa, exportación a Excel y plantillas de importación.

## 5. Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| El login tarda mucho | La API estaba dormida. Espera hasta un minuto. |
| Error de red o CORS en el navegador | Comprueba que `CORS_ORIGIN` en Render sea exactamente `https://conciliafe.vercel.app`, sin barra final. |
| «La primera fecha no coincide con el formato elegido» | Cambia el **Formato de fecha**: POS `yyyy-MM-dd`, extracto `yyyyMMdd`. |
| «Falta asignar: Fecha, Monto» | Los campos obligatorios son Fecha y Monto (POS) y Fecha de contabilización y Monto (extracto). |
| Casi nada cruza | Falta cargar la relación de locales o no están asignados Código de local, Lote y Referencia en ambos archivos. |
| Los archivos subidos desaparecieron | La API se reinició (disco efímero). Vuelve a cargarlos. |
