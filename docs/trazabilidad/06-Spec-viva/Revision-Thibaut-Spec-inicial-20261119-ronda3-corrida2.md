# Revisión adversarial

- Fecha: 2026-11-19 09:18 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<repositorio>/openspec/specs/acceso/spec.md` · huella `debb22188f46` · 21533 caracteres
- Archivo: `<repositorio>/openspec/specs/aviso-inicio/spec.md` · huella `b6d24c256683` · 15204 caracteres
- Archivo: `<repositorio>/openspec/specs/no-reportados/spec.md` · huella `c4d5ffd7f824` · 21355 caracteres
- Archivo: `<espacio-de-trabajo>/05-Tickets/Recorte-Entrega-20261118-v3.md` · huella `1a21d65ea034` · 7395 caracteres
- Archivo: `<espacio-de-trabajo>/06-Spec-viva/HU-01.6-prueba-local-20261118-v1.md` · huella `300e2df41965` · 4913 caracteres
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` · huella `84e92c472ace` · 38894 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. CRÍTICO — La vía privilegiada que arma correos no tiene una prueba de aislamiento entre organizaciones

- **Qué está mal:** la única operación que omite las reglas de base lee datos personales de todas las organizaciones, pero ningún escenario comprueba que no mezcle organizaciones al generar correos.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Separación por organización en la base»**: «La única identidad que omite las reglas es la credencial del sistema».
  - `no-reportados/spec.md`, **«Protección de la ejecución recurrente»**, punto 4: «Para armar el correo el sistema lee datos de personas».
  - `no-reportados/spec.md`, escenario **«solo los suyos»**: usa «dos supervisores de la misma organización»; no cubre dos organizaciones.
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-03.CA-4**: el correo debe traer solo personas y clientes de la organización receptora.
- **Regla que se rompe y fallo observable:** se rompe HU-03.CA-4 y la separación por organización. Un error de filtro o de unión ejecutado con la credencial privilegiada podría enviar a un supervisor nombres, clientes, horarios y teléfonos de otra organización sin que ninguno de los escenarios actuales falle.

### 2. ALTO — La hora contractual del aviso contradice la hora que realmente persiste la base

- **Qué está mal:** se exige usar el instante en que el servidor recibe la petición, pero el disparador guarda el instante posterior en que ocurre la inserción en la base.
- **Evidencia:**
  - `aviso-inicio/spec.md`, requisito **«Registrar el aviso»**: «con el instante en que el servidor recibe la petición».
  - Mismo archivo, tabla `aviso_inicio`: «un disparador pone al insertar [...] la hora de la base en `recibido_en`».
  - Escenarios **«en el instante exacto»** y **«un segundo después»** de **«Puntual o llegada tardía»**.
- **Regla que se rompe y fallo observable:** un aviso recibido a las `09:00:00` puede insertarse a las `09:00:01` por latencia y quedar como llegada tardía, aunque HU-06.CA-5 exige que sea puntual. También puede guardar una hora distinta de la confirmación contractual.

### 3. ALTO — El reintento no es idempotente si cruza la medianoche del cliente

- **Qué está mal:** la petición solo identifica la asignación y no conserva el día al que correspondía, por lo que un reintento puede crear el aviso del día siguiente.
- **Evidencia:**
  - `aviso-inicio/spec.md`, **«Registrar el aviso»**: «La petición lleva un solo dato: la asignación que la pantalla le ofreció».
  - Mismo requisito: el identificador sirve para que «una petición repetida [...] devuelva el aviso ya hecho».
  - Tabla `aviso_inicio`: el disparador fija `fecha` usando el día local existente al momento de insertar.
  - Escenario **«reintento con dos asignaciones»** no contempla cambio de fecha.
- **Regla que se rompe y fallo observable:** si el aviso del martes se registró a las 23:59 pero se perdió la respuesta, un reintento a las 00:01 del miércoles no encuentra “el aviso de hoy” del martes. Si el miércoles es laborable, puede crear un segundo aviso para el miércoles y devolverlo en vez del original.

