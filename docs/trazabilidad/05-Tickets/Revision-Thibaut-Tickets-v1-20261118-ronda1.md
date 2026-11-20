# Revisión adversarial

- Fecha: 2026-11-18 13:30 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-de-trabajo>/05-Tickets/Tickets-MVP-Controlador-de-Tiempo-20261118-v1.md` · huella `eb3c2b5aea01` · 18712 caracteres
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` · huella `84e92c472ace` · 38894 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. CRÍTICO — La separación entre organizaciones deja de estar garantizada cuando se creen las tablas de las historias futuras

- **Qué está mal:** HU-03 se da por aceptada antes de crear todas las tablas de negocio, pero no existe una condición que obligue a aplicar y volver a probar el aislamiento en las futuras tablas de actividad, períodos y trazas.
- **Evidencia:**
  - `Tickets-MVP-Controlador-de-Tiempo-20261118-v1.md`, **HU-03.1**: «Organización en toda tabla de negocio y regla de la base que la filtra para cualquier rol».
  - Mismo archivo, **HU-03.3**: las pruebas de separación se ejecutan ahora, contra lo ya construido.
  - Mismo archivo, sección **7, T-02**: «Las de actividad, período, exportación y traza esperan a sus historias».
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, sección **Validación contra el alcance**: HU-03 se acepta ahora y solo CA-5, CA-6 y CA-7 quedan expresamente trasladados a historias futuras. No se trasladan CA-1 a CA-3 a HU-12–HU-16 o HU-18.
- **Regla que se rompe y fallo observable:** se rompen **HU-03.CA-1, CA-2 y CA-3** y RF-3. Una migración futura podría crear una tabla de registros, períodos o trazas sin organización o sin política de base; HU-03.3 seguiría verde porque ya se ejecutó antes de que esa tabla existiera, y una consulta directa podría leer o modificar datos de otra organización.

---

### 2. ALTO — Los permisos de operaciones aún inexistentes se declaran cubiertos, aunque la matriz solo prueba lo construido hasta ese momento

