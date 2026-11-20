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

### 1. ALTO — Las políticas por rol de varias tablas no tienen pruebas capaces de detectar lecturas o escrituras indebidas dentro de una organización

- **Qué está mal:** Las pruebas cubren la separación entre organizaciones, pero no comprueban las restricciones por rol para `usuario`, `usuario_rol`, `cliente`, `parametro` y `organizacion`, ni la prohibición de escritura directa sobre varias de esas tablas.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Reglas por rol en la base»**: establece permisos específicos para todas esas tablas y declara «Nadie» en la columna `Cambia`.
  - Sus escenarios solo ejercitan directamente `aviso_inicio`, `asignacion` y `no_reportado`: **«un consultor frente a otro»**, **«un supervisor frente a los supervisados de otro»**, **«la dirección ve su organización»**, **«el consultor y el reporte»** y **«ninguna persona escribe un aviso directo en la base»**.
  - `acceso/spec.md`, requisito **«Separación por organización en la base»**, límite declarado: «la comprobación de estructura prueba que la regla existe, no que esté bien escrita».
- **Regla que se rompe y fallo observable:** Una política demasiado amplia podría dejar a un consultor leer los correos y teléfonos de todos los usuarios de su organización, cambiar una asignación o modificar un parámetro. Las pruebas entre organizaciones seguirían pasando porque la fuga ocurre dentro de la misma organización.

### 2. ALTO — Un reintento demorado hasta el día siguiente puede crear un aviso falso para el nuevo día

- **Qué está mal:** Nombrar únicamente la asignación no hace idempotente la petición cuando el reintento cruza la medianoche del cliente.
- **Evidencia:**
  - `aviso-inicio/spec.md`, requisito **«Registrar el aviso»**: «La petición lleva un solo dato: la asignación» y «una petición repetida [...] devuelva el aviso ya hecho».
  - Mismo requisito: si la asignación «es la que toca en ese instante», registra el aviso.
  - `aviso-inicio/spec.md`, tabla `aviso_inicio`: el disparador fija `fecha` según la hora actual de la base en la zona del cliente.
  - Requisito **«Asignación pendiente de aviso»**: se puede avisar desde que empieza el día.
  - La unicidad es `UNIQUE (asignacion_id, fecha)`, por lo que no evita una segunda fila en otra fecha.
- **Regla que se rompe y fallo observable:** Si el aviso de las 23:59 se registra pero la respuesta se pierde y el navegador repite la petición a las 00:01 de un nuevo día laborable, se puede crear automáticamente el aviso del día siguiente. El consultor aparecerá como reportado al inicio de un día en el que no volvió a tocar el botón, contradiciendo la finalidad declarada del reintento y la garantía de no crear otro aviso al repetir.

### 3. ALTO — La hora normativa del aviso es simultáneamente la recepción en el servidor y la inserción en la base

- **Qué está mal:** Dos fragmentos asignan a `recibido_en` instantes distintos que pueden diferir por latencia, cola o desajuste de relojes.
- **Evidencia:**
  - `aviso-inicio/spec.md`, requisito **«Registrar el aviso»**: el aviso se registra «con el instante en que el servidor recibe la petición».
  - Tabla `aviso_inicio`: «un disparador pone al insertar, venga lo que venga, la hora de la base en `recibido_en`».
  - Requisito **«Puntual o llegada tardía»**, escenarios **«en el instante exacto»** y **«un segundo después»**.
- **Regla que se rompe y fallo observable:** Una petición recibida por el servidor a las 09:00:00 pero insertada a las 09:00:01 quedaría con hora de base 09:00:01. Si se clasifica según la recepción sería puntual aunque la fila muestre una hora tardía; si se clasifica según la inserción, incumple que cuenta la recepción del toque y falla el escenario del instante exacto.

### 4. ALTO — El límite de 24 horas contradice la garantía de reintentar el correo pendiente

- **Qué está mal:** Un correo que siga fallando durante más de 24 horas deja de intentarse, aunque otros documentos afirman que todo lo no notificado sale en la ejecución siguiente.
- **Evidencia:**
  - `no-reportados/spec.md`, requisito **«Correo agrupado al supervisor»**: solo incluye no reportados «detectados en las últimas 24 horas» y los que exceden ese plazo «no se envían».
  - Mismo archivo, alcance: «lo que quedó sin notificar sale en la ejecución siguiente».
  - `Recorte-Entrega-20261118-v3.md`, sección 2, HU-07.7: «El correo que no salió entra en el de la ejecución siguiente, porque el correo lleva todo lo que está sin notificar».
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-07.CA-10**: cuando un correo no salió, «corre la siguiente» y «sale en esa».
  - `no-reportados/spec.md`, tabla `no_reportado`: `notificado_en` nulo significa «correo pendiente de salir».
- **Regla que se rompe y fallo observable:** Tras rechazos continuos del proveedor durante más de 24 horas, la siguiente ejecución no enviará el correo. La fila quedará para siempre con `notificado_en` nulo —formalmente “pendiente”— aunque el sistema haya decidido no volver a intentarlo.

### 5. ALTO — La marca `Secure` de la cookie es obligatoria, pero el despliegue solo la documenta y no tiene criterio de fallo

