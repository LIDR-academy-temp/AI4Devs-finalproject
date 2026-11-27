# Revisión adversarial

- Fecha: 2026-11-18 13:00 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v4.md` · huella `c8e6a6c27d91` · 36977 caracteres
- Archivo: `<espacio-de-trabajo>/03-PRD/PRD-MVP-Controlador-de-Tiempo-20261118-v5.md` · huella `633789f424be` · 30150 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. CRÍTICO — Restablecer la contraseña no invalida las sesiones ya abiertas

- **Qué está mal:** una persona que recupera su contraseña puede seguir teniendo una sesión robada activa durante hasta 30 días.
- **Evidencia:**
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v4.md`, **HU-01.CA-6**: «La sesión dura 30 días».
  - **HU-01.CA-10** permite fijar una contraseña nueva, pero no invalida sesiones anteriores.
  - **HU-01.CA-5** solo exige invalidación al desactivar la cuenta, y **HU-01.CA-7** solo al cerrar voluntariamente la sesión.
  - `PRD-MVP-Controlador-de-Tiempo-20261118-v5.md`, **RF-1** y **RF-25**, tampoco vinculan el restablecimiento con la revocación de sesiones.
- **Regla que se rompe y fallo visible:** se rompe la finalidad de **HU-01**, «que solo yo use el sistema en mi nombre», y la separación de datos de **RF-2/RF-3**. Si alguien roba un teléfono o una sesión y el titular cambia la contraseña, el atacante continúa leyendo y operando con esa sesión.

---

### 2. ALTO — Un enlace de contraseña anterior sigue siendo válido después de emitir o usar uno nuevo

- **Qué está mal:** cada enlace solo invalida su propio uso; no se establece que una contraseña nueva revoque los demás enlaces todavía vigentes.
- **Evidencia:**
  - Backlog, **HU-01.CA-9**: el enlace deja de servir únicamente si «ya se usó una vez, pasó su plazo o la cuenta fue desactivada».
  - **HU-01.CA-10** permite pedir nuevos enlaces, sin decir qué ocurre con los anteriores.
  - PRD, **RF-25**, repite esas mismas tres condiciones de invalidez.
- **Regla que se rompe y fallo visible:** se rompe la protección pretendida por **HU-01.CA-9** frente a correos reenviados o buzones ajenos. Un usuario usa el enlace más reciente y protege su cuenta, pero un atacante que conserva un enlace anterior puede cambiarle nuevamente la contraseña dentro de las 72 horas.

---

### 3. ALTO — No hay ninguna protección exigida contra intentos ilimitados de entrada o recuperación

- **Qué está mal:** el material evita revelar si una cuenta existe, pero no limita intentos de contraseña ni solicitudes repetidas de enlaces.
- **Evidencia:**
  - Backlog, **HU-01.CA-3**, solo exige que el mensaje sea el mismo para credenciales incorrectas.
  - **HU-01.CA-10** permite solicitar un enlace proporcionando un correo.
  - PRD, **RF-1** y **RF-25**, no contienen límite, espera, control de abuso ni condición equivalente.
  - **PA-B10** solo comprueba duraciones admitidas por el servicio de autenticación; no comprueba sus controles contra abuso.
- **Regla que se rompe y fallo visible:** se debilita **RF-1**, que pretende que solo la persona titular use la cuenta. Un tercero puede probar credenciales indefinidamente, bombardear un buzón con correos de recuperación o agotar el servicio de correo/autenticación sin infringir ningún criterio de aceptación.

---

### 4. ALTO — Las cuentas desactivadas deben recibir y no recibir el correo de recuperación a la vez

- **Qué está mal:** el flujo de recuperación no excluye cuentas desactivadas, pero RF-24 prohíbe que reciban cualquier correo del sistema.
- **Evidencia:**
  - PRD, **RF-24**: desde la desactivación la persona «deja de recibir correos del sistema».
  - PRD, **RF-25**: «Quien olvida su contraseña pide desde la pantalla de entrada un enlace igual», sin condición de cuenta activa.
  - Backlog, **HU-01.CA-10**: al indicar el correo, «recibo un enlace».
  - **HU-01.CA-9** contempla expresamente que un enlace para una cuenta desactivada no sirva, lo cual no determina si se envía o no.
