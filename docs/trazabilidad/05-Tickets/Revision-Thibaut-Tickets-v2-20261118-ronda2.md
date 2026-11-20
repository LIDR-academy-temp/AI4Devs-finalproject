# Revisión adversarial

- Fecha: 2026-11-18 14:05 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-de-trabajo>/05-Tickets/Tickets-MVP-Controlador-de-Tiempo-20261118-v2.md` · huella `c3ea741ccee7` · 30116 caracteres
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` · huella `84e92c472ace` · 38894 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. ALTO — Las migraciones se programan como terminadas antes de que exista la prueba de separación que su Definition of Done exige

- **Qué está mal:** La planificación introduce tablas de negocio en los tramos 2 a 4, pero la prueba obligatoria de separación `HU-03.3` no se construye hasta el tramo 5.
- **Evidencia:**
  - `Tickets-MVP-Controlador-de-Tiempo-20261118-v2.md`, sección 1, Definition of Done de Migración/DB: «**toda tabla de negocio nace con su organización y con la regla de la base que la filtra, y en el mismo ticket entra a las pruebas de separación (HU-03.3)**».
  - Sección 5: `HU-01.1` y `HU-03.1` están en el tramo 2; `HU-02.1` y `HU-06.1`, en el 3; `HU-07.1`, en el 4; `HU-03.3`, en el 5.
  - `HU-03.3` depende de `H-3`, que a su vez depende de varias de esas migraciones.
- **Regla o escenario que se rompe:** Se rompe la Definition of Done de Migración/DB y la garantía de `HU-03.CA-1` a `CA-3`. O bien esas migraciones no pueden declararse terminadas en sus tramos, o se aceptan tablas antes de tener la prueba que detecta una RLS ausente; el fallo visible sería que una consulta directa pudiera leer datos de otra organización hasta el tramo 5.

### 2. ALTO — El modelo de datos habla de un único rol por usuario, contra la decisión explícita de permitir más de uno

- **Qué está mal:** El ticket que define los roles en la base usa un rol singular y no hereda el criterio multirrol, aunque el backlog decidió expresamente que una persona puede tener más de un rol.
- **Evidencia:**
  - `Tickets...v2.md`, `HU-02.1`: «**Rol de cada usuario** y reglas de acceso por rol en la base»; hereda `CA 1, 2, 4, 5, 6, 7`, pero no `CA-10`.
  - `Backlog...v5.md`, `PA-B3`: «**¿Una persona tiene un solo rol? → Cerrado por D-56: puede tener más de uno**».
  - `Backlog...v5.md`, `HU-02.CA-10`: un supervisor o dirección con asignación propia actúa como consultor sobre lo suyo.
- **Regla o escenario que se rompe:** Se rompe `HU-02.CA-10`. Una dirección o supervisor con asignación propia podría quedar bloqueado por las reglas de base al intentar registrar su aviso, o recibir una unión incorrecta de privilegios que le permita actuar sobre avisos ajenos.

### 3. ALTO — HU-01.CA-8 se declara completo sin existir la capacidad que crea la cuenta y debe disparar el correo

- **Qué está mal:** Se afirma que los doce criterios de HU-01 quedan completos, pero no existe ningún ticket de HU-05 que conecte la carga de una cuenta con la emisión del enlace inicial.
- **Evidencia:**
  - `Backlog...v5.md`, `HU-01.CA-8`: «**DADO que la dirección cargó mi cuenta, CUANDO queda creada, ENTONCES recibo en mi correo un enlace**».
  - En “Fuera de esta historia”: «la carga inicial [...] fuera de la aplicación».
  - `Tickets...v2.md`, `HU-01.4`: solo cubre «Enlace de contraseña: emisión para cuenta nueva y para recuperación».
  - Sección 4: HU-01 aparece con `12 completos, 0 en parte, 0 en espera`.
  - Secciones 2 y 9: `H-3` solo aporta semillas y `HU-05` no tiene tickets.
- **Regla o escenario que se rompe:** Se rompe la definición de criterio “completo”. Puede existir una función aislada que genere enlaces, pero no está probado el escenario desde la carga de la cuenta hasta la recepción del correo; una cuenta cargada podría quedar sin enlace y la persona no podría entrar.

### 4. ALTO — Las duraciones se implementan como valores fijos aunque los criterios exigen parámetros