### 4. ALTO — El despliegue puede aprobar una cookie sin la marca `Secure`

- **Qué está mal:** `Secure` es obligatorio en producción, pero el único escenario de aceptación comprueba solo que el código de la página no pueda leer la cookie y H-4 únicamente indica que se anoten sus marcas.
- **Evidencia:**
  - `acceso/spec.md`, **«Peticiones que vienen de otro sitio»**: la cookie «DEBE» viajar solo por conexión cifrada en el sistema desplegado.
  - Escenario **«marcas de la cookie»**: solo exige que «el código de la página no la lea», es decir, `HttpOnly`.
  - `Recorte-Entrega-20261118-v3.md`, ajuste **H-4**: «anotando con qué marcas llega la cookie de sesión».
- **Regla que se rompe y fallo observable:** una cookie sin `Secure` podría quedar registrada como observación y no hacer fallar H-4. El navegador podría enviarla por una conexión HTTP accidental, exponiendo la sesión.

### 5. ALTO — La protección contra peticiones cruzadas no cubre expresamente el inicio de sesión

- **Qué está mal:** la comprobación de origen se limita a operaciones que cambian datos y no se exige `SameSite` ni un control equivalente para la operación que cambia la identidad autenticada del navegador.
- **Evidencia:**
  - `acceso/spec.md`, **«Peticiones que vienen de otro sitio»**: «rechazar toda operación que cambie datos».
  - Mismo requisito: las únicas marcas exigidas son impedir lectura desde la página y usar conexión cifrada.
  - `acceso/spec.md`, **«Sin sesión no se ve ni se registra nada»**: la pantalla de entrada es accesible sin sesión.
- **Regla que se rompe y fallo observable:** si el endpoint de entrada admite un formulario iniciado desde otro sitio, un atacante puede forzar al navegador de la víctima a entrar con la cuenta del atacante. La víctima puede registrar información creyendo usar su propia cuenta y el atacante verla después. `HttpOnly` y `Secure` no impiden este ataque de login CSRF.

### 6. ALTO — No se garantiza que `supervisor_id` corresponda a alguien autorizado como supervisor

- **Qué está mal:** la asignación acepta cualquier usuario de la organización como supervisor, aunque no tenga el rol `supervisor`.
- **Evidencia:**
  - `aviso-inicio/spec.md`, tabla `asignacion`: para `supervisor_id` solo se exige FK a `usuario` y que sea distinto de `consultor_id`.
  - `acceso/spec.md`, tabla `usuario_rol`: el rol se almacena separadamente.
  - `no-reportados/spec.md`, **«Correo agrupado al supervisor»**: el sistema envía el correo al supervisor de la asignación; solo se menciona comprobar que esté activo.
  - No hay escenario que intente asignar como supervisor a un usuario sin ese rol.
- **Regla que se rompe y fallo observable:** con datos de arranque inconsistentes, un usuario con solo rol `consultor` puede recibir nombres, teléfonos y clientes de otra persona. Si el código sí exige el rol, el no reportado queda sin destinatario aunque exista un `supervisor_id`; cualquiera de los dos resultados contradice las reglas declaradas.

### 7. ALTO — La entrega difiere criterios que las especificaciones siguen presentando como comportamiento exigido

- **Qué está mal:** el plan declara fuera de comprobación el aviso posterior y la concurrencia aviso–clasificación, mientras las especificaciones y el backlog mantienen escenarios obligatorios sobre ambos.
- **Evidencia:**
  - `Recorte-Entrega-20261118-v3.md`, tabla **«Lo que se difiere»**, HU-07.6: «aviso posterior, concurrencia».
  - Mismo archivo, ajuste **HU-07.5**: «Deja fuera los escenarios de aviso posterior y de concurrencia».
  - `aviso-inicio/spec.md`, requisito **«El aviso después de haber sido reportado»**, con dos escenarios.
  - `no-reportados/spec.md`, riesgo **«Aviso que llega junto con la ejecución»**: «no está probado que el resultado sea uno de los dos que el criterio admite».
  - Backlog, **HU-07.CA-20**: nunca deben quedar «las dos cosas a medias ni ninguna».
