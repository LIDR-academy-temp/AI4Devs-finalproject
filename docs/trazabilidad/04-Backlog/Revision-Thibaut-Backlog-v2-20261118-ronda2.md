# Revisión adversarial

- Fecha: 2026-11-18 12:33 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v2.md` · huella `117de4f1990c` · 27915 caracteres
- Archivo: `<espacio-de-trabajo>/03-PRD/PRD-MVP-Controlador-de-Tiempo-20261118-v4.md` · huella `0af65026d2ed` · 26892 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

Se encontraron 12 defectos verificables. No califico ninguno como **CRÍTICO** porque los archivos no incluyen una implementación que demuestre una explotación o pérdida de datos ya efectiva, pero sí hay varias brechas de diseño de severidad alta.

## Hallazgos

### 1. ALTO — El modelo de roles está sin decidir, aunque los permisos ya se presentan como criterios aceptables

**Qué está mal:** No se ha decidido si una persona puede tener varios roles, pero los requisitos suponen simultáneamente que supervisores y dirección pueden tener asignaciones propias.

**Evidencia:**

- `PRD-MVP-Controlador-de-Tiempo-20261118-v4.md`, **RF-2**:  
  > “Hay tres roles… El consultor… El supervisor… La dirección…”
- Mismo archivo, **RF-24**:  
  > “sus asignaciones como consultor terminan ese día. Si era supervisor…”
- Mismo archivo, **RF-19**:  
  > “Nadie aprueba su propio período.”
- `Backlog-MVP-Controlador-de-Tiempo-20261118-v2.md`, **HU-02.CA-4**:  
  > “Si además tengo un período propio, no puedo aprobarlo yo.”
- Mismo archivo, **HU-02.CA-6**:  
  > “salvo aprobar un período que sea mío.”
- Mismo archivo, **PA-B3**:  
  > “¿Una persona tiene un solo rol?”

**Regla que se rompe y fallo observable:** Se rompe RF-2, porque no se puede determinar qué permisos tiene un supervisor o una persona de dirección sobre su propia asignación. Si conserva solo el rol supervisor, no podría avisar, registrar actividad ni enviar su período; si acumula el rol consultor, falta definir la composición de permisos, qué interfaz ve y quién lo supervisa.

---

### 2. ALTO — Una cuenta de supervisor desactivada puede seguir recibiendo datos personales por correo

**Qué está mal:** Se redirigen los reportes a dirección, pero ninguna regla excluye al supervisor desactivado de los correos de ejecución ni del resumen final.

**Evidencia:**

- `PRD...v4.md`, **RF-10**:  
  > “cada supervisor recibe un solo correo…”  
  > “cada supervisor recibe solo el [resumen] de sus supervisados”
- Mismo archivo, **RF-24**:  
  > “Si era supervisor, la dirección recibe sus reportes… hasta que se cargue otro supervisor.”
- `Backlog...v2.md`, **HU-07.CA-12**:  
  > “el reporte lo recibe la dirección hasta que se cargue otro supervisor.”
- Mismo archivo, **HU-07.CA-17**: el correo incluye nombre, cliente, hora y teléfono.
- Ninguno de esos fragmentos dice que el correo del supervisor desactivado deja de ser destinatario.

**Regla que se rompe y fallo observable:** Se rompe la revocación efectiva de RF-24 y la separación de permisos de RF-2. Como la asignación sigue asociada al supervisor hasta cargar otro, el proceso puede enviar simultáneamente el correo a dirección y al buzón de la persona desactivada, aun cuando esta ya no pueda iniciar sesión.

---

### 3. ALTO — La carga inicial contradice la autenticación obligatoria y falsea la identidad del actor en la traza

**Qué está mal:** Una persona instaladora usa una operación privilegiada sin cuenta activa, pero la auditoría registra al actor como “sistema” en vez de identificar a quien ejecutó la carga.

**Evidencia:**

- `PRD...v4.md`, **RF-1**:  
  > “Solo una persona con cuenta activa y sesión iniciada puede usar el sistema.”
- Mismo archivo, **RF-25**:  
  > “La carga inicial… la ejecuta quien instala el sistema, fuera de la aplicación, y queda trazada con actor «sistema».”
- Mismo archivo, **RF-23**:  
  > “Queda registro de quién… cargó datos…”
- `Backlog...v2.md`, **HU-18**:  
  > “que quede registro de quién hizo cada cosa y cuándo”

**Regla que se rompe y fallo observable:** Se rompen RF-1, RF-23 y la promesa de HU-18. Ante una organización creada con datos o una cuenta de dirección incorrectos, la traza atribuirá la operación al sistema y no permitirá determinar qué instalador la ejecutó. Tampoco se especifica qué autenticación o frontera entre organizaciones protege esa vía externa.

---

### 4. ALTO — Varias historias declaradas próximas a construirse no pueden probarse de manera independiente

**Qué está mal:** Los criterios de las historias detalladas dependen de capacidades que están solo listadas y que, según el propio backlog, todavía no pasan a tickets.

**Evidencia:**

- `Backlog...v2.md`, **Validación contra el alcance**:  
  > “cada historia es lo bastante pequeña para probarse sola.”
- Mismo archivo, sección 4:  
  > “Se detallan cinco… las tres de acceso… y las dos primeras de presencia”
- **HU-03.CA-5** exige exportar, pero la exportación pertenece a **HU-17**, solo listada.
- **HU-03.CA-6** exige una carga, pero esta pertenece a **HU-05**, solo listada.
- **HU-03.CA-7** exige cambiar parámetros, pero esto pertenece a **HU-11**, solo listada.
- **HU-07.CA-10** y **HU-07.CA-15** exigen que el reporte sea consultable en la aplicación.
- “Fuera de esta historia” de HU-07 asigna explícitamente  
  > “consultar el reporte por fecha en la aplicación”  
  a **HU-10**, solo listada.
- Sección 6 indica que el siguiente paso crea tickets únicamente para las cinco historias detalladas.

**Regla que se rompe y fallo observable:** Se rompe la afirmación de independencia de las historias y el orden E1 → E2. HU-03 y HU-07 no pueden declararse aceptadas sin construir previamente partes de HU-05, HU-10, HU-11 y HU-17, o bien sus criterios tendrán que omitirse durante las pruebas.

---

### 5. ALTO — Editar un registro entre períodos deja indeterminado qué aprobaciones quedan invalidadas

**Qué está mal:** Se permite editar fecha y asignación de un registro, pero solo se define el cambio de estado de “el período” en singular.

**Evidencia:**

- `PRD...v4.md`, **RF-15**: el registro contiene asignación y fecha, y  
  > “El consultor puede editar o quitar sus registros.”
- Mismo archivo, **RF-18**:  
  > “El período es el mes calendario, y hay uno por asignación.”  
  > “Si un período enviado cambia antes de aprobarse, vuelve a «sin enviar».”
- Mismo archivo, **RF-20**:  
  > “Con la primera corrección posterior a la aprobación el período pasa a «aprobado con cambios posteriores».”

**Regla que se rompe y fallo observable:** Se rompe la integridad de RF-18 a RF-21. Si un registro aprobado de enero se edita para quedar en febrero, o pasa a otra asignación, se afectan dos períodos: el de origen y el de destino. No se establece si ambos cambian de estado. El destino podría recibir horas nuevas conservando el estado “aprobado”, mientras solo el origen queda marcado como modificado.

---

### 6. ALTO — Los enlaces para fijar la contraseña no tienen reglas contra reutilización o robo tardío

**Qué está mal:** No existe criterio de caducidad, uso único ni invalidación del enlace después de fijar la contraseña o desactivar la cuenta.

**Evidencia:**

- `PRD...v4.md`, **RF-25**:  
  > “Cada cuenta nueva recibe por correo un enlace para fijar su contraseña.”
- `Backlog...v2.md`, **HU-01.CA-8**:  
  > “recibo en mi correo un enlace para fijar mi contraseña; nadie más la conoce”
- Los ocho criterios de HU-01 no prueban caducidad, uso único ni revocación del enlace.
- **PA-B2** solo trata la recuperación de contraseña olvidada; no resuelve la seguridad del enlace inicial.

**Regla que se rompe y fallo observable:** Se rompe el objetivo de HU-01 de que solo la persona titular use la cuenta. Un enlace conservado en un correo reenviado, un buzón comprometido o una copia antigua podría reutilizarse para fijar o volver a fijar la contraseña, sin que ningún criterio exija rechazarlo.

---

### 7. ALTO — La exportación a Excel permite una posible inyección de fórmulas desde campos controlados por el consultor

**Qué está mal:** Texto introducido por usuarios se exporta a Excel sin ninguna regla que obligue a tratarlo exclusivamente como texto literal.

**Evidencia:**

- `PRD...v4.md`, **RF-15** permite que el consultor introduzca:
  > “ticket… título… descripción breve”
- Mismo archivo, **RF-21** exporta:
  > “proyecto, actividad, ticket, descripción y horas”
- No hay criterio en RF-21, RF-22, HU-17 ni RNF-6 que impida interpretar valores iniciados por `=`, `+`, `-` o `@` como fórmulas.

**Regla que se rompe y fallo observable:** Se compromete la seguridad del archivo de respaldo. Un consultor podría registrar una descripción que Excel evalúe al abrir el archivo, provocando enlaces externos, contenido engañoso o fórmulas no previstas en un documento que recibirán supervisores, dirección o clientes.

---

### 8. ALTO — El backlog usa dos fechas distintas para decidir la disponibilidad y el orden del botón de aviso

**Qué está mal:** La posibilidad de avisar se rige por la fecha del cliente, pero la elección de la primera asignación se declara regida por la fecha de la organización.

**Evidencia:**

- `Backlog...v2.md`, **HU-06.CA-4**:  
  > “se puede avisar desde que empieza el día en la zona horaria del cliente.”
- Mismo archivo, “Fuera de esta historia” de HU-06:  
  > “dos asignaciones en clientes de zonas horarias distintas: cuál es «la primera del día» se decide con la fecha de la organización”
- `PRD...v4.md`, **RF-8**:  
  > “Las horas se interpretan en la zona horaria del cliente.”
- Mismo archivo, **RNF-7**:  
  > “Toda hora se muestra en la zona horaria del cliente de la asignación.”
- La fila asociada a **D-48** en “Sale del MVP” solo atribuye el día de la organización al resumen final y a la entrada en vigor de parámetros, no a la selección del botón.

**Regla que se rompe y fallo observable:** Se rompe RF-6/HU-06.CA-4. Cuando la organización siga en lunes pero uno de los clientes ya esté en martes, la asignación del martes debería aceptar el aviso por fecha del cliente, pero puede quedar fuera o detrás de una asignación seleccionada con la fecha de la organización.

---

### 9. MEDIO — No existe una regla determinista para un aviso concurrente con la ejecución del reporte

**Qué está mal:** Se define qué ocurre antes de la ejecución y después de ser reportado, pero no qué evento gana cuando ambos se procesan simultáneamente.

**Evidencia:**

- `Backlog...v2.md`, **HU-07.CA-4**:  
  > “avisó… antes de esa ejecución… no entra en la lista”
- **HU-07.CA-1**: si no avisó cuando corre la ejecución, entra.
- **HU-06.CA-2** y `PRD...v4.md`, **RF-4**: la hora es aquella en que el sistema recibe el toque.
- No hay criterio para la misma marca temporal o para transacciones concurrentes entre el aviso y la clasificación.

**Regla que se rompe y fallo observable:** RF-9 puede producir resultados distintos para el mismo instante. Un aviso recibido mientras el proceso clasifica la asignación podría quedar como “tardío sin reporte” o como “no reportado que luego avisó”, dependiendo del orden interno de ejecución.

---

### 10. MEDIO — “Ese día” no tiene zona horaria definida para la desactivación y finalización de asignaciones

**Qué está mal:** La desactivación termina las asignaciones “ese día”, pero no se decide si es el día de la organización o el día del cliente.

**Evidencia:**

- `PRD...v4.md`, **RF-24**:  
  > “sus asignaciones como consultor terminan ese día.”
- `Backlog...v2.md`, **HU-07.CA-19**:  
  > “desde el día siguiente… ese consultor no entra en el reporte”
- `PRD...v4.md`, **RF-8** y **RNF-7** hacen depender horarios y horas de la zona del cliente.
- La decisión **D-48** solo resuelve el día de la organización para resumen final y parámetros.

**Regla que se rompe y fallo observable:** RF-24 y HU-07.CA-19 quedan indeterminados cerca de la medianoche. Al desactivar una cuenta cuando la organización está en lunes y el cliente ya está en martes, no se puede saber si la asignación sigue vigente, si debe aparecer en el reporte de ese cliente o desde qué fecha deja de mostrarse el botón.

---

### 11. MEDIO — El intervalo no tiene máximo y permite neutralizar la detección oportuna

**Qué está mal:** Dirección puede configurar un intervalo arbitrariamente grande y el sistema seguirá cumpliendo formalmente RNF-3 aunque el reporte llegue días después.

**Evidencia:**

- `PRD...v4.md`, **RF-14**:  
  > “el intervalo, de 5 minutos como mínimo y en múltiplos de 5”
- No se define un valor máximo.
- Mismo archivo, **RNF-3**:  
  > “retraso máximo de un intervalo”
- Sección 3, propuesta de valor:  
  > “quiero saberlo enseguida”
- **RA-8** acepta explícitamente la falta de tope del margen, pero no menciona ni acepta la falta de tope del intervalo.

**Regla que se rompe y fallo observable:** Se rompe el objetivo de detección oportuna. Un intervalo de 1.440 minutos permitiría que el reporte apareciera un día después y aun así cumpliría literalmente “máximo de un intervalo”.

---

### 12. MEDIO — La matriz de cobertura contradice el listado de historias

**Qué está mal:** La sección que afirma demostrar cobertura en ambos sentidos asigna requisitos a historias que el listado declara que no cubren.

**Evidencia:**

- `Backlog...v2.md`, sección 2, **HU-01**:  
  > “Cubre RF-1, RF-24 (parte)”
- Sección 3 asigna **RF-25 → HU-01, HU-05**, y **HU-01.CA-8** usa RF-25.
- Sección 2, **HU-07** cubre RF-9, RF-10, RF-11 y RF-13.
- Sección 3 asigna también **RF-24 → HU-07**, y **HU-07.CA-12/CA-19** usan RF-24.
- **HU-02.CA-3** declara origen RF-11, pero la matriz de RF-11 solo enumera HU-07 y HU-10.

**Regla que se rompe y fallo observable:** Se rompe la afirmación de que la sección 3 es un cruce fiable en ambos sentidos. Si los tickets se generan desde la columna “Cubre”, pueden omitirse criterios de RF-25 o RF-24; si se generan desde la matriz, las historias tendrán un alcance distinto del declarado.

## Sospechas no elevadas a hallazgo

Estas carencias son visibles, pero los documentos no aportan suficiente regla interna para afirmar una contradicción:

- No se especifica limitación de intentos de inicio de sesión, bloqueo temporal ni protección contra agotamiento de credenciales.
- No se define el tratamiento de horarios locales ambiguos o inexistentes durante cambios de horario de verano.
- RF-23 no exige auditar intentos de acceso o cambios rechazados, solo acciones realizadas; podría faltar evidencia ante ataques de autorización.
- La recuperación de contraseña sigue abierta en **PA-B2**, por lo que una cuenta puede quedar operativamente inaccesible hasta que esa decisión se cierre.