- **Qué está mal:** HU-02.4 hereda CA-1 a CA-8, pero limita sus pruebas a «lo construido hasta la fecha», cuando varios de esos criterios dependen de historias que todavía no tienen tickets.
- **Evidencia:**
  - `Tickets-MVP-Controlador-de-Tiempo-20261118-v1.md`, **HU-02.4**: «Matriz de pruebas rol por operación [...] sobre lo construido hasta la fecha», heredando **CA 1, 2, 3, 4, 5, 6, 7 y 8**.
  - Mismo archivo, sección **7, T-06 a T-11**: motivo, registro, período, exportación y carga están «Sin tickets todavía».
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`:
    - **HU-02.CA-1 y CA-2** incluyen registros y períodos.
    - **HU-02.CA-4 a CA-6** incluyen motivos, aprobaciones y exportaciones.
    - **HU-02.CA-7** incluye carga, desactivación y parámetros.
    - **HU-02.CA-8** incluye registro de actividad.
  - El total del documento de tickets afirma que solo **cuatro** criterios esperan a historias futuras.
- **Regla que se rompe y fallo observable:** se rompe la aceptación de **HU-02.CA-1 a CA-8** y la afirmación de que solo cuatro criterios están en espera. Las pruebas pueden quedar verdes porque exportar o aprobar todavía no existe; cuando esas operaciones se agreguen, podrían autorizar a un consultor o supervisor incorrecto sin que HU-02.4 vuelva a ejecutarse como condición de aceptación.

---

### 3. ALTO — H-1 no puede cumplir su propia Definition of Done y además forma un ciclo con la verificación de autenticación

- **Qué está mal:** el ticket que produce la especificación exige que esa misma especificación ya esté aprobada antes de comenzar, y la verificación técnica necesaria para escribirla no depende de H-1 ni H-1 depende de ella.
- **Evidencia:**
  - `Tickets-MVP-Controlador-de-Tiempo-20261118-v1.md`, sección **1, Definition of Done — Todos**: «La especificación de la capacidad está escrita y aprobada antes de empezar».
  - Mismo archivo, **H-1**: «Especificación inicial de las capacidades...».
  - H-1 está tipado como **Test**, pero no hereda ningún criterio; el DoD de Test exige que «los escenarios citan el criterio que comprueban».
  - Mismo archivo, tramo **0**: H-1 y HU-01.6 están en el mismo tramo y se declara que dentro de un tramo no dependen entre sí.
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **PA-B10**: la capacidad del proveedor debe comprobarse «antes de escribirlo en la especificación».
  - `Tickets...`, sección **5, HU-01.6**: su resultado puede cambiar HU-01.2 y HU-01.4.
- **Regla que se rompe y fallo observable:** se rompe la regla «spec primero». H-1 no puede empezar sin que H-1 ya haya terminado; si se ignora esa regla, puede aprobarse una especificación de sesiones de 30 días o enlaces de 72 horas antes de saber si el proveedor lo soporta.

---

### 4. ALTO — La ejecución recurrente no tiene un actor compatible con el DoD obligatorio de los endpoints

- **Qué está mal:** HU-07.3 es un Endpoint/API ejecutado por el sistema, pero el DoD exige sesión, organización y rol para todo endpoint y no existe ningún ticket que defina una identidad de servicio o cómo procesa varias organizaciones.
- **Evidencia:**
  - `Tickets-MVP-Controlador-de-Tiempo-20261118-v1.md`, DoD **Endpoint/API**: «Exige sesión y filtra por organización y por rol».
  - Mismo archivo, **HU-07.3**: «Ejecución recurrente protegida: clasifica en cada intervalo...», tipo Endpoint/API.
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-07.CA-1, CA-13 y CA-15**: la ejecución debe procesar asignaciones y parámetros de las organizaciones en cada intervalo.
- **Regla que se rompe y fallo observable:** o el planificador no tiene sesión y el endpoint rechaza todas las ejecuciones, incumpliendo **HU-07.CA-15**, o se introduce una excepción con acceso global que incumple el DoD y puede procesar una organización equivocada. El término «protegida» no resuelve quién autentica ni cuál es su alcance.

---

### 5. ALTO — La entrega real de correo y sus reintentos no tienen una prueba de integración o punta a punta

- **Qué está mal:** toda la capacidad de correo se asigna a un ticket Modelo/Dominio y los escenarios punta a punta excluyen precisamente los criterios de agrupación, destinatario, reintento y contenido.
- **Evidencia:**
  - `Tickets-MVP-Controlador-de-Tiempo-20261118-v1.md`, **HU-07.4**, tipo Modelo/Dominio: hereda CA 2, 5, 6, 7, 8, 10, 12, 17 y 18.
  - Mismo archivo, DoD **Modelo/Dominio**: solo exige regla única y pruebas unitarias con reloj; no exige integración con el proveedor de correo.
  - **HU-07.5**, único ticket punta a punta, hereda solo CA 1, 3, 4, 11, 15 y 20.
  - Sección **5, riesgo de HU-07.4**: «Depende de un servicio de correo externo; el reintento y el “uno solo por ejecución” son fáciles de romper».
- **Regla que se rompe y fallo observable:** pueden pasar todas las pruebas con un doble del proveedor aunque ningún mensaje salga realmente, llegue al destinatario incorrecto o se duplique tras un timeout en el que el proveedor aceptó el correo pero la aplicación no recibió confirmación. Fallarían **HU-07.CA-5, CA-6, CA-8, CA-10 y CA-12**.

---

### 6. ALTO — “Hoy”, “mañana” y “el día de desactivación” se implementan sin una zona horaria definida

- **Qué está mal:** los tickets deben aplicar fechas de vigencia y desactivación, aunque el backlog declara explícitamente que no se define la zona horaria que determina esos cambios de día.
- **Evidencia:**
  - `Tickets-MVP-Controlador-de-Tiempo-20261118-v1.md`, **HU-07.1**: parámetros «con la fecha desde la que rigen».
  - **HU-07.3** hereda **CA-13**.
  - **HU-07.2** hereda **CA-19**.
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-07.CA-13**: un cambio hecho «hoy» rige «desde mañana».
  - **HU-07.CA-19**: la desactivación afecta «desde el día siguiente».
  - Mismo archivo, fuera de HU-07: «la fecha por zona horaria para decidir desde cuándo rige un parámetro» queda fuera.
  - **PA-B9 / D-58**: tampoco se define en qué zona se cuenta «ese día» al desactivar una cuenta; se acepta como riesgo.
- **Regla que se rompe y fallo observable:** CA-13 y CA-19 no tienen un resultado determinista alrededor de medianoche. Un cambio a las 23:30 del cliente pero 00:30 del servidor podría usar el parámetro nuevo un día antes, o reportar a una persona desactivada cuando para su cliente ya es el día siguiente.

---

### 7. MEDIO — La fecha de la consulta no tiene semántica definida cuando los clientes están en zonas horarias distintas

- **Qué está mal:** se consulta «un día» y se muestran horas por zona del cliente, pero no se define en qué zona se interpreta la fecha seleccionada.
- **Evidencia:**
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-10.CA-1 a CA-4**: la consulta se realiza por «esa fecha» o «ese día».
  - **HU-10.CA-9**: las horas se muestran en la zona horaria del cliente de la asignación.
  - `Tickets-MVP-Controlador-de-Tiempo-20261118-v1.md`, **HU-10.2**: «un día a la vez» y horas en la zona del cliente.
  - **H-3** crea deliberadamente «clientes en la misma zona horaria».
  - HU-06 declara posible que una persona tenga asignaciones en clientes de zonas distintas.
- **Regla que se rompe y fallo observable:** un reporte ocurrido cerca de medianoche podría aparecer en el día anterior para un cliente y en el siguiente para otro, sin que esté definido cómo debe filtrarse. H-3 evita que las pruebas detecten omisiones o duplicados en ese borde.

---

### 8. MEDIO — La regla de tamaño de ticket contradice las tallas y excluye trabajo obligatorio del cálculo

- **Qué está mal:** se define que todo ticket cabe en media jornada, pero se conservan tickets L que posiblemente deben partirse y se excluyen de la talla actividades exigidas por el DoD.
- **Evidencia:**
  - `Tickets-MVP-Controlador-de-Tiempo-20261118-v1.md`, sección **1**: «Lo que una persona termina en una sesión, media jornada como máximo».
  - Sección **5**, talla L: «conviene partirlos si al empezarlos no caben en media jornada».
  - Mismo archivo: HU-07.2, HU-07.4 y HU-07.5 ya están identificados como L y contienen entre seis y diez criterios o integración externa y concurrencia.
  - Sección **5, Sesgos declarados**: «Ningún ticket incluye el tiempo de su revisión adversarial ni el de corregir lo que salga».
  - DoD **Todos** exige guardar la revisión adversarial y cerrar cada observación.
- **Regla que se rompe y fallo observable:** la talla deja de representar el trabajo necesario para terminar el ticket según su propio DoD. Los tramos pueden declararse terminados con revisión y correcciones pendientes, o los tickets excederán por definición la media jornada.

---

### 9. MEDIO — HU-10 depende funcionalmente de HU-08, pero esa dependencia no está registrada

- **Qué está mal:** la consulta promete mostrar el motivo anotado, aunque la capacidad para anotar motivos no tiene tickets y HU-10 no depende de ella.
- **Evidencia:**
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-10.CA-1**: cada no reportado aparece «con su motivo si ya se anotó».
  - Mismo archivo, HU-10, «Fuera de esta historia»: «anotar el motivo desde la consulta (HU-08)».
  - `Tickets-MVP-Controlador-de-Tiempo-20261118-v1.md`, **HU-10.1** hereda CA-1, pero depende únicamente de HU-07.2 y HU-02.2.
  - Sección **7, T-06 a T-11**: el motivo no tiene tickets todavía.
- **Regla que se rompe y fallo observable:** HU-10 puede cerrarse antes de que exista el dato del motivo. Cuando HU-08 se construya, no hay ninguna condición que obligue a adaptar y volver a aceptar HU-10.1; el motivo podría guardarse correctamente pero no aparecer en la consulta.

## Sospechas separadas

- **Acceso sin capa de integración explícita:** HU-01 reparte inicio de sesión, recuperación, envío de enlaces y revocación entre Modelo/Dominio y Frontend, sin ticket Endpoint/API o integración con el proveedor. Podría ser válido si la arquitectura usa directamente el SDK del proveedor, pero el material no lo declara.
- **Límites de intentos sin respuesta planificada:** PA-B10 y HU-01.6 solo comprueban qué límites ofrece el proveedor. No aparece un ticket de mitigación para el caso en que esos límites sean inexistentes o insuficientes; esto dejaría expuestos el inicio de sesión y la solicitud de enlaces a abuso o agotamiento.