- **Regla que se rompe y fallo visible:** una solicitud de recuperación para una cuenta desactivada obliga a elegir entre incumplir **HU-01.CA-10** —no enviar el enlace— o incumplir **RF-24** —enviarlo—. Además, podría seguir generándose correo inútil para una persona que ya no debe recibir comunicaciones.

---

### 5. ALTO — La identidad de autenticación no está definida cuando un mismo correo existe en dos organizaciones

- **Qué está mal:** no se exige unicidad global del correo ni se define cómo se selecciona la cuenta u organización si el mismo correo tiene dos cuentas.
- **Evidencia:**
  - PRD, **RF-3**: todo dato pertenece a una organización y ningún usuario debe cruzar esa frontera.
  - **RF-25** crea cuentas y recupera contraseñas mediante correo.
  - Backlog, **HU-01.CA-10**, inicia la recuperación solo «con mi correo», sin organización ni otro discriminador.
  - El contexto del PRD contempla al menos dos organizaciones, `Proveedor A` y `Proveedor B`.
- **Regla que se rompe y fallo visible:** queda sin garantía la separación de **RF-3**. Si una persona tiene el mismo correo en ambos proveedores, el sistema no tiene una regla para decidir qué cuenta recupera o a qué organización entra; puede restablecer la cuenta equivocada, fusionar identidades o mostrar datos del tenant incorrecto.

---

### 6. ALTO — Hay una decisión funcional de períodos pendiente, aunque el backlog declara un único punto abierto técnico

- **Qué está mal:** mover un registro entre períodos deja sin decidir el estado del período de origen y del destino.
- **Evidencia:**
  - Encabezado del backlog: «1 sigue abierto (PA-B10, una verificación técnica)».
  - Backlog, **N-1**: «Editar un registro cambiándole la fecha o la asignación puede moverlo de un período a otro. Hay que decir qué pasa con el estado de los dos».
  - PRD, **RF-15** permite editar registros, incluyendo fecha y asignación.
  - **RF-18/RF-20** asignan estados y consecuencias distintas a períodos enviados y aprobados.
- **Regla que se rompe y fallo visible:** la afirmación de que solo queda abierto **PA-B10** es falsa. Si se mueve un registro de un período aprobado a otro enviado o aprobado, no se sabe cuál queda «aprobado con cambios posteriores», cuál vuelve a «sin enviar» ni qué aprobación respalda cada total. El Excel de facturación puede conservar una aprobación incompatible con sus datos.

---

### 7. ALTO — Un aviso posterior al reporte debe aceptarse, pero deja de existir el único botón cuando termina el horario

- **Qué está mal:** después del fin del horario no hay mecanismo para registrar el aviso tardío que otros criterios ordenan aceptar.
- **Evidencia:**
  - Backlog, **HU-06.CA-7**: si la persona ya salió en el reporte y avisa después, «el aviso se acepta».
  - **HU-06.CA-8**: si «el horario de hoy ya terminó», no ve el botón.
  - PRD, **RF-4**: el botón solo corresponde a una asignación «cuyo horario no ha terminado».
  - **RF-6**: al terminar el horario no se muestra el botón.
  - **RF-13** contempla a quien «fue reportado y avisó después».
- **Regla que se rompe y fallo visible:** una persona reportada a las 09:05 que intente avisar después del final de su jornada no puede ejecutar la acción descrita por **HU-06.CA-7/RF-13**. El sistema la deja permanentemente como no reportada aunque posteriormente intente declarar el inicio.

---

### 8. ALTO — La protección contra fórmulas de Excel cubre solo dos campos, aunque el archivo contiene muchos más textos

- **Qué está mal:** se reconoce el riesgo de inyección de fórmulas únicamente para descripción y ticket, pero el Excel contiene otros textos que también pueden interpretarse como fórmulas.
- **Evidencia:**
  - Backlog, **N-2**: «La descripción y el ticket [...] deben tratarlos siempre como texto, nunca como fórmula».
  - PRD, **RF-21**: el Excel también incluye empresa, cliente, consultor, supervisor, contraparte, proyecto y actividad.
  - **RF-25/RF-17** permiten cargar nombres de clientes, proyectos, personas y actividades.