- **Qué está mal:** Los tickets de sesión y enlace solo nombran 30 días y 72 horas; ninguno implementa explícitamente que sean parámetros, mientras la historia que permite cambiarlos no tiene tickets.
- **Evidencia:**
  - `Backlog...v5.md`, `HU-01.CA-6`: «La sesión dura 30 días; **el valor es un parámetro**».
  - `HU-01.CA-9`: «El plazo es de 72 horas y **es un parámetro**».
  - `HU-11`: margen, intervalo, duración de sesión y enlace «son parámetros que se cambian por script».
  - `Tickets...v2.md`, `HU-01.2`: «vigencia de 30 días»; `HU-01.4`: «caducidad de 72 horas», sin parametrización declarada.
  - `HU-01.6` únicamente comprueba qué admite el proveedor; no construye el parámetro.
  - Sección 3: las doce historias pendientes, incluida HU-11, no tienen tickets; sección 4 declara HU-01 completamente cubierta.
- **Regla o escenario que se rompe:** Se rompen `HU-01.CA-6`, `HU-01.CA-9` y la cobertura declarada. El sistema podría quedar con constantes fijas y HU-11 tendría que rehacer el acceso en vez de limitarse a cambiar parámetros.

### 5. ALTO — Se decide una regla de fecha para varias zonas horarias, pero se reconoce expresamente que ninguna prueba la cubre

- **Qué está mal:** H-1 debe fijar cómo se interpreta una fecha con clientes en zonas distintas, pero los únicos datos de arranque excluyen ese caso y no hay otro escenario que lo pruebe.
- **Evidencia:**
  - `Tickets...v2.md`, límite de `H-3`: «Todos los clientes [...] están en la misma zona horaria. **Las pruebas no ven [...] lo que pasa cerca de la medianoche con clientes en zonas distintas**».
  - Sección 8, `E-2`: «Con qué fecha se interpreta “el día” de la consulta cuando los clientes están en zonas distintas».
  - `HU-10.1` y `HU-10.2` no dependen de ningún ticket de prueba específico para ese borde.
  - Sección 4 declara ocho criterios de HU-10 completos y solo `CA-1` parcial por el motivo.
- **Regla o escenario que se rompe:** Se rompe la pretensión de cobertura completa de `HU-10.CA-1` a `CA-4`. Cerca de medianoche, un no reportado puede aparecer en el día equivocado, omitirse de la consulta o contarse en dos fechas sin que la integración continua lo detecte.

### 6. MEDIO — Sigue sin existir una regla comprobable para elegir la primera asignación cuando sus clientes están en días distintos

- **Qué está mal:** `HU-06.2` debe decidir “cuál toca”, pero el backlog deja expresamente indefinido el caso de dos asignaciones en zonas horarias distintas y la sección 8 ni siquiera lo incluye entre los puntos de H-1.
- **Evidencia:**
  - `Backlog...v5.md`, fuera de `HU-06`: «cuál es “la primera del día” cuando esos días no coinciden **no se define: es riesgo aceptado (D-58)**».
  - `HU-06.CA-9`: el botón corresponde a «la primera del día».
  - `Tickets...v2.md`, `HU-06.2`: «Regla de la asignación pendiente de aviso: **cuál toca**».
  - El límite de `H-3` excluye clientes en zonas distintas.
  - La sección 8 contiene `E-1` y `E-2`, pero no este caso de selección de asignación.
- **Regla o escenario que se rompe:** `HU-06.CA-9` no tiene un resultado determinista para ese borde. Una persona podría ver el botón del cliente incorrecto o no verlo, y registrar el aviso contra otra asignación.

### 7. MEDIO — La comprobación manual del correo real está exigida, pero no hay ningún ticket que la ejecute

- **Qué está mal:** El documento traslada la entrega real a una validación durante el despliegue, aunque el despliegue no forma parte de los 30 tickets.
- **Evidencia:**
  - `Tickets...v2.md`, límite de `HU-07.8`: «La entrega real **se comprueba a mano en el despliegue**, con un correo de ejemplo, y queda anotada con su fecha».
  - Sección 9: `T-06 a T-11`, incluido despliegue, aparecen como «**Sin tickets todavía**».
  - Sección 5, tramo 9: «El correo probado de punta a punta».
- **Regla o escenario que se rompe:** La comprobación manual prometida puede no ejecutarse ni dejar evidencia. `HU-07.8` podría pasar capturando el mensaje antes del proveedor mientras la configuración real de correo rechaza destinatarios o no entrega nada.

### 8. MEDIO — El criterio de menos de cinco segundos se declara completo sin un escenario de observación asignado

- **Qué está mal:** El backlog exige una prueba manual con usuarios, pero ningún ticket describe realizarla o conservar su resultado.
- **Evidencia:**
  - `Backlog...v5.md`, `HU-06.CA-14`: «pasan menos de 5 segundos [...] **Se comprueba por observación con usuarios, no por medición automática**».
  - `Tickets...v2.md`, `HU-06.4` hereda `CA 14`, pero su título solo enumera pantalla, botón, confirmación, motivo y reintento.
  - No hay ticket de prueba o despliegue dedicado a la observación.
  - Sección 4 declara los 15 criterios de HU-06 completos.
