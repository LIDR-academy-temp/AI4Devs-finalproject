# Revisión adversarial

- Fecha: 2026-11-19 10:53 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<repositorio>/openspec/specs/acceso/spec.md` · huella `fa481eb7e751` · 30778 caracteres
- Archivo: `<repositorio>/openspec/specs/aviso-inicio/spec.md` · huella `c89ca51dc3f9` · 25696 caracteres
- Archivo: `<repositorio>/openspec/specs/no-reportados/spec.md` · huella `76fff9606102` · 28538 caracteres
- Archivo: `<espacio-de-trabajo>/05-Tickets/Recorte-Entrega-20261119-v4.md` · huella `c6d68d085af4` · 8225 caracteres
- Archivo: `<espacio-de-trabajo>/06-Spec-viva/HU-01.6-prueba-local-20261118-v1.md` · huella `300e2df41965` · 4913 caracteres
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` · huella `84e92c472ace` · 38894 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. CRÍTICO — La comprobación de aislamiento ignora vistas y funciones que pueden omitir las reglas por organización

- **Qué está mal:** La garantía de separación en la base inspecciona únicamente tablas, aunque una vista, vista materializada o función con privilegios del dueño puede exponer esas mismas filas sin pasar por las reglas comprobadas.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Separación por organización en la base»**: «**Qué es una tabla de negocio: toda tabla** de cualquier esquema…».
  - Mismo requisito: «Una comprobación de estructura DEBE recorrer **todas las tablas de negocio**».
  - La comprobación solo verifica `organizacion_id`, activación y forzado de reglas, regla restrictiva y dueño de **tablas**.
  - El mismo requisito permite consultas directas con el pase de la persona y reconoce identidades que omiten las reglas: «las únicas que omiten las reglas son la credencial del sistema y la operación de registro del aviso».
- **Regla que se rompe y fallo observable:** Rompe HU-03.CA-1 a CA-3 y los escenarios «consulta directa a la base» y «la dirección tampoco cruza». Una migración podría crear una vista materializada o una función con dueño que omite las reglas, conceder su consulta a personas y dejar que un usuario de A lea datos de B; la comprobación estructural seguiría pasando porque el objeto no es una tabla cubierta.

### 2. ALTO — El plazo del reporte se redefine para medir una marca temporal, no que el reporte exista y sea consultable

- **Qué está mal:** La especificación admite que la fila se cree sin límite de tiempo, pero declara cumplido el plazo usando un `detectado_en` anterior a la creación efectiva.
- **Evidencia:**
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-07.CA-15**: «el reporte queda **generado y consultable en la aplicación** con un retraso máximo de un intervalo» y «se mide que el reporte exista en el sistema».
  - `Recorte-Entrega-20261119-v4.md`, sección 3: «HU-07.CA-15: **el reporte queda generado dentro del plazo**».
  - `no-reportados/spec.md`, requisito **«Ejecución recurrente»**: «`detectado_en` … queda como máximo un intervalo después».
  - Mismo requisito, límite declarado: «La fila aparece en la base **después de `detectado_en`**» y ese tiempo «el sistema **no acota**».
- **Regla que se rompe y fallo observable:** Rompe HU-07.CA-15. La llamada puede registrar como `detectado_en` las 09:05, tardar varios intervalos en llegar a una organización y crear la fila a las 09:20; entre 09:05 y 09:20 el reporte no existe ni es consultable, aunque el escenario «plazo» lo consideraría cumplido.

### 3. ALTO — La hora del aviso ya no es cuando el sistema recibe el toque, sino cuando consigue un candado

- **Qué está mal:** Se cambia explícitamente el instante aprobado por producto, haciendo que la espera interna altere el día y la clasificación del aviso.
- **Evidencia:**
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-06.CA-2**: el aviso queda con «la hora en que **el sistema recibe el toque**».
  - Mismo archivo, **HU-06.CA-5**: un aviso a las 09:00:00 es puntual.
  - `aviso-inicio/spec.md`, requisito **«Registrar el aviso»**: «“la hora en que el sistema recibe el toque” es el instante en que la operación **ya tiene el candado**».
  - Mismo fragmento: si la espera cruza la medianoche o el margen, «puede responder que la pantalla quedó vieja, o quedar como llegada tardía» y «no se mide ni se corrige».