- **Qué está mal:** Ningún escenario exige que la comprobación falle cuando la cookie desplegada carece de la marca de conexión cifrada.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Peticiones que vienen de otro sitio»**: en despliegue la cookie DEBE estar marcada «para que solo viaje por conexión cifrada».
  - Su escenario **«marcas de la cookie»** solo exige que el código de la página no pueda leerla, es decir, cubre `HttpOnly`, no `Secure`.
  - El mismo requisito dice que la marca cifrada «se anota en el despliegue (H-4)».
  - `Recorte-Entrega-20261118-v3.md`, ajuste **H-4**: se repiten pruebas «anotando con qué marcas llega la cookie de sesión», sin establecer que la ausencia de `Secure` repruebe el despliegue.
- **Regla que se rompe y fallo observable:** H-4 puede registrar que la cookie llegó sin `Secure` y aun así finalizar satisfactoriamente. En ese despliegue el navegador podría transmitir la sesión por una conexión no cifrada, incumpliendo el requisito de seguridad.

### 6. ALTO — La comprobación estructural exige una columna que la propia especificación prohíbe en `organizacion`

- **Qué está mal:** La excepción de `organizacion` no aparece en la regla que recorre todas las tablas de negocio.
- **Evidencia:**
  - `acceso/spec.md`, sección **«Datos»**: «Toda tabla lleva `organizacion_id` salvo `organizacion`».
  - Requisito **«Separación por organización en la base»**: la comprobación recorre «todas las tablas de negocio» y falla si alguna «no tiene `organizacion_id`».
  - El requisito **«Reglas por rol en la base»** incluye explícitamente `organizacion` en la matriz de tablas protegidas.
- **Regla que se rompe y fallo observable:** Si `organizacion` cuenta como tabla de negocio, la migración válida debe fallar siempre nombrándola. Si se la excluye silenciosamente, la comprobación ya no recorre todas las tablas indicadas y esa excepción queda fuera de la regla declarada.

### 7. MEDIO — Los parámetros iniciales obligatorios no están cubiertos por una restricción ni por un escenario

- **Qué está mal:** Se afirma que toda organización nace con margen 60 e intervalo 5, pero el modelo permite crear una organización sin ninguna fila de parámetros.
- **Evidencia:**
  - `no-reportados/spec.md`, sección **«Datos»**: «Toda organización tiene desde su creación un margen de 60 y un intervalo de 5».
  - La tabla `parametro` solo declara FK, checks y `UNIQUE (organizacion_id, clave, vigente_desde)`; ninguna de esas restricciones obliga a que existan ambas filas.
  - Los escenarios de **«Parámetro vigente»** parten siempre de organizaciones que ya tienen valores; no hay escenario de creación ni de parámetro ausente.
- **Regla que se rompe y fallo observable:** Una organización creada o cargada sin `margen_minutos` o `intervalo_minutos` no puede clasificarse ni programarse. Su procesamiento fallará y el plazo de **«Ejecución recurrente»** dejará de cumplirse sin que una prueba de migración detecte el estado inválido.

### 8. MEDIO — La entrega redefine incorrectamente HU-07.CA-15 como “generado”, omitiendo que exige ser consultable

- **Qué está mal:** La especificación afirma que generar el reporte es lo que mide el criterio, pero el criterio original exige además que sea consultable en la aplicación.
- **Evidencia:**
  - `no-reportados/spec.md`, alcance: «que el reporte quede generado en el sistema dentro del plazo, que es lo que el criterio dice que se mide».
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-07.CA-15**: «el reporte queda generado y consultable en la aplicación».
  - `Recorte-Entrega-20261118-v3.md`, criterios sin comprobar: HU-07.CA-15 entra solo en parte y consultar espera a HU-10.
- **Regla que se rompe y fallo observable:** La entrega puede declarar cumplido el plazo porque existe una fila en la base, aunque ningún supervisor pueda consultarla en la aplicación y el correo todavía no haya salido. Eso no satisface HU-07.CA-15 completo, pese a que la especificación lo presenta como si la generación fuera toda la medición.

### 9. MEDIO — La regla de cambio de hora puede convertir un horario válido en un intervalo de duración cero

- **Qué está mal:** Resolver por separado cada hora inexistente al primer instante posterior puede hacer que inicio y fin terminen siendo el mismo instante.
- **Evidencia:**
  - `aviso-inicio/spec.md`, vocabulario **«Cambio de hora»**: si una hora no existe, se toma «el primer instante válido posterior» tanto para inicio como para fin.
  - Tabla `asignacion`: solo comprueba que `hora_fin` sea posterior a `hora_inicio` como horas locales.
  - Escenario **«la hora de inicio no existe ese día»** solo prueba el inicio, no la relación resultante entre inicio y fin.
- **Regla que se rompe y fallo observable:** En un salto de 02:00 a 03:00, una asignación de 02:30 a 02:45 supera el `CHECK`, pero ambos valores se convierten en 03:00. La asignación queda pendiente únicamente en ese instante y deja de estarlo un segundo después, aunque el modelo declaraba una hora de fin posterior a la de inicio.
