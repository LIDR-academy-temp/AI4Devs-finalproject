# Revisión adversarial

- Fecha: 2026-11-19 09:40 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<repositorio>/openspec/specs/acceso/spec.md` · huella `7a04bcbf820c` · 23618 caracteres
- Archivo: `<repositorio>/openspec/specs/aviso-inicio/spec.md` · huella `c2492097ebe6` · 17925 caracteres
- Archivo: `<repositorio>/openspec/specs/no-reportados/spec.md` · huella `3f59c836d371` · 23536 caracteres
- Archivo: `<espacio-de-trabajo>/05-Tickets/Recorte-Entrega-20261119-v4.md` · huella `c6d68d085af4` · 8225 caracteres
- Archivo: `<espacio-de-trabajo>/06-Spec-viva/HU-01.6-prueba-local-20261118-v1.md` · huella `300e2df41965` · 4913 caracteres
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` · huella `84e92c472ace` · 38894 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. ALTO — La exigencia de que las reglas de base bloqueen a usuarios inactivos no tiene ninguna prueba

- **Qué está mal:** Se exige que todas las reglas por organización comprueben `activo`, pero ninguna prueba directa a la base usa un usuario inactivo.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Separación por organización en la base»**: “La regla DEBE exigir además que el usuario esté activo”.
  - En el mismo requisito, los escenarios solo cubren dos organizaciones, dirección y tablas sin regla.
  - `acceso/spec.md`, requisito **«Matriz de permisos»**: sus situaciones tampoco incluyen una cuenta inactiva.
  - `HU-01.6-prueba-local-20261118-v1.md`, **P4**: “**pase ya emitido: sigue aceptado**”.
- **Regla que se rompe y fallo observable:** Una política puede filtrar correctamente por organización pero omitir `activo` y superar toda la batería descrita. Un usuario desactivado que conserve su pase podría consultar directamente la base, aunque la capa de código rechace sus peticiones normales.

### 2. ALTO — La cookie no está obligada a quedar restringida al host y podría entregarse a un subdominio no confiable

- **Qué está mal:** Se considera no confiable cualquier otro subdominio, pero solo se exigen las marcas de no lectura y conexión cifrada; no se exige ni se comprueba que la cookie sea exclusiva del host.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Peticiones que vienen de otro sitio»**: “desde otro subdominio se rechaza”.
  - Mismo requisito: la cookie solo debe estar marcada para que “no la lea el código de la página” y para viajar por conexión cifrada.
  - Mismo requisito, nota **«Por comprobar al construir HU-01.2»**: “con qué atributos entrega la cookie el cliente oficial del servicio. No se ha comprobado”.
  - `Recorte-Entrega-20261119-v4.md`, ajuste **H-4**: únicamente hace obligatoria la comprobación de la marca de conexión cifrada.
- **Regla que se rompe y fallo observable:** Si el cliente oficial configura `Domain` para el dominio padre, el navegador enviará la cookie a otro subdominio antes de que la aplicación pueda rechazar su `Origin`. El servidor de ese subdominio podría recibir la sesión, aunque sea `HttpOnly`.

### 3. ALTO — Se permiten zonas con horario de verano mientras un caso válido de horario sigue sin decisión aprobada

- **Qué está mal:** El modelo acepta cualquier zona estándar, pero el caso donde inicio y fin caen en una hora inexistente está expresamente pendiente de decisión.
- **Evidencia:**
  - `aviso-inicio/spec.md`, tabla **`cliente`**: `zona_horaria` admite cualquier nombre reconocido de la lista estándar.
  - `aviso-inicio/spec.md`, **Vocabulario · Cambio de hora**: una hora inexistente se mueve al primer instante válido posterior.
  - `aviso-inicio/spec.md`, **Riesgos aceptados**: un horario de 02:30 a 02:45 puede quedar con inicio y fin en el mismo instante; su estado es “**Propuesto, pendiente de la Dirección**”.
  - La restricción de `asignacion` solo comprueba que `hora_fin` sea posterior a `hora_inicio` como horas locales.
- **Regla que se rompe y fallo observable:** Una asignación 02:30–02:45 puede superar el `CHECK` y quedar con ambos extremos en las 03:00. Las reglas de asignación pendiente, fin del horario y clasificación operarían sobre un intervalo de duración cero sin que exista una decisión aprobada sobre su validez.

### 4. MEDIO — La base no preserva que el supervisor conserve el rol requerido

- **Qué está mal:** La coherencia solo se comprueba al insertar o modificar la asignación, no cuando se elimina posteriormente el rol del supervisor.
- **Evidencia:**
  - `aviso-inicio/spec.md`, tabla **`asignacion`**: “un disparador rechaza, **al crear o cambiar la asignación**, un `supervisor_id` que no tenga el rol `supervisor`”.
  - Mismo archivo: “Quitarle el rol a quien supervisa asignaciones vigentes es una operación que todavía no existe [...] la regla queda escrita para cuando exista”.
  - Requisito **«La asignación es coherente en la base»**: afirma que la base debe rechazar una asignación cuyo supervisor no tenga ese rol.