- **Regla que se rompe y fallo visible:** se compromete la seguridad del archivo exportado de **RF-21**. Un nombre cargado que comience con `=`, `+`, `-` o `@` puede ser interpretado por Excel al abrir el archivo, aunque descripción y ticket estén protegidos. El archivo enviado al cliente podría ejecutar fórmulas o enlaces no previstos.

---

### 9. MEDIO — No se evita la enumeración de registros ajenos dentro de la misma organización

- **Qué está mal:** se exige ocultar la existencia de datos entre organizaciones, pero no se aplica la misma regla a datos de otros consultores del mismo tenant.
- **Evidencia:**
  - Backlog, **HU-03.CA-3**: un dato de otra organización responde igual que si no existiera.
  - **HU-02.CA-2** solo dice que el consultor no ve ni cambia datos de otro consultor.
  - **HU-02.CA-9** exige mostrar «no tengo permiso» cuando una operación se rechaza por permisos.
  - PRD, **RF-3**, limita expresamente la indistinguibilidad a datos de otra organización.
- **Regla que se rompe y fallo visible:** se debilita «ve solo lo propio» de **RF-2/HU-02**. Probando identificadores, un consultor puede distinguir potencialmente entre un registro existente de un compañero —respuesta de permiso— y uno inexistente —respuesta de inexistencia—, obteniendo metadatos que no le corresponden.

---

### 10. MEDIO — RNF-7 exige una zona horaria que no existe para varios eventos auditados

- **Qué está mal:** «toda hora» debe mostrarse en la zona del cliente de la asignación, pero varias horas no pertenecen a ninguna asignación o cliente.
- **Evidencia:**
  - PRD, **RNF-7**: «Toda hora se muestra en la zona horaria del cliente de la asignación».
  - **RF-23** registra cuándo se cargaron datos, se desactivó una cuenta o se cambió un parámetro.
  - **RF-14** define parámetros por organización.
  - **RF-25** incluye la creación inicial de una organización y su primera cuenta, antes de que necesariamente exista una asignación.
- **Regla que se rompe y fallo visible:** RNF-7 no puede cumplirse de forma determinista para la hora de creación de una organización, un cambio global de parámetro o la desactivación de una cuenta con asignaciones en clientes de zonas distintas. La traza mostrará una zona arbitraria o inconsistente.

---

### 11. MEDIO — No se define si un aviso recibido exactamente al vencer el margen es puntual o tardío

- **Qué está mal:** los criterios cubren antes y después del vencimiento, pero no el instante exacto.
- **Evidencia:**
  - Backlog, **HU-06.CA-5**: aviso «dentro del margen».
  - **HU-06.CA-6**: aviso «después de vencido el margen».
  - **HU-07.CA-3** usa 08:59 como caso puntual y **HU-07.CA-4** usa 09:02 como tardío para un margen que vence a las 09:00.
  - **HU-07.CA-20** resuelve la carrera con la ejecución, no la igualdad exacta con el vencimiento.
- **Regla que se rompe y fallo visible:** dos implementaciones conformes pueden clasificar un aviso a las 09:00:00 de forma distinta. Esto altera la llegada tardía, los minutos de retraso, M-1 y potencialmente el reporte.

---

### 12. MEDIO — Los totales y la comprobación automática declaran cantidades incompatibles

- **Qué está mal:** el documento afirma simultáneamente que tiene 73 criterios y que el cruce se hizo sobre 71.
- **Evidencia:**
  - Encabezado del backlog: «73 criterios (CA)».
  - Sección 3, **“De requisito a historia”**: «el origen de los 71 criterios se comprobaron entre sí».
  - La numeración visible suma 73: HU-01 (10), HU-02 (12), HU-03 (7), HU-06 (15), HU-07 (20) y HU-10 (9).
- **Regla que se rompe y fallo visible:** queda desacreditada la afirmación de cobertura automática sin diferencias. O bien dos criterios no participaron en el cruce, o bien el resultado documentado está desactualizado; en ambos casos no se puede confiar en que los 73 criterios estén cubiertos por la validación declarada.
