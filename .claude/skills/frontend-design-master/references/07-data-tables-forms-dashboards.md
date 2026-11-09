# 07 — Pantallas operativas: tablas, formularios y dashboards

## Prioridad: velocidad y precisión

En ERP, inventario, soporte, ventas o administración, priorizar productividad sobre marketing visual. Menos clics, contexto persistente, datos legibles y operaciones seguras.

## Tablas de datos

- Definir clave estable, orden por defecto y criterios de ranking explícitos.
- Encabezados claros; texto a izquierda, números/monedas alineados consistentemente a derecha y formato regional correcto.
- Filtros visibles, indicador de filtros activos, limpiar filtros y estados de 0 resultados.
- Paginación/virtualización según tamaño, con navegación accesible y conservando selección.
- Acciones masivas requieren selección clara y confirmación cuando son destructivas.
- Edición inline: validación, indicador de guardado, errores por fila, cancelación y conflictos.
- Evitar ocultar información crucial en tooltips o solo hover.
- Con muchos campos, controlar ancho, columnas sticky o una vista de detalle en vez de encoger tipografía en exceso.

## Formularios empresariales

- Secciones por tarea; navegación por teclado de alta calidad.
- Mensajes de validación próximos al campo; conservar cambios fallidos.
- Indicar permisos y campos calculados; evitar que campos deshabilitados parezcan editables.
- Guardar solo tras respuesta exitosa del servidor; evitar doble clic o envíos duplicados.
- Diseño para lectores de código de barras/escáner wedge: foco intencional, Enter/sufijos, recuperación de lecturas inválidas, prevención de envío accidental.
- Si hay operación offline, explicar estado de sincronización y conflictos.

## Dashboards

- Formular la pregunta decisional de cada KPI: ¿qué debe hacer el usuario con este número?
- Mostrar título, periodo, unidades, filtros activos, fuente y fecha de actualización cuando aplique.
- Comparaciones con base y tendencia explícitas; no variar escalas para exagerar diferencias.
- Colores semánticos coherentes, incluyendo leyenda y etiquetas no basadas solo en color.
- Tablas y gráficos complementarios, no redundantes.
- Estados de carga/ausencia de datos y discrepancias visibles.

## Seguridad operativa

Confirmación y auditoría de eliminación, cambios de precio, pagos, reversos, descuentos o permisos según políticas del proyecto. No revelar más información de la necesaria. Este módulo no autoriza modificaciones a base de datos.

## Entregable específico

Definir distribución, interacciones, densidad, campos, filtros, validaciones, estados, flujo de teclado y comportamiento con miles de registros si aplica.