- **Regla que se rompe y fallo observable:** La credencial del sistema o una futura carga podría quitar la fila de `usuario_rol` sin tocar `asignacion`, dejando asignaciones vigentes con un supervisor que ya no cumple la invariante. Las reglas de acceso y el correo podrían tratar de forma distinta a esa persona.

### 5. MEDIO — No existe un motivo definido para un consultor sin ninguna asignación

- **Qué está mal:** La pantalla exige un motivo siempre que no haya asignación pendiente, pero los cinco motivos solo pueden evaluarse si existe al menos una asignación.
- **Evidencia:**
  - `aviso-inicio/spec.md`, requisito **«Motivo cuando no hay botón»**: declara exactamente cinco motivos, todos referidos a “la asignación”.
  - `Recorte-Entrega-20261119-v4.md`, sección **«Lo que se difiere»**, HU-02.3: “quien no tiene asignación ve un mensaje simple”.
  - No hay escenario en `aviso-inicio/spec.md` para cero asignaciones.
- **Regla que se rompe y fallo observable:** Un usuario con rol consultor pero sin asignaciones no puede caer en ninguno de los cinco motivos. La implementación puede mostrar una pantalla vacía, un motivo inventado o un error sin que ninguna prueba falle.

### 6. MEDIO — El cierre de sesión queda fuera de la protección explícita contra peticiones de otro sitio

- **Qué está mal:** Se protege toda escritura y se añade expresamente la entrada por cambiar la sesión, pero no se incluye el cierre, que también modifica la sesión.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Peticiones que vienen de otro sitio»**: protege “toda operación que cambie datos, **y también la de entrada, que cambia la sesión del navegador**”.
  - `acceso/spec.md`, requisito separado **«Cerrar la sesión»**.
  - Los escenarios de origen cubren aviso, entrada y peticiones sin origen, pero no cierre.
- **Regla que se rompe y fallo observable:** Otro sitio podría inducir una petición de cierre con la cookie de la víctima. Si la implementación sigue literalmente el conjunto protegido, la sesión se cerraría sin consentimiento, produciendo una denegación de servicio repetible.

### 7. MEDIO — La aplicación inmediata de un cambio de `sesion_dias` no está cubierta por ningún escenario

- **Qué está mal:** Se declara que un cambio del plazo afecta inmediatamente a sesiones ya abiertas, pero solo se prueban organizaciones cuyo valor ya era 1 o 30.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Sesión vigente»**: “`sesion_dias` es un valor por organización y **rige en cuanto cambia**”.
  - Sus escenarios **«el plazo es un parámetro»** y **«en el instante exacto del plazo»** no cambian el valor durante una sesión.
  - `acceso/spec.md`, alcance: cambiar un parámetro es una operación todavía inexistente.
- **Regla que se rompe y fallo observable:** Una implementación que copie `sesion_dias` al iniciar sesión o lo mantenga en caché pasaría todos los escenarios actuales. Al reducirlo de 30 a 1, una sesión de varios días seguiría siendo aceptada contra la decisión de vigencia inmediata.

### 8. MEDIO — Los reintentos pueden mezclar días, pero el correo prohíbe incluir la fecha

- **Qué está mal:** Un correo puede contener no reportados detectados en días distintos dentro de las últimas 24 horas, pero la fecha no está entre los cinco datos permitidos.
- **Evidencia:**
  - `no-reportados/spec.md`, requisito **«Correo agrupado al supervisor»**: incluye todos los no reportados sin notificar “detectados en las últimas 24 horas”.
  - Escenario **«rechazado cerca de la medianoche»**: una fila del día anterior se envía al día siguiente.
  - Requisito **«Contenido mínimo del correo»**: exige “solo estos cinco datos”: nombre, cliente, hora comprometida, minutos de retraso y teléfono; no incluye `fecha`.
- **Regla que se rompe y fallo observable:** Tras fallos prolongados, un correo puede agrupar una fila de ayer y otra de hoy para la misma persona y cliente sin indicar a qué fecha corresponde cada una. El supervisor no puede distinguir los reportes únicamente con el contenido permitido.

### 9. MEDIO — La duración de la sesión depende de un campo que el propio material reconoce como no documentado

- **Qué está mal:** La regla central de los 30 días se apoya en que la marca de entrada sobreviva a las renovaciones, aunque el proveedor no garantiza documentalmente ese comportamiento.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Sesión vigente»**: usa “el momento de entrada [...] que se conserva cuando la sesión se renueva”.
  - `HU-01.6-prueba-local-20261118-v1.md`, conclusión 5: “Que ese campo no esté descrito en la documentación del proveedor es un riesgo menor”.
  - `acceso/spec.md`, **Riesgos aceptados**: solo contempla repetir P5 en el despliegue gestionado, no una garantía contractual posterior.
- **Regla que se rompe y fallo observable:** Si una actualización del servicio cambia o deja de conservar esa marca, una renovación podría reiniciar el plazo indefinidamente o invalidar sesiones antes de tiempo. La prueba puntual de H-4 no detectaría una regresión posterior del proveedor.
