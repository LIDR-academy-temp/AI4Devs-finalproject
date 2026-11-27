# Revisión adversarial

- Fecha: 2026-11-18 00:06 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<repositorio>/readme.md` · huella `82e379a42ac1` · 59696 caracteres
- Archivo: `<espacio-de-trabajo>/03-PRD/PRD-MVP-Controlador-de-Tiempo-20261117-v3.md` · huella `7be0c259bb6c` · 23972 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. CRÍTICO — El resumen diario puede divulgar datos y motivos de salud a supervisores que no gestionan a esas personas

- **Qué está mal:** Se ordena enviar el resumen de toda la organización a todos los supervisores, aunque un supervisor solo puede ver a sus propios supervisados.
- **Evidencia:**
  - `PRD-MVP-Controlador-de-Tiempo-20261117-v3.md`, **RF-2**: «El supervisor ve lo de los consultores que supervisa».
  - Mismo archivo, **RF-10**: «Cuando todas las del día en la organización quedan clasificadas, sale por correo un resumen final a los supervisores y a la dirección, con los no reportados y su motivo».
  - `readme.md`, §1.2, capacidad 3: «sale un resumen final a los supervisores y a la dirección».
  - `readme.md`, modelo `RESUMEN_DIARIO`: solo tiene `organizacion_id` y `fecha`, sin ámbito por supervisor.
- **Regla rota y fallo observable:** Rompe RF-2 y la separación horizontal entre supervisores. Un supervisor podría recibir nombres y motivos como «incapacidad» de consultores asignados a otro supervisor de la misma organización.

### 2. ALTO — La unicidad de `NO_REPORTADO` no evita correos duplicados ni garantiza que se envíen

- **Qué está mal:** El diseño confunde idempotencia de la fila con idempotencia de la entrega del correo.
- **Evidencia:**
  - `readme.md`, Ticket **T-05**, criterio 5: «Dos ejecuciones seguidas no duplican la fila ni el correo: lo impide la unicidad por (asignación, fecha)».
  - Mismo ticket: primero «Inserta una fila» y después «emite [...] un solo correo».
  - `readme.md`, §3, `NO_REPORTADO` contiene `notificado_en`, pero T-05 busca exclusivamente asignaciones «sin fila en `NO_REPORTADO`».
  - PRD, **RA-6**: admite que «puede salir un correo repetido».
- **Regla rota y fallo observable:** Rompe RF-10 y contradice el criterio técnico de T-05. Si el proceso inserta la fila y cae antes de enviar, la siguiente ejecución ya no la selecciona y el supervisor nunca recibe el correo. Si envía y cae antes de confirmar el estado, puede repetirlo. La restricción UNIQUE no resuelve ninguno de los dos casos.

### 3. ALTO — El llamado “resumen final del día” puede salir al comienzo de la jornada

- **Qué está mal:** Una asignación queda clasificada apenas tiene aviso o fila de no reportado, por lo que no existe ninguna condición que espere al cierre del día.
- **Evidencia:**
  - `readme.md`, §1.2: «No hay hora de cierre: cada asignación del día deja de revisarse cuando queda clasificada».
  - PRD, **RF-10**: el resumen sale «cuando todas las del día [...] quedan clasificadas».
  - `readme.md`, §1.3, recorrido del supervisor: «Al cierre del día recibe el resumen final».
  - `readme.md`, `RESUMEN_DIARIO`: UNIQUE (`organizacion_id`, `fecha`), lo que impide emitir una segunda versión actualizada.
- **Regla rota y fallo observable:** Rompe el recorrido declarado y deja incompleto RF-10. Si todos avisan a las 08:00, el resumen puede salir a las 08:05; si alguien es reportado a las 09:05 y avisa a las 09:20, esa llegada tardía no aparecerá en el resumen ya enviado.

### 4. ALTO — Desactivar a un supervisor tiene dos comportamientos incompatibles

- **Qué está mal:** Una sección afirma que todas sus asignaciones terminan ese día, mientras el PRD exige conservarlas y trasladar temporalmente sus funciones a Dirección.
- **Evidencia:**
  - PRD, **RF-24**: «Si era supervisor, la dirección recibe sus reportes y aprueba sus períodos hasta que se cargue otro supervisor».
  - `readme.md`, §2.5, “Cuentas desactivadas”: «sus asignaciones terminan ese día».
  - `readme.md`, §3.2, `USUARIO`: «desactivar quita el acceso y termina las asignaciones».
  - Ticket **T-10** solo dice «carga controlada de datos y desactivación de cuentas», sin escenario para la sustitución del supervisor.
- **Regla rota y fallo observable:** Rompe RF-24. Al desactivar a un supervisor, o bien se terminan indebidamente las asignaciones de sus consultores, o siguen apuntando al supervisor inactivo y los correos y aprobaciones quedan sin destinatario.

### 5. ALTO — `REFERENCIA_EXTERNA` no conserva una copia histórica del ticket

- **Qué está mal:** Una referencia compartida y única por ticket puede cambiar retroactivamente el significado de todos los registros históricos.
- **Evidencia:**
  - `readme.md`, §3.2: «Así un registro aprobado no pierde significado si el cliente cambia o borra su ticket después».
  - Modelo `REFERENCIA_EXTERNA`: UNIQUE (`cliente_id`, `sistema`, `clave`) y relación 1:N con `REGISTRO_ACTIVIDAD`.
  - La entidad contiene `titulo` y `leido_en`, pero no hay versionado ni prohibición de `UPDATE`.
  - Solo `TRAZA` está declarada append-only.
- **Regla rota y fallo observable:** Rompe la decisión de “copia fechada”. Si el mismo ticket cambia de título, no se puede insertar una nueva copia por la restricción UNIQUE; actualizar la existente altera el título que verán períodos ya aprobados y exportaciones históricas.

### 6. ALTO — La base no garantiza que proyecto, actividad, referencia y asignación pertenezcan al mismo cliente

- **Qué está mal:** `organizacion_id` evita algunos cruces entre organizaciones, pero no impide mezclar entidades de clientes distintos dentro de la misma organización.
- **Evidencia:**
  - PRD, **RF-17**: el consultor ve proyectos y actividades que «aplican al cliente de su asignación».
  - `readme.md`, API `POST /api/v1/registros`, respuesta 422: rechaza «proyecto o actividad [...] de otro cliente».
  - Modelo `REGISTRO_ACTIVIDAD`: FKs independientes a `ASIGNACION`, `PROYECTO`, `CATALOGO_ACTIVIDAD` y `REFERENCIA_EXTERNA`.
  - Ticket **T-02**, criterio 6, solo comprueba que la organización de una hija coincida con la asignación; no comprueba la coincidencia del cliente.
- **Regla rota y fallo observable:** Rompe RF-17 y la integridad del respaldo de factura. Un fallo en el route handler o una escritura directa permitida por RLS podría imputar en una asignación de Cliente A un proyecto, actividad o ticket de Cliente B de la misma organización.

### 7. ALTO — No se prueba ni se define suficientemente el aislamiento entre supervisores de una misma organización

- **Qué está mal:** Las pruebas se concentran en impedir cruces entre organizaciones, pero no en impedir que un supervisor acceda a otro equipo dentro de su organización.
- **Evidencia:**
  - PRD, **RF-2**: el supervisor solo ve «los consultores que supervisa».
  - `readme.md`, Ticket **T-02**, criterio 5: únicamente prueba que un usuario de A no lea filas de B.
  - Ticket **T-05**, criterio 9: únicamente prueba que un supervisor de organización A no vea asignaciones de B.
  - `readme.md`, §2.5: presenta las políticas como basadas en rol y `organizacion_id`, sin criterio explícito de pertenencia al supervisor.
- **Regla rota y fallo observable:** Rompe RF-2. Dos supervisores de Proveedor A podrían consultar o aprobar períodos del equipo del otro sin cruzar la frontera de organización, por lo que las pruebas declaradas seguirían pasando.

### 8. ALTO — El endpoint de aviso permite registrar presencia antes de que empiece la jornada

- **Qué está mal:** El requisito excluye asignaciones aún no iniciadas, pero el endpoint y el ticket solo verifican que el horario no haya terminado.
- **Evidencia:**
  - PRD, **RF-6**: no hay botón si la asignación está «aún no iniciada».
  - `readme.md`, API `POST /api/v1/avisos`: selecciona la primera asignación «cuyo horario no ha terminado».
  - Historia 1 y Ticket **T-04**, criterio 6: repiten «sin aviso cuyo horario no ha terminado», sin comprobar la hora de inicio.
- **Regla rota y fallo observable:** Rompe RF-6. Un consultor con jornada 08:00–17:00 podría avisar a las 02:00, quedar clasificado y desaparecer del proceso de no reportados aunque aún no hubiera comenzado a trabajar.

### 9. ALTO — La carga inicial no puede cumplir simultáneamente la autenticación y la trazabilidad exigidas

- **Qué está mal:** La carga inicial debe crear a la primera Dirección, pero se atribuye la carga a Dirección y la traza exige un usuario que todavía no existe.
- **Evidencia:**
  - PRD, **RF-25**: «La dirección» realiza la carga y «La carga inicial crea la organización y su primera cuenta de dirección».
  - PRD, **RF-23**: se registra quién «cargó datos».
  - Modelo `TRAZA`: `usuario_id FK`, sin actor de sistema ni nulabilidad declarada.
  - `readme.md`, componente “Carga controlada”: crea «la organización y su primera cuenta de dirección».
- **Regla rota y fallo observable:** Rompe RF-23 o RF-25. La primera carga no puede estar autenticada como Dirección antes de crear esa cuenta, y tampoco puede generar una traza válida atribuida a un usuario existente.

### 10. ALTO — El modelo no declara la relación de `USUARIO` con `auth.users`

- **Qué está mal:** Toda la autorización depende de mapear `auth.uid()` a rol, organización y estado activo, pero el esquema no garantiza esa correspondencia.
- **Evidencia:**
  - `readme.md`, §2.2: «políticas RLS leen el rol y la organización del usuario autenticado».
  - Modelo `USUARIO`: `id PK`, pero no aparece una FK hacia `auth.users`.
  - Ticket **T-02** tampoco incluye esa FK entre sus criterios o tareas.
- **Regla rota y fallo observable:** Pone en riesgo RF-1, RF-2, RF-3 y RF-24. Una cuenta de Auth huérfana, un perfil con UUID incorrecto o una eliminación descoordinada puede producir denegaciones inesperadas o una asociación equivocada de organización y rol.

### 11. MEDIO — La promesa de backup diario no tiene ticket ni escenario de verificación

- **Qué está mal:** Se presenta el backup diario como garantía, pero no hay tarea que confirme que el plan contratado lo ofrece ni prueba de restauración.
- **Evidencia:**
  - PRD, **RNF-5**: «Los datos tienen respaldo diario».
  - `readme.md`, §2.4: «Base de datos gestionada con backups diarios».
  - `readme.md`, §2.1: solo deja «por confirmar» la disponibilidad del cron en el plan gratuito, no la de backups.
  - Ningún ticket T-00–T-11 incluye configuración, comprobación o restauración de backups.
- **Regla rota y fallo observable:** RNF-5 puede declararse cumplido sin serlo. Una pérdida o corrupción de la base podría revelar que el plan no conservaba backups diarios o que estos no eran restaurables.

### 12. MEDIO — El documento afirma que hay tres roles, pero el esquema introduce un cuarto rol autenticable

- **Qué está mal:** `aprobador_cliente` existe como valor de rol pese a que las decisiones vigentes dicen que solo hay tres roles y que el cliente no accede al MVP.
- **Evidencia:**
  - PRD, **RF-2**: «Hay tres roles».
  - `readme.md`, §1.2: «tres roles».
  - Modelo `USUARIO.rol`: `consultor | supervisor | direccion | aprobador_cliente`.
  - `readme.md`, §2.5: «aprobador_cliente [...] tubería, sin acceso en el MVP».
  - No hay criterio que pruebe que una cuenta activa con ese rol recibe denegación en todas las rutas.
- **Regla rota y fallo observable:** Contradice RF-2 y deja una condición de seguridad sin verificar. Una política escrita como “usuario activo de la organización” podría conceder acceso parcial al cuarto rol.

### 13. MEDIO — Las correcciones exigidas no están especificadas en la API presentada

- **Qué está mal:** Se exige agregar, editar y quitar registros incluso después de aprobar, pero solo se define `POST /api/v1/registros`.
- **Evidencia:**
  - PRD, **RF-15**: «El consultor puede editar o quitar sus registros».
  - PRD, **RF-20**: corregir es «agregar, editar o quitar un registro».
  - `readme.md`, §4: solo especifica `POST /api/v1/registros`; no hay `PATCH` ni `DELETE`.
  - Ticket **T-07** promete «Registro de actividad: endpoint y pantalla» sin enumerar edición o eliminación.
  - El E2E de §2.6 solo cubre «aviso → registro → envío → aprobación → exportación».
- **Regla rota y fallo observable:** RF-15 y RF-20 podrían quedar sin implementación o sin contrato verificable. El flujo feliz pasaría aunque un consultor no pudiera corregir un registro aprobado ni generar `aprobado_con_cambios`.

### 14. MEDIO — El contrato de creación de registros acepta datos incompletos respecto del requisito

- **Qué está mal:** La API hace opcionales campos que RF-15 presenta como parte del registro o del ticket cuando este existe.
- **Evidencia:**
  - PRD, **RF-15**: el registro contiene «ticket opcional (clave y título [...]), descripción breve y tipo de hora».
  - `readme.md`, OpenAPI `POST /api/v1/registros`: `required` solo incluye `fecha, entrada, salida, proyectoId, actividadId, modalidad`.
  - Dentro de `ticket` tampoco hay lista `required`, por lo que `{}`, `{ "clave": "INC-1" }` o `{ "titulo": "..." }` son válidos según el contrato.
- **Regla rota y fallo observable:** Rompe la estructura declarada en RF-15. Se podrían almacenar registros sin descripción o referencias manuales sin clave/título completos, inutilizables como respaldo.

### 15. MEDIO — No está definido qué significa “hoy” para una organización con clientes en varias zonas horarias

- **Qué está mal:** Las asignaciones usan la zona de cada cliente, pero resumen y vigencia de parámetros usan una sola fecha por organización sin zona organizativa.
- **Evidencia:**
  - `readme.md`, §2.1: el proceso «funciona igual con cualquier zona horaria».
  - PRD, **RF-8**: las horas se interpretan en la zona del cliente.
  - Modelo `RESUMEN_DIARIO`: UNIQUE (`organizacion_id`, `fecha`).
  - Modelo `PARAMETRO`: `vigente_desde date`; RF-14 dice que un cambio aplica «desde el día siguiente».
  - Ticket **T-05**, criterio 10, solo prueba «un cliente en otra zona», no dos clientes de la misma organización con fechas locales distintas simultáneamente.
- **Regla rota y fallo observable:** RF-10 y RF-14 quedan ambiguos. En un mismo instante un cliente puede estar en lunes y otro en martes; el proceso puede cerrar prematuramente el resumen de una fecha o aplicar un parámetro nuevo a unas asignaciones antes que a otras.

### 16. MEDIO — El intervalo configurable carece de una regla de programación comprobable

- **Qué está mal:** El cron corre siempre cada cinco minutos, pero no se define el origen respecto del cual una organización con intervalo 10, 15 o más “corresponde” en una ejecución.
- **Evidencia:**
  - PRD, **RF-14**: intervalo configurable, mínimo 5 y múltiplo de 5.
  - `readme.md`, §2.1: cron «cada 5 minutos».
  - Ticket **T-05**: procesa «cada organización cuyo intervalo corresponda», sin definir el anclaje ni un criterio para intervalos distintos de 5.
  - Los criterios 1–4 de T-05 solo usan intervalo 5.
- **Regla rota y fallo observable:** RF-14 y RNF-3 no son verificables para otros valores. Una organización con intervalo 15 podría ejecutarse cada 5 minutos, esperar 20 o depender accidentalmente del minuto UTC de despliegue.

### 17. MEDIO — La traza no es realmente inalterable para el componente que usa la clave de servicio

- **Qué está mal:** Solo se revocan modificaciones al rol `authenticated`, mientras el proceso interno opera con una clave que omite RLS.
- **Evidencia:**
  - `readme.md`, §2.5: «Trazabilidad inalterable» y tabla append-only «sin `UPDATE` ni `DELETE` por diseño».
  - Ticket **T-02**, criterio 4: únicamente comprueba que el `UPDATE` falle con el rol `authenticated`.
  - `readme.md`, §2.2, “Proceso de no reportados”: «corre con la clave de servicio».
- **Regla rota y fallo observable:** Debilita RF-23. Un defecto en código servidor ejecutado con la clave de servicio puede modificar o borrar trazas sin que el único test declarado lo detecte.

## Sospechas que el material no permite confirmar

- **CSRF en rutas con cookie:** no se menciona validación de `Origin`, token CSRF ni configuración `SameSite`. No puede afirmarse la vulnerabilidad sin conocer cómo configurará `@supabase/ssr`.
- **Texto médico libre:** RF-12 dice que no se escriban diagnósticos, pero `maxLength: 300` no puede impedirlos. Depende de controles de interfaz, capacitación o revisión que todavía no están descritos.
- **Festivos y excepciones de calendario:** `dias_laborables` es un `string` como «L-V» y no existe calendario de festivos. Es probable que se generen no reportados en festivos del cliente, pero el material no declara expresamente que deban tratarse como no laborables.
- **Políticas RLS autorreferentes:** se dice que RLS obtiene rol y organización desde `USUARIO` y que RLS también está activo en `USUARIO`. Sin una función segura, claims o política especial podría producir recursión, pero todavía no existe SQL para comprobarlo.