- **Regla que se rompe y fallo observable:** la entrega puede terminar sin demostrar HU-07.CA-20 ni los escenarios de aviso posterior. Una carrera podría dejar un estado no admitido y aun así todos los tickets incluidos aparecer como terminados.

### 8. ALTO — La comprobación estructural se contradice con la excepción de la tabla `organizacion`

- **Qué está mal:** los datos declaran una tabla sin `organizacion_id`, pero la comprobación dice que falla ante cualquier tabla de negocio que no tenga esa columna y no documenta la excepción.
- **Evidencia:**
  - `acceso/spec.md`, sección **«Datos»**: «Toda tabla lleva `organizacion_id` salvo `organizacion`».
  - Mismo archivo, **«Separación por organización en la base»**: la comprobación recorre «todas las tablas de negocio» y falla si alguna «no tiene `organizacion_id`».
  - La tabla `organizacion` aparece también en la matriz de **«Reglas por rol en la base»**, por lo que forma parte del modelo de negocio.
- **Regla que se rompe y fallo observable:** o la integración continua falla siempre al encontrar `organizacion`, o el comprobador introduce una exclusión no especificada y deja de cumplir literalmente que recorre todas las tablas de negocio.

### 9. MEDIO — La existencia de los parámetros iniciales se afirma, pero no se garantiza ni se prueba

- **Qué está mal:** la clasificación presupone que siempre existe un margen y un intervalo vigentes, pero el esquema permite una organización sin ninguna fila de `parametro`.
- **Evidencia:**
  - `no-reportados/spec.md`, sección **«Datos»**: «Toda organización tiene desde su creación un margen de 60 y un intervalo de 5».
  - Tabla `parametro`: solo contiene FK, checks y unicidad; ninguna restricción obliga a que existan las dos claves.
  - Requisito **«Parámetro vigente»**: define cómo elegir la fila más reciente, pero no qué ocurre si no existe ninguna.
- **Regla que se rompe y fallo observable:** una organización creada o cargada parcialmente no tiene valor seleccionable. La ejecución puede fallar, omitirla o usar un valor implícito distinto, rompiendo tanto la clasificación como el plazo máximo.

### 10. MEDIO — La excepción de entrada no incluye de forma inequívoca la operación que crea la sesión

- **Qué está mal:** se prohíbe toda operación usada por una persona sin sesión y se enumeran exactamente dos excepciones, pero solo se exceptúa la pantalla de entrada, no la operación de autenticación.
- **Evidencia:**
  - `acceso/spec.md`, **«Sin sesión no se ve ni se registra nada»**: «toda operación que use una persona» exige sesión.
  - Mismo requisito: «Hay dos excepciones y no hay más»: la pantalla de entrada y la ejecución recurrente.
  - `acceso/spec.md`, escenario **«credenciales correctas y cuenta activa»**: una persona sin sesión debe poder enviar credenciales y crear una.
- **Regla que se rompe y fallo observable:** aplicada literalmente, la operación de entrada debe rechazarse por no existir sesión previa; si se permite, aparece una tercera excepción que contradice «no hay más».

### 11. MEDIO — `dias_laborables` admite calendarios vacíos o duplicados sin tratamiento definido

- **Qué está mal:** solo se restringe el rango de cada elemento, pero no se exige que el arreglo tenga al menos un día ni que sus días sean únicos.
- **Evidencia:**
  - `aviso-inicio/spec.md`, tabla `asignacion`: `dias_laborables smallint[]`, con valores de 1 a 7 y valor por defecto de lunes a viernes.
  - Requisitos **«Asignación pendiente de aviso»** y **«Clasificación de no reportados»** dependen de que el día pertenezca a ese arreglo.
  - No existe escenario para arreglo vacío o con valores repetidos.
- **Regla que se rompe y fallo observable:** una asignación con `{}` nunca ofrece botón ni genera no reportados durante toda su vigencia; el sistema la trata como válida aunque operativamente no tenga ningún día de trabajo. Los duplicados introducen además una representación no canónica que ninguna regla contempla.