- **Regla o escenario que se rompe:** Se rompe la definición de “completo”. La interfaz puede funcionar y aun exigir pasos, carga o reautenticación que superen los cinco segundos sin que ninguna prueba del plan falle.

### 9. MEDIO — La protección contra enumeración solo iguala el texto y deja sin cubrir el canal temporal

- **Qué está mal:** Las respuestas visibles son iguales, pero nada exige que una cuenta existente y una inexistente respondan con comportamiento temporal indistinguible.
- **Evidencia:**
  - `Backlog...v5.md`, `HU-01.CA-10`: la pantalla responde igual, pero «si la cuenta no existe o está desactivada, **no se envía ningún correo**».
  - `Tickets...v2.md`, `HU-01.5`: «con la misma respuesta exista o no la cuenta».
  - No hay criterio ni escenario sobre latencia, trabajo en segundo plano o respuesta uniforme.
- **Regla o escenario que se rompe:** Se debilita el objetivo de `HU-01.CA-3` y `CA-10` de no revelar correos registrados. Si el caso existente espera la generación o entrega al proveedor y el inexistente termina inmediatamente, un atacante puede enumerar cuentas midiendo tiempos aunque el mensaje sea idéntico.

### 10. MEDIO — El documento afirma que los tickets no diseñan, pero ya impone un secreto como mecanismo de autenticación

- **Qué está mal:** Se reserva a la especificación la decisión de cómo proteger la ejecución recurrente, pero la Definition of Done ya obliga a utilizar un secreto propio.
- **Evidencia:**
  - `Tickets...v2.md`, introducción: un ticket «**no diseña** [...] Eso se decide en la especificación y al construir».
  - Excepción de `HU-07.3`: «**Se protege con un secreto propio**».
  - Sección 8, `E-6`: «Cómo se protege la ejecución recurrente [...] **el cómo es de la especificación**».
- **Regla o escenario que se rompe:** H-1 no puede decidir libremente el mecanismo. Si concluye que debe usarse identidad del ejecutor, una cola privada u otro control, contradice la excepción; si conserva el secreto solo para ajustarse al ticket, la decisión de seguridad ya no salió de la especificación.

### 11. MEDIO — Los totales y la secuencia se presentan como cerrados aunque el propio documento anticipa tickets nuevos

- **Qué está mal:** Se afirman 30 tickets y diez tramos, pero una decisión aún pendiente puede crear al menos otro ticket y alterar dependencias y tallas.
- **Evidencia:**
  - `Tickets...v2.md`, encabezado: «**30 tickets en total**».
  - Sección 5: diez tramos y suma exacta de 30.
  - Sección 8, `E-3`: «Si la especificación decide una capa propia, **nace un ticket nuevo**».
  - `HU-01.6` también puede obligar a cambiar H-1, HU-01.2 y HU-01.4.
- **Regla o escenario que se rompe:** La suma, las tallas y el orden dejan de ser válidos después de H-1. Si el tablero se crea con estos totales antes de esa decisión, la capa de acceso puede quedar fuera del plan o insertarse sin revisar el camino crítico.

### 12. MEDIO — HU-01.6 contradice la regla usada para justificar una talla S

- **Qué está mal:** Se clasifica como S un ticket cuyo objeto es comprobar múltiples capacidades de un servicio externo, pese a que la definición de S excluye dependencias de terceros.
- **Evidencia:**
  - `Tickets...v2.md`, sección 6: S se basa en «Una capa, una regla, **sin dependencia [...] de un tercero**».
  - `HU-01.6`, talla S: comprueba sesión de 30 días, enlace de 72 horas, cierre de sesiones, variación por organización y dos límites de abuso del servicio de autenticación.
  - Tabla de riesgos: `HU-01.6` tiene riesgo **Alto** porque «No se ha comprobado qué admite el servicio de autenticación».
- **Regla o escenario que se rompe:** Se rompe el criterio interno de estimación. Si la documentación, configuración o pruebas del proveedor requieren más de media jornada, se retrasa H-1 y, por dependencia, todo el camino crítico.

## Sospecha adicional

- El «secreto propio» de `HU-07.3` no tiene reglas declaradas de rotación, caducidad, alcance, almacenamiento ni límite de invocaciones. El material no permite afirmar que sea explotable, pero, si se filtra, podría permitir disparar ejecuciones repetidas para todas las organizaciones y agotar recursos. La sección 8 deja el diseño para H-1, por lo que todavía no hay evidencia suficiente para elevarlo a hallazgo independiente.