- **Regla que se rompe y fallo observable:** Rompe HU-06.CA-2 y los bordes de HU-06.CA-5. Un toque recibido por el servidor a las 09:00:00 puede esperar hasta las 09:00:01 y guardarse como tardío; uno recibido el martes a las 23:59:59 puede no registrar el martes porque obtiene el candado el miércoles.

### 4. ALTO — Se acepta enviar datos personales a una dirección de correo que ya no pertenece al supervisor

- **Qué está mal:** El servicio puede cambiar el correo de la cuenta sin actualizar `usuario.correo`, pero esa dirección obsoleta sigue siendo el destino de reportes con nombres, clientes y teléfonos.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Un correo, una cuenta, una organización»**, límite declarado: «el servicio puede permitírselo a la persona con su pase» y «el correo del supervisor quede viejo y su reporte vaya a la dirección anterior».
  - Mismo archivo, **Riesgos aceptados**, D-87: la base no detecta el cambio posterior del correo.
  - `no-reportados/spec.md`, requisito **«Contenido mínimo del correo»**: incluye fecha, nombre, cliente, hora comprometida, minutos de retraso y teléfono.
- **Regla que se rompe y fallo observable:** Rompe el propósito de separación y minimización de datos aunque esté etiquetado como riesgo aceptado. Si la dirección anterior deja de estar bajo control del supervisor o se reasigna, un tercero recibe nombres, clientes, horarios y teléfonos de consultores. El supuesto «los correos no se cambian» no impide que el propio servicio permita hacerlo.

### 5. ALTO — La defensa de sesiones cerradas en consultas directas depende de una capacidad todavía no comprobada

- **Qué está mal:** Se exige que la base consulte el estado vivo de la sesión, pero la especificación admite que no sabe si la base puede hacerlo y mantiene mientras tanto escenarios que presuponen esa capacidad.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Separación por organización en la base»**: la regla debe comprobar que «el servicio la tenga abierta».
  - Mismo requisito: «**Por comprobar al construir HU-03.1:** que la base pueda consultar si la sesión… sigue abierta».
  - Si no puede, «esta especificación se corrige» y las consultas directas pasarán a rechazarse por completo.
  - `HU-01.6-prueba-local-20261118-v1.md`, P2, solo demuestra que se detecta el cierre «**si se consulta al servicio**»; no demuestra que una regla de PostgreSQL pueda efectuar esa consulta.
- **Regla que se rompe y fallo observable:** Rompe el escenario «pase de una sesión cerrada o vencida» y la defensa duplicada de «la base no registra sin usuario activo y sesión vigente». Si la base no puede consultar el servicio, un pase aún no expirado podría seguir leyendo directamente después del cierre; si se aplica el plan alternativo, dejan de ser válidos los escenarios actuales de consulta directa permitida.

### 6. ALTO — La matriz de operaciones usa como inventario el mismo registro que un endpoint inseguro puede omitir

- **Qué está mal:** La prueba solo compara la matriz con las operaciones declaradas en el punto central de autorización, por lo que no puede detectar una operación que se implemente fuera de ese punto.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Matriz de permisos»**: «toda operación se declara allí, y la batería compara **esa lista** con las filas de la matriz».
  - Mismo fragmento: «Una operación que no pase por ese lugar no tiene autorización, y eso ya es un defecto».
  - Escenario **«operación sin fila»**: solo falla cuando «existe una operación del sistema sin fila en la matriz»; no define un inventario independiente de rutas, acciones o manejadores reales.
- **Regla que se rompe y fallo observable:** Rompe «Sin sesión no se ve ni se registra nada» y «Autorización en el código». Un endpoint nuevo puede omitir el punto central y, por ello, no aparecer ni en su lista ni en la matriz: la batería queda verde mientras el endpoint acepta llamadas sin sesión o de un rol incorrecto.

### 7. ALTO — Las pruebas por rol tampoco detectan automáticamente una tabla nueva omitida de la lista manual

