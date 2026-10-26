# PRD — Concilia

**Documento de requisitos del producto (Product Requirements Document)**

| Campo | Valor |
|---|---|
| Producto | Concilia — conciliación automática de ventas con tarjeta (POS) contra extracto bancario |
| Versión del documento | 1.0 |
| Fecha | 2026-10-23 |
| Autor | Rafael Josué Arteaga Mosquera |
| Estado | Borrador para revisión |
| Documentos relacionados | [readme.md](../readme.md) (arquitectura, modelo de datos, API, historias y tickets) · [prompts.md](../prompts.md) |

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Contexto y problema](#2-contexto-y-problema)
3. [Objetivos y no-objetivos](#3-objetivos-y-no-objetivos)
4. [Usuarios y personas](#4-usuarios-y-personas)
5. [Casos de uso y recorrido del usuario](#5-casos-de-uso-y-recorrido-del-usuario)
6. [Alcance del MVP](#6-alcance-del-mvp)
7. [Requisitos funcionales](#7-requisitos-funcionales)
8. [Reglas de negocio del motor de conciliación](#8-reglas-de-negocio-del-motor-de-conciliación)
9. [Requisitos no funcionales](#9-requisitos-no-funcionales)
10. [Uso de inteligencia artificial](#10-uso-de-inteligencia-artificial)
11. [Métricas de éxito](#11-métricas-de-éxito)
12. [Supuestos y dependencias](#12-supuestos-y-dependencias)
13. [Riesgos y mitigaciones](#13-riesgos-y-mitigaciones)
14. [Plan de entregas](#14-plan-de-entregas)
15. [Decisiones abiertas](#15-decisiones-abiertas)
16. [Glosario](#16-glosario)

---

## 1. Resumen ejecutivo

Las cadenas comerciales cobran cada día cientos o miles de ventas con tarjeta. Para confirmar que el banco acreditó todo lo vendido, una persona del área financiera cruza a mano, en Excel, el reporte del punto de venta (POS) contra el extracto bancario. El proceso tarda horas o días por cierre, es propenso a errores y no deja trazabilidad.

**Concilia** es una aplicación web que recibe ambos archivos, los normaliza y ejecuta un motor de conciliación por niveles de confianza que resuelve automáticamente la mayoría de los cruces. Lo que queda se presenta ordenado, con sugerencias generadas por IA, para que el analista lo resuelva en minutos.

**Propuesta de valor en una frase:** convertir un cierre de varias horas en Excel en una revisión de minutos sobre las únicas partidas que de verdad requieren criterio humano, con trazabilidad completa de cada cruce.

**Principio rector del producto:** *precisión antes que cobertura*. Un cruce que no se hizo lo resuelve el analista; un cruce equivocado confirmado automáticamente pasa desapercibido y destruye la confianza en la herramienta.

---

## 2. Contexto y problema

### 2.1 Situación actual

1. El POS registra cada venta con tarjeta (fecha, monto, código de autorización, últimos 4 dígitos, lote, terminal, local).
2. El banco, adquirente o procesador acredita esas ventas en la cuenta de la empresa y entrega un extracto en Excel o CSV.
3. El banco **no siempre acredita transacción por transacción**: puede depositar por lotes (varias ventas en un solo abono), con desfase de días entre venta y acreditación, y con montos netos de comisión y retención.
4. El analista cruza ambas fuentes en una hoja de cálculo con fórmulas de búsqueda, filtros y revisión visual.

### 2.2 Dolores concretos

| Dolor | Consecuencia |
|---|---|
| Cruce manual de miles de filas | Horas o días de trabajo al cierre de cada período |
| Fórmulas rotas, filas omitidas, cruces equivocados | Diferencias no detectadas o detectadas tarde |
| Depósitos por lote, netos y con desfase | El cruce 1:1 no funciona; el analista suma a mano |
| Cada banco y cada POS exporta con columnas distintas | Cada mes se rehace el trabajo de adaptación del archivo |
| Sin registro de quién cruzó qué y por qué | Imposible auditar o repetir el proceso |

### 2.3 Por qué ahora

Los equipos financieros tienen presión por cerrar más rápido y con menos personas. Los modelos de lenguaje actuales permiten resolver tareas que antes exigían reglas frágiles: interpretar cabeceras de archivos heterogéneos y proponer cruces para casos ambiguos con una explicación. Combinar reglas determinísticas con IA explicable hace viable un producto que antes necesitaba integraciones costosas por banco.

---

## 3. Objetivos y no-objetivos

### 3.1 Objetivos del producto

| ID | Objetivo | Indicador |
|---|---|---|
| OBJ-1 | Reducir drásticamente el tiempo de cierre | Tiempo de conciliar un período frente a la línea base manual |
| OBJ-2 | Conciliar automáticamente la mayoría de las transacciones sin falsos positivos | Tasa de conciliación automática ≥ 90 % con precisión ≥ 99 % en el dataset estándar |
| OBJ-3 | Concentrar la atención humana solo en excepciones | Número de partidas pendientes por cierre y tiempo medio de resolución |
| OBJ-4 | Dar trazabilidad y explicabilidad total | Cada cruce registra método, confianza, usuario, fecha y explicación |
| OBJ-5 | Funcionar con cualquier banco o POS que exporte CSV o Excel | Mapeo de columnas configurable y reutilizable, sin desarrollo por cliente |

### 3.2 No-objetivos (fuera de alcance del MVP)

- Conexión directa con APIs bancarias, SFTP, ERP o sistemas contables.
- Lectura de extractos en PDF.
- Conciliación contable (generación de asientos).
- Multi-moneda.
- Aplicación móvil.
- Pantalla de alta y gestión de empresas (se crean por *seed*).
- Aprendizaje automático a partir de las decisiones manuales del usuario (se registran para una fase posterior).
- Conciliación de efectivo, transferencias u otros medios de pago distintos de tarjeta.

---

## 4. Usuarios y personas

### 4.1 Analista de conciliación / tesorería (usuario principal)

- **Perfil:** persona del área financiera que hoy hace el cruce en Excel. Domina su extracto y su reporte POS; no es técnica.
- **Objetivo:** cerrar el período rápido y sin errores, y poder explicar cada diferencia.
- **Frustraciones:** sumar depósitos por lote a mano, rehacer el mapeo de columnas cada mes, no saber si lo que falta es un error del banco o del POS.
- **Frecuencia de uso:** diaria o semanal; intensiva en cierre de mes.

### 4.2 Jefe financiero / contador (usuario de consulta)

- **Perfil:** responsable del área. No opera el cruce, pero responde por el resultado ante auditoría y gerencia.
- **Objetivo:** saber qué porcentaje está conciliado, cuánto dinero sigue sin explicar y tener un reporte archivable.
- **Preocupación específica:** confidencialidad de los extractos bancarios, especialmente si se envían a un servicio de IA externo.

### 4.3 Administrador (usuario ocasional)

- **Perfil:** persona de sistemas o el propio jefe financiero.
- **Objetivo:** gestionar usuarios y plantillas de importación de la empresa.
- **Nota de alcance:** en el MVP el rol existe en el modelo de datos, pero no se construye UI ni permisos diferenciados más allá de lo mínimo.

---

## 5. Casos de uso y recorrido del usuario

### 5.1 Casos de uso principales

| ID | Caso de uso | Actor | Historias relacionadas |
|---|---|---|---|
| CU-1 | Conciliar un período de ventas con tarjeta | Analista | HU-02 a HU-08 |
| CU-2 | Adaptar un archivo nuevo de banco o POS | Analista | HU-05, HU-12 |
| CU-3 | Resolver pendientes con ayuda de la IA | Analista | HU-09 |
| CU-4 | Documentar partidas sin contraparte | Analista | HU-10 |
| CU-5 | Obtener el reporte del cierre para auditoría | Jefe financiero | HU-07, HU-11 |
| CU-6 | Consultar el histórico de conciliaciones | Jefe financiero | HU-07 |

### 5.2 Recorrido principal (CU-1)

```
Login → Listado de conciliaciones → Nueva conciliación (nombre, período, parámetros)
      → Cargar archivo POS → Mapear columnas → Cargar extracto banco → Mapear columnas
      → Ejecutar conciliación → Panel de resultados
      → Revisar propuestas / cruces manuales / excepciones → Exportar Excel
```

**Resultado esperado para el usuario:** tras ejecutar, ve de inmediato el porcentaje conciliado, el monto sin explicar y una lista corta de partidas pendientes ordenadas por relevancia. Cada acción que realiza sobre esas partidas queda registrada.

### 5.3 Pantallas

1. **Login.**
2. **Listado de conciliaciones:** nombre, período, estado, porcentaje conciliado y fecha.
3. **Asistente de nueva conciliación:** wizard (datos generales → archivo POS → archivo banco → ejecutar).
4. **Mapeo de columnas:** vista previa de las primeras filas y selector de campo estándar por columna, con la sugerencia de IA preseleccionada.
5. **Panel de resultados:** tarjetas de KPIs y tablas por estado.
6. **Conciliación manual:** dos tablas lado a lado (POS | Banco) con selección múltiple y barra de diferencia en vivo.

---

## 6. Alcance del MVP

El MVP se entrega en dos hitos (ver [plan de entregas](#14-plan-de-entregas)). Criterio de corte: todo lo necesario para que un analista complete el recorrido principal con sus propios archivos y obtenga un reporte archivable.

| Capacidad | MVP | Comentario |
|---|---|---|
| Importación CSV / XLSX con mapeo manual de columnas | Sí | Base de todo el flujo |
| Normalización de fechas, montos, referencias y enmascarado de tarjetas | Sí | |
| Motor niveles 1 (exacto) y 2 (tolerancia) | Sí | Entrega 2 |
| Motor nivel 3 (agrupado N:1) | Sí | Entrega 3 |
| Motor nivel 4 (asistido por IA) | Sí | Entrega 3, siempre con confirmación humana |
| Sugerencia de mapeo por IA | Sí | Entrega 3 |
| Panel de resultados, conciliación manual y deshacer | Sí | |
| Excepciones con motivo | Sí | Entrega 3 |
| Exportación a Excel | Sí | Entrega 3 |
| Plantillas de importación reutilizables | Deseable | Prioridad *Could*; se incluye si hay capacidad |
| Auditoría como módulo independiente | Deseable | La trazabilidad mínima la dan los campos de `Match` |
| Roles diferenciados con UI propia | No | Un solo rol operativo en el MVP |
| Integraciones directas, PDF, multi-moneda, móvil | No | Ver no-objetivos |

---

## 7. Requisitos funcionales

Prioridad MoSCoW: **M** = Must, **S** = Should, **C** = Could. La columna HU enlaza con las historias de usuario del readme.

### 7.1 Autenticación y aislamiento de datos

| ID | Requisito | Prior. | HU |
|---|---|---|---|
| RF-01 | El sistema permite iniciar sesión con correo y contraseña. | M | HU-01 |
| RF-02 | Ante credenciales incorrectas se muestra un mensaje genérico que no revela si el correo existe. | M | HU-01 |
| RF-03 | Todo recurso consultado o modificado pertenece a la empresa del usuario autenticado; el identificador de empresa se obtiene del token, nunca del cliente. | M | HU-01 |

### 7.2 Gestión de conciliaciones

| ID | Requisito | Prior. | HU |
|---|---|---|---|
| RF-04 | El usuario crea una conciliación con nombre, fecha de inicio, fecha de fin y parámetros del motor. | M | HU-02 |
| RF-05 | Se rechaza un período cuya fecha de fin sea anterior a la de inicio. | M | HU-02 |
| RF-06 | Los parámetros del motor tienen valores por defecto editables: ventana de días (3), tolerancia de monto (0,05), % comisión (0), % retención (0), agrupación habilitada (sí). | M | HU-02 |
| RF-07 | El listado muestra nombre, período, estado, porcentaje conciliado y fecha, con paginación y filtros por estado y período. | M | HU-02, HU-07 |
| RF-08 | Una conciliación sigue el ciclo `DRAFT → PROCESSING → COMPLETED → CLOSED`, o `FAILED` ante error. | M | HU-06 |

### 7.3 Importación de archivos

| ID | Requisito | Prior. | HU |
|---|---|---|---|
| RF-09 | Se aceptan archivos `.csv` y `.xlsx` de hasta 10 MB para POS y banco; otros formatos o tamaños se rechazan con un mensaje claro. | M | HU-03, HU-04 |
| RF-10 | Tras la carga se muestra una vista previa de las primeras 20 filas. | M | HU-03 |
| RF-11 | El sistema detecta por hash SHA-256 que un mismo archivo se sube dos veces en la misma conciliación y avisa al usuario. | M | HU-03 |
| RF-12 | El usuario asigna a cada columna del archivo un campo estándar de Concilia; fecha y monto son obligatorios para continuar. | M | HU-05 |
| RF-13 | Al confirmar el mapeo se importan las filas válidas y se informa el número de filas rechazadas con su motivo, sin bloquear la importación. | M | HU-05 |
| RF-14 | En extractos bancarios solo se importan abonos; los débitos se descartan e informan en el resumen de importación. | M | HU-04 |
| RF-15 | Se admiten extractos con o sin columnas de comisión y retención. | M | HU-04 |
| RF-16 | La IA sugiere el mapeo de columnas analizando cabeceras y filas de ejemplo; la sugerencia aparece preseleccionada y es editable. | S | HU-05 |
| RF-17 | El usuario puede guardar un mapeo como plantilla con nombre y aplicarla en cargas posteriores; si las columnas no coinciden, el sistema lo advierte. | C | HU-12 |

### 7.4 Normalización de datos

| ID | Requisito | Prior. | HU |
|---|---|---|---|
| RF-18 | Las fechas se interpretan según el formato indicado (p. ej. `dd/MM/yyyy`, `MM/dd/yyyy`) y también desde números de serie de Excel. | M | HU-05 |
| RF-19 | Los montos aceptan separador decimal `.` o `,`, con o sin separador de miles y símbolo de moneda, y se almacenan como decimal, nunca como flotante. | M | HU-05 |
| RF-20 | Cualquier número de tarjeta se reduce a sus últimos 4 dígitos; el número completo nunca se persiste ni se registra en logs. | M | HU-05 |
| RF-21 | Las referencias y textos se normalizan (espacios, mayúsculas) para el cruce; la fila original se conserva íntegra para trazabilidad. | M | HU-05 |

### 7.5 Motor de conciliación

| ID | Requisito | Prior. | HU |
|---|---|---|---|
| RF-22 | La ejecución requiere al menos un archivo POS y uno bancario importados; en caso contrario se informa el motivo. | M | HU-06 |
| RF-23 | La ejecución es asíncrona: la conciliación pasa a `PROCESSING` y el usuario ve un indicador de progreso. | M | HU-06 |
| RF-24 | El motor aplica en orden los niveles exacto, tolerancia y agrupado; cada nivel trabaja solo con lo que los anteriores dejaron sin cruzar. | M | HU-06 |
| RF-25 | Una transacción pertenece como máximo a un cruce activo (`CONFIRMED` o `PROPOSED`). | M | HU-06, HU-08 |
| RF-26 | Al terminar, el estado pasa a `COMPLETED` y se calculan y persisten las estadísticas del resultado. | M | HU-06 |
| RF-27 | Ante error, el estado pasa a `FAILED`, no se persisten cruces parciales y se muestra el motivo. | M | HU-06 |
| RF-28 | Se puede volver a ejecutar; los cruces automáticos se recalculan y los manuales y las excepciones se conservan. | M | HU-06 |
| RF-29 | Cada cruce registra método, cardinalidad, confianza, totales de cada lado, diferencia, explicación (obligatoria en IA), usuario y fecha. | M | HU-07 |

### 7.6 Resultados y revisión

| ID | Requisito | Prior. | HU |
|---|---|---|---|
| RF-30 | El panel muestra KPIs: total POS, total banco, número y porcentaje de conciliadas, pendientes de cada lado y diferencia total en monto. | M | HU-07 |
| RF-31 | Pestañas: Conciliadas, Pendientes POS, Pendientes banco, Propuestas y Excepciones, con paginación y filtros por fecha, monto, marca y método. | M | HU-07 |
| RF-32 | El usuario selecciona una o varias transacciones de cada lado, ve en vivo la suma de cada lado y la diferencia, y crea un cruce manual confirmado. | M | HU-08 |
| RF-33 | Cualquier cruce puede deshacerse; sus transacciones vuelven a `PENDING` y la acción queda registrada. | M | HU-08 |
| RF-34 | No se puede incluir en un cruce una transacción que ya pertenezca a otro cruce activo. | M | HU-08 |
| RF-35 | El usuario solicita sugerencias de IA para los pendientes; se generan propuestas con confianza y explicación que puede aceptar o rechazar una a una. | S | HU-09 |
| RF-36 | Una propuesta rechazada no vuelve a sugerirse en la misma conciliación. | S | HU-09 |
| RF-37 | Si el servicio de IA no está disponible, se informa sin afectar el resto de la aplicación. | S | HU-09 |
| RF-38 | Una transacción pendiente puede marcarse como excepción con motivo predefinido (contracargo, anulación, error de registro en POS, pendiente de acreditación, otro con nota obligatoria) y revertirse. | S | HU-10 |
| RF-39 | Las excepciones dejan de contar como pendientes en los KPIs. | S | HU-10 |

### 7.7 Exportación e historial

| ID | Requisito | Prior. | HU |
|---|---|---|---|
| RF-40 | El usuario descarga un Excel con hojas de Resumen, Conciliadas (método y diferencia), Pendientes POS, Pendientes banco y Excepciones; los montos se exportan como números. | S | HU-11 |
| RF-41 | Se registran en auditoría las acciones críticas: ejecutar conciliación, crear o deshacer cruce, confirmar o rechazar propuesta de IA, marcar excepción. | C | HU-08, HU-10 |

---

## 8. Reglas de negocio del motor de conciliación

### 8.1 Niveles

| Nivel | Estrategia | Regla | Confianza | Resultado |
|---|---|---|---|---|
| 1 | Exacto | Mismo código de autorización + mismo monto + misma fecha | 1,0 | Confirmado automáticamente |
| 2 | Tolerancia | Mismo monto (o neto esperado) + últimos 4 dígitos, dentro de la ventana de días | Media-alta | Confirmado automáticamente solo si el candidato es único en ambos lados; en otro caso, propuesta |
| 3 | Agrupado (N:1) | Suma de varias ventas POS del mismo día, lote, marca o código de comercio = un depósito bancario, considerando comisión y retención | Media | Propuesta |
| 4 | Asistido por IA | El LLM analiza pendientes pre-filtrados y propone cruces con explicación | Variable | Propuesta; nunca se confirma sin acción humana |

### 8.2 Reglas transversales

- **Ambigüedad bloquea el auto-confirmado.** Si una clave de cruce tiene más de un candidato en algún lado, el nivel no cruza y deja las partidas para niveles posteriores o para propuesta.
- **Depósitos netos.** Para cada venta o grupo se calcula `neto_esperado = bruto − bruto × %comisión − bruto × %retención`; el cruce es válido si `|neto_esperado − monto_banco| ≤ tolerancia`.
- **Precisión sobre cobertura.** Ante duda, el motor propone en lugar de confirmar. Los montos muy repetidos (p. ej. 5, 10, 20) sin código de autorización ni últimos 4 dígitos nunca se auto-confirman.
- **Aritmética decimal.** Todos los montos se procesan con precisión decimal; ningún cálculo se delega al modelo de IA, el backend recalcula siempre la diferencia.
- **Idempotencia.** Re-ejecutar el motor sobre la misma conciliación produce el mismo resultado automático y respeta los cruces manuales, las propuestas aceptadas y las excepciones.

### 8.3 Estados de una transacción

`PENDING` (sin cruzar) → `MATCHED` (en cruce confirmado) · `PROPOSED` (en cruce propuesto) · `EXCEPTION` (documentada sin contraparte). Deshacer un cruce o revertir una excepción devuelve la transacción a `PENDING`.

---

## 9. Requisitos no funcionales

| ID | Categoría | Requisito |
|---|---|---|
| RNF-01 | Rendimiento | Importar un archivo de 5.000 filas en menos de 10 segundos. |
| RNF-02 | Rendimiento | El motor procesa 10.000 × 10.000 registros (niveles 1 a 3) en menos de 2 segundos en memoria. |
| RNF-03 | Rendimiento | La API responde de inmediato a la ejecución del motor (202) y el frontend consulta el estado; conciliaciones grandes no bloquean la interfaz. |
| RNF-04 | Seguridad | Autenticación JWT de corta duración y contraseñas con hash bcrypt. |
| RNF-05 | Seguridad | Aislamiento multiempresa en toda consulta; autorización por roles mediante guards. |
| RNF-06 | Seguridad | Nunca se almacena el número completo de tarjeta (PAN), alineado con buenas prácticas PCI DSS. |
| RNF-07 | Seguridad | Validación de extensión, tipo MIME y tamaño de archivos; cabeceras HTTP endurecidas; CORS restringido; rate limiting en login. |
| RNF-08 | Privacidad | Al LLM solo se envían campos no sensibles y enmascarados (fecha, monto, últimos 4, lote, referencia, marca). La clave de API reside solo en el backend. |
| RNF-09 | Privacidad | La funcionalidad de IA es opcional: el producto completa el recorrido principal sin ella. |
| RNF-10 | Fiabilidad | La ejecución del motor y la importación son transaccionales: ante error no quedan datos parciales. |
| RNF-11 | Fiabilidad | Timeout de 60 s y un único reintento en llamadas al servicio de IA; la caída del servicio se degrada con un mensaje amigable. |
| RNF-12 | Trazabilidad | Cada cruce conserva método, confianza, usuario, fecha y explicación; cada transacción conserva su fila original. |
| RNF-13 | Calidad | Cobertura de tests ≥ 90 % en el motor de conciliación y los normalizadores; tests de integración de la API y E2E del recorrido principal. |
| RNF-14 | Usabilidad | El recorrido principal se completa sin documentación adicional; los errores de importación indican fila, campo y motivo. |
| RNF-15 | Mantenibilidad | El motor es una capa de dominio pura, sin dependencia de framework ni base de datos, testeable con datasets sintéticos. |
| RNF-16 | Operación | Despliegue continuo desde `main` con migraciones automáticas; configuración por variables de entorno. |

---

## 10. Uso de inteligencia artificial

### 10.1 Dónde se usa IA y dónde no

| Tarea | Enfoque | Motivo |
|---|---|---|
| Cruce exacto, por tolerancia y agrupado | Reglas determinísticas | Resultados reproducibles, auditables y rápidos; no hay ambigüedad que justifique un modelo |
| Normalización de fechas y montos | Reglas determinísticas | Errores aquí contaminan todo el cruce; deben ser verificables |
| Sugerencia de mapeo de columnas | IA (LLM) | Las cabeceras de bancos y POS son heterogéneas; el modelo interpreta semántica donde las reglas fallan |
| Propuestas de cruce para pendientes | IA (LLM) | Combina varios atributos débiles y da una explicación legible; el humano decide |

### 10.2 Garantías

- Las propuestas de IA **nunca se confirman automáticamente**.
- La respuesta del modelo se valida contra un esquema estricto; se descartan propuestas con identificadores inexistentes, ya cruzados o rechazados.
- El backend recalcula totales y diferencias; no se confía en la aritmética del modelo.
- Se pre-filtran candidatos por ventana de fechas y rango de monto (±15 %) y se procesa en bloques de hasta 50 movimientos por llamada para acotar contexto y coste.
- Los prompts utilizados se documentan en `prompts.md`.

---

## 11. Métricas de éxito

### 11.1 Medibles en el proyecto (con datasets sintéticos y resultado esperado)

| Métrica | Definición | Objetivo |
|---|---|---|
| Precisión de cruces automáticos (**principal**) | Cruces automáticos correctos / cruces automáticos totales | ≥ 99 % |
| Tasa de conciliación automática | Transacciones cruzadas sin intervención humana / total | ≥ 90 % en el dataset estándar; reportada por escenario (exacto, desfase, lote, neto) |
| Tasa de aceptación de sugerencias de IA | Propuestas de nivel 4 aceptadas / propuestas generadas | ≥ 60 % inicial |
| Rendimiento del motor | Tiempo para 10.000 × 10.000 registros | < 2 s |
| Tasa de filas rechazadas en importación | Filas con error / filas totales | < 1 % |

### 11.2 Medibles con uso real

| Métrica | Definición | Uso |
|---|---|---|
| Tiempo de cierre de un período | Horas desde la carga hasta el reporte final, frente a la línea base manual | Indicador de valor para el cliente; requiere medir la línea base actual |
| Tasa de cruces deshechos | Cruces automáticos deshechos por el usuario / cruces automáticos | Mide la confianza real en el motor |
| Monto pendiente sin explicar al cierre | Suma de pendientes no marcados como excepción | Indicador clave para el jefe financiero |

---

## 12. Supuestos y dependencias

### 12.1 Supuestos

- El banco o adquirente del cliente entrega el extracto en CSV o Excel. Si solo entrega PDF, el producto no aplica en el MVP.
- El reporte del POS incluye al menos fecha y monto; idealmente también código de autorización y últimos 4 dígitos. Sin estos dos últimos, la tasa de conciliación automática será menor.
- Una conciliación cubre un período cerrado; las ventas acreditadas fuera del período quedan como pendientes de ambos lados (ver decisiones abiertas).
- El volumen por conciliación es de miles a decenas de miles de transacciones, procesable en memoria en un solo proceso.
- Una sola moneda por empresa.

### 12.2 Dependencias

- Disponibilidad del servicio de IA (Claude API) para las funciones de nivel 4 y sugerencia de mapeo. El producto debe funcionar sin ellas.
- Al menos un archivo real anonimizado de cada lado (POS y banco) para validar las reglas antes de la entrega final.
- Infraestructura de despliegue (Render/Railway para API y base de datos, Vercel para frontend).

---

## 13. Riesgos y mitigaciones

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| 1 | **Falsos positivos:** cruces automáticos equivocados que pasan desapercibidos | Alto | Principio de precisión sobre cobertura; nivel 2 solo auto-confirma con candidato único y últimos 4 dígitos; ambigüedad bloquea; métrica principal de precisión ≥ 99 % |
| 2 | El objetivo de 90 % no está validado con datos reales | Alto | Conseguir archivos reales anonimizados antes de la entrega final; reportar la tasa por escenario |
| 3 | Transacciones que cruzan períodos quedan pendientes en dos conciliaciones | Medio | Documentar el caso; evaluar arrastre de pendientes en una fase posterior (ver decisiones abiertas) |
| 4 | Comisiones distintas por marca de tarjeta y adquirente | Medio | Un único % por conciliación en el MVP; el modelo admite `grossAmount`/`feeAmount` por movimiento cuando el extracto los detalla; evolución a tarifas por marca |
| 5 | Múltiples locales y códigos de comercio: el banco deposita por comercio | Medio | Incluir `storeCode` como criterio de agrupación del nivel 3 |
| 6 | Devoluciones, anulaciones y contracargos no reconocidos por el motor | Medio | En el MVP se tratan como excepciones con motivo; evaluar neteo venta/anulación en una fase posterior |
| 7 | Resistencia del cliente a subir extractos y a enviar datos a un LLM externo | Medio | IA opcional; documentar exactamente qué campos se envían; nunca PAN ni datos personales |
| 8 | Bancos que solo entregan PDF | Medio | Supuesto explícito; fuera de alcance del MVP |
| 9 | Montos muy repetidos en retail (5, 10, 20) producen ambigüedad masiva | Medio | Nunca auto-confirmar sin autorización o últimos 4; dejar en propuesta |
| 10 | Conciliaciones muy grandes afectan la latencia de la API | Bajo | Ejecución asíncrona; migrar a worker con cola si el volumen crece |

---

## 14. Plan de entregas

| Hito | Fecha | Contenido | Historias |
|---|---|---|---|
| **E1** | Entregada | Documentación: producto, arquitectura, modelo de datos, API, historias y tickets | — |
| **E2** | 2026-10-23 | Flujo principal: login, conciliaciones, carga y mapeo, motor niveles 1 y 2, panel de resultados, conciliación manual | HU-01 a HU-08 |
| **E3** | 2026-11-11 | Motor nivel 3 y 4, sugerencia de mapeo por IA, excepciones, exportación, plantillas, auditoría, tests, CI/CD y despliegue | HU-09 a HU-12 |

El detalle de tickets y estimaciones está en la sección 6 del readme (E2 = 60 SP, E3 = 46 SP).

**Criterio de "hecho" del MVP (fin de E3):** un analista completa el recorrido principal con los datasets sintéticos, el motor alcanza las métricas de la sección 11.1, el flujo está cubierto por tests E2E y la aplicación está desplegada con URL pública.

---

## 15. Decisiones abiertas

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| 1 | ¿Debe el nivel 2 auto-confirmar cuando el candidato es único pero no hay últimos 4 dígitos? | (a) Confirmar si es único; (b) Proponer siempre sin últimos 4 | (b), coherente con precisión sobre cobertura. El readme actual dice (a); conviene alinearlo. |
| 2 | ¿Qué pasa con los pendientes de un período al cerrar? | (a) Quedan en esa conciliación; (b) Se arrastran a la siguiente | (a) en el MVP, con el caso documentado; (b) en roadmap |
| 3 | ¿Un único % de comisión y retención por conciliación o por marca? | (a) Único; (b) Por marca y adquirente | (a) en el MVP; (b) en roadmap, el modelo ya lo admite por movimiento |
| 4 | ¿Se incluyen plantillas de importación (HU-12) en el MVP? | (a) Sí; (b) Fuera del MVP | (b) salvo que sobre capacidad en E3 |
| 5 | ¿Cómo se obtiene la línea base del tiempo de cierre manual? | Entrevista con quien concilia hoy | Hacerlo antes de E3 para la presentación final |
| 6 | ¿Qué modelo de Claude se usa en producción y con qué coste por conciliación? | Configurable por variable de entorno | Medir coste por bloque de 50 movimientos en E3 |

---

## 16. Glosario

| Término | Definición |
|---|---|
| **POS** | Punto de venta; sistema que registra las ventas con tarjeta en la cadena comercial |
| **Adquirente** | Entidad (banco o procesador) que liquida al comercio las ventas con tarjeta |
| **Extracto** | Archivo del banco con los abonos acreditados en la cuenta |
| **Código de autorización** | Identificador que emite el emisor de la tarjeta al aprobar una venta; es la clave más fiable de cruce |
| **Lote** | Agrupación de ventas que el POS cierra y envía al adquirente; suele corresponder a un depósito |
| **Depósito neto** | Abono bancario al que ya se descontaron comisión y retención |
| **Retención** | Importe que el adquirente retiene por obligaciones fiscales |
| **Cruce (match)** | Relación entre una o más transacciones POS y uno o más movimientos bancarios |
| **Cardinalidad** | Forma del cruce: 1:1, N:1, 1:N o N:M |
| **Propuesta** | Cruce sugerido por el motor o la IA que requiere confirmación humana |
| **Excepción** | Partida sin contraparte documentada con un motivo |
| **Contracargo** | Reversión de una venta por disputa del titular de la tarjeta |