- **Qué está mal:** La comprobación automática de tablas nuevas solo exige separación por organización; la cobertura por rol se limita a las tablas ya enumeradas en otro requisito.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Separación por organización en la base»**: la estructura comprueba `organizacion_id` y la regla restrictiva por organización, pero no exige una política concreta por rol.
  - Requisito **«Reglas por rol en la base»**: enumera manualmente ocho tablas.
  - Requisito **«Matriz de permisos»**, escenario «tabla sin sus casos de consulta directa»: se aplica a «una tabla **del requisito “Reglas por rol en la base”**».
  - El texto dice que una tabla nueva con datos de una persona debe agregar su caso, pero no hay una comprobación que descubra que fue omitida de esa lista.
- **Regla que se rompe y fallo observable:** Rompe HU-02.CA-1 a CA-8. Una tabla nueva puede tener `organizacion_id` y una regla que permita a todos los usuarios ver toda su organización; si no se agrega a la lista manual, pasa la comprobación estructural y la matriz, pero un consultor puede leer datos de compañeros de la misma organización.

### 8. MEDIO — La afirmación de que una llamada repetida no duplica nada contradice el reenvío tras perder la confirmación

- **Qué está mal:** La protección de la ejecución promete idempotencia total, mientras la regla de correo exige duplicar un mensaje aceptado cuando no se pudo guardar su marca.
- **Evidencia:**
  - `no-reportados/spec.md`, requisito **«Protección de la ejecución recurrente»**, punto 5: «Una llamada repetida **no duplica nada**, por la unicidad del no reportado y por la marca de notificado».
  - Requisito **«Correo agrupado al supervisor»**, D-82: si el servicio acepta el mensaje pero se pierde la confirmación o el sistema cae antes de marcarlo, «el correo sale otra vez».
  - Escenario **«llamada repetida»** evita la contradicción solo mediante la precondición de que los mensajes ya estén confirmados y marcados.
- **Regla que se rompe y fallo observable:** Se rompe la garantía general del punto 5. Si el proveedor acepta un correo y la confirmación se pierde, repetir la misma llamada envía otro correo; la llamada sí duplica un efecto externo, aunque no duplique filas.

### 9. MEDIO — El alcance de las pruebas de reintento es contradictorio entre el recorte y la especificación

- **Qué está mal:** El recorte difiere las pruebas propias del reintento, pero la especificación las exige en esta entrega.
- **Evidencia:**
  - `Recorte-Entrega-20261119-v4.md`, sección 2, HU-07.7: «lo que no entra son **las pruebas propias del reintento**».
  - `no-reportados/spec.md`, alcance: la regla de reintento entra «**con sus pruebas de regla**».
  - Mismo archivo incluye los escenarios «el servicio de correo rechaza», «aceptado, pero la confirmación se pierde», «el correo que falló sale aunque no haya nada nuevo», «rechazado cerca de la medianoche» y los bordes de 24 horas.
- **Regla que se rompe y fallo observable:** Rompe el recorte D-73 y la definición de terminado de los tickets HU-07.4/HU-07.7. La entrega puede considerarse completa según el recorte sin esas pruebas y, simultáneamente, incompleta según la especificación.

### 10. MEDIO — El objetivo de menos de cinco segundos depende de una espera sin límite demostrado

- **Qué está mal:** El aviso puede esperar un candado durante toda la clasificación de una asignación, pero no existe un máximo que garantice el criterio de cinco segundos.
- **Evidencia:**
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-06.CA-14**: menos de cinco segundos desde abrir la aplicación hasta la confirmación.
  - `aviso-inicio/spec.md`, **«Registrar el aviso»**: el aviso espera a obtener el candado y esa espera «no se mide ni se corrige».
  - La única justificación es que espera «lo que tarda clasificar una asignación», sin establecer cuánto puede tardar.
  - `no-reportados/spec.md`, **«Ejecución recurrente»**: «no se fija un tope de tiempo» para el procesamiento; solo se registran duraciones.
- **Regla que se rompe y fallo observable:** Rompe HU-06.CA-14. Con una consulta lenta, contención o bloqueo interno, el consultor puede superar los cinco segundos antes de recibir confirmación; H-4 puede detectarlo en una observación concreta, pero nada garantiza que no ocurra en las demás ejecuciones.
