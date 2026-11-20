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

### 1. ALTO — La hora definida para el aviso contradice el criterio de producto

**Qué está mal:** el backlog exige guardar la hora en que el sistema recibe el toque, pero la especificación guarda una hora posterior: la del INSERT en la base.

**Evidencia:**

- `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, `HU-06.CA-2`:  
  > «el aviso queda registrado con la hora en que el sistema recibe el toque»
- `aviso-inicio/spec.md`, requisito **«Registrar el aviso»**:  
  > «La hora del aviso es una sola: la de la base al registrarlo»  
  > «la demora entre la llegada de la petición y el registro [...] no se mide aparte»
- `aviso-inicio/spec.md`, tabla `aviso_inicio`:  
  > «un disparador pone al insertar [...] la hora de la base en `recibido_en`»

**Regla que se rompe y fallo observable:** se rompe `HU-06.CA-2`. Si la petición llega a las 09:00:00 pero se inserta a las 09:00:02, el backlog exige puntualidad y la especificación la clasifica como tardía. También cambian los minutos de retraso y potencialmente la fecha.

---

### 2. ALTO — El límite de detección de un intervalo no se deduce del mecanismo programado

**Qué está mal:** terminar el procesamiento antes de la llamada siguiente no garantiza que `detectado_en` quede como máximo un intervalo después del vencimiento.

**Evidencia:**

- `no-reportados/spec.md`, requisito **«Ejecución recurrente»**:  
  > «el no reportado queda creado como máximo un intervalo después del vencimiento del margen»
- Mismo requisito, **«Límite declarado del plazo»**:  
  > «El plazo se cumple mientras procesar todas las organizaciones de una llamada tarde menos de lo que falta para la siguiente»
- Escenario **«plazo»**:  
  > «la diferencia entre el vencimiento y `detectado_en` no pasa de un intervalo»

**Regla que se rompe y fallo observable:** con intervalo de 5 minutos, el margen puede vencer a las 09:00:01, la llamada siguiente comenzar a las 09:05 y esa organización procesarse a las 09:09:59. La llamada todavía termina antes de las 09:10, cumpliendo el límite declarado, pero `detectado_en` queda casi 10 minutos después del vencimiento, incumpliendo `HU-07.CA-15` y el escenario «plazo».

---

### 3. ALTO — Una petición que cruza la medianoche puede registrar el aviso para un día distinto del solicitado

**Qué está mal:** el código valida el día enviado por la pantalla, pero el disparador sustituye la fecha usando otro instante posterior, sin ninguna garantía de atomicidad entre ambos.

**Evidencia:**

- `aviso-inicio/spec.md`, requisito **«Registrar el aviso»**:  
  > «La petición lleva dos datos: la asignación y el día de la asignación que la pantalla le ofreció»
  > «solo se registra [...] el día en curso»
- Mismo requisito:  
  > «Es del consultor y es la que toca en ese instante, el día nombrado: registra el aviso»
- Tabla `aviso_inicio`:  
  > «un disparador pone al insertar [...] en `fecha` el día que esa hora es en la zona horaria del cliente»

**Regla que se rompe y fallo observable:** una petición validada a las 23:59:59 del martes puede insertarse a las 00:00:00 del miércoles. El disparador guardaría `fecha=miércoles` aunque la petición nombró el martes. Podría crear un aviso de miércoles incluso si ese día no es laborable, consumir la unicidad del miércoles o impedir luego su aviso legítimo. El escenario «reintento después de la medianoche» no cubre una primera petición que cruza la medianoche durante su procesamiento.

---

### 4. ALTO — La concurrencia entre aviso y clasificación puede producir un orden que el criterio prohíbe

**Qué está mal:** la unicidad dentro de cada tabla no coordina `aviso_inicio` con `no_reportado`, por lo que ambos procesos pueden comprobar estados distintos y confirmar en un orden incoherente.

**Evidencia:**

- `no-reportados/spec.md`, requisito **«Clasificación de no reportados»**, condición 3:  
  > «No hay aviso de esa asignación para ese día»
- `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, `HU-07.CA-20`:  
  > «o el aviso queda como llegada tardía sin reporte, o queda el reporte y después la llegada tardía»
- `no-reportados/spec.md`, **«Riesgos aceptados»**:  
  > «La unicidad en la base impide filas duplicadas; no está probado que el resultado sea uno de los dos que el criterio admite»
- `Recorte-Entrega-20261119-v4.md`, sección 3:  
  > «Deja fuera [...] la prueba [...] de concurrencia (HU-07.CA-20)»

**Regla que se rompe y fallo observable:** la ejecución puede comprobar que no hay aviso; después el aviso se inserta y confirma; finalmente la ejecución inserta el no reportado. Quedan ambas filas, pero con `aviso.recibido_en < no_reportado.detectado_en`: el reporte se creó después de existir el aviso. No corresponde a ninguno de los dos resultados admitidos por `HU-07.CA-20`. Las dos restricciones `UNIQUE` no impiden este estado.

---

### 5. ALTO — La base no conserva el invariante de que todo supervisor asignado tenga rol de supervisor

**Qué está mal:** el disparador comprueba el rol al modificar la asignación, pero nada impide quitar después el rol y dejar una asignación incoherente.

**Evidencia:**

- `aviso-inicio/spec.md`, tabla `asignacion`:  
  > «un disparador rechaza, al crear o cambiar la asignación, un `supervisor_id` que no tenga el rol `supervisor`»
- Mismo archivo, requisito **«La asignación es coherente en la base»**:  
  > «El sistema DEBE rechazar en la base una asignación cuyo supervisor no tenga el rol `supervisor`»
- Mismo archivo, después de la tabla:  
  > «Quitarle el rol a quien supervisa asignaciones vigentes es una operación que todavía no existe [...] la regla queda escrita para cuando exista»

**Regla que se rompe y fallo observable:** una eliminación o cambio directo en `usuario_rol` no dispara la validación de `asignacion`. La fila queda apuntando a alguien que ya no es supervisor. Esa persona puede seguir siendo destinataria del correo por la relación de asignación, mientras las reglas por rol dejan de reconocerla como supervisor. El requisito titulado «La asignación es coherente en la base» no garantiza realmente el estado que afirma.

---

### 6. MEDIO — Los cinco resultados de «Registrar el aviso» no cubren todos los estados posibles

**Qué está mal:** falta el resultado para una asignación propia, del día nombrado, sin aviso, pero no pendiente.

**Evidencia:**

- `aviso-inicio/spec.md`, requisito **«Registrar el aviso»**:  
  > «Con lo nombrado el servidor hace una de cinco cosas»
- Los cinco casos enumerados son: ya tiene aviso; el día quedó viejo; es la que toca; está pendiente pero no toca; no es suya o no existe.
- Mismo archivo, requisito **«Asignación pendiente de aviso»**: una asignación puede no estar pendiente porque no es laborable, aún no empezó, ya terminó o terminó su horario.
- Escenario **«no hay asignación pendiente»** solo cubre:  
  > «un consultor cuyo horario de hoy ya terminó»

**Regla que se rompe y fallo observable:** si la petición nombra una asignación propia no laborable y existe otra asignación pendiente, no coincide con ninguno de los cinco casos: no tiene aviso, el día no está viejo, no es la que toca y tampoco está pendiente. La respuesta queda indefinida y diferentes implementaciones pueden rechazarla con mensajes distintos o elegir erróneamente la otra asignación.

---

### 7. MEDIO — El borde exacto de las 24 horas de reintento no está definido

**Qué está mal:** no se decide si un no reportado detectado exactamente hace 24 horas todavía se envía o ya venció.

**Evidencia:**

- `no-reportados/spec.md`, tabla `no_reportado`:  
  > «dentro de las 24 horas desde `detectado_en` se intenta»
- Requisito **«Correo agrupado al supervisor»**:  
  > «se hayan detectado en las últimas 24 horas»
- Escenario **«pasó el tope»**:  
  > «detectado hace más de 24 horas»

**Regla que se rompe y fallo observable:** a `detectado_en + 24:00:00` una implementación puede incluirlo usando `<=` y otra excluirlo usando `<`. Como las ejecuciones y detecciones suelen caer en múltiplos de cinco minutos, este borde es alcanzable y determina si se envía un último correo o se cuenta como vencido sin notificar.

---

### 8. MEDIO — Con varias asignaciones sin ninguna pendiente, la pantalla no tiene una selección determinista

**Qué está mal:** se prioriza el tipo de motivo, pero no se decide de cuál asignación se muestran los datos cuando varias tienen el mismo motivo.

**Evidencia:**

- `aviso-inicio/spec.md`, requisito **«Motivo cuando no hay botón»**:  
  > «con más de una asignación y ninguna pendiente se muestra un solo motivo, el primero que aplique»
- Escenario **«ya avisó»**:  
  > «ve que ya avisó y la hora de su aviso»
- Escenario **«cada motivo»** limita expresamente el caso:  
  > «un consultor cuya única asignación»

**Regla que se rompe y fallo observable:** si el consultor ya avisó en dos asignaciones, no se define qué hora —ni qué cliente— debe mostrarse. Dos consultas sobre los mismos datos podrían elegir filas distintas según el plan de consulta, incumpliendo una salida estable.

---

### 9. MEDIO — Un riesgo pendiente de decisión aparece clasificado como aceptado

**Qué está mal:** el documento presenta como «riesgo aceptado» algo que simultáneamente declara pendiente de la Dirección.

**Evidencia:**

- `aviso-inicio/spec.md`, sección **«Riesgos aceptados»**, cambio de hora:  
  > «Con el cambio de hora, un horario que cae entero en la hora que no existe [...] queda con inicio y fin en el mismo instante»
- Decisión de esa misma fila:  
  > «Propuesto, pendiente de la Dirección»

**Regla que se rompe y fallo observable:** no hay una decisión aprobada sobre una asignación cuyo inicio y fin se normalizan al mismo instante. Dependiendo de la interpretación, puede no estar pendiente nunca, vencer inmediatamente o aceptar avisos solo en un instante imposible. Además, solo existe escenario para una hora de inicio inexistente; no hay escenario para una hora repetida ni para el fin inexistente o repetido, aunque el vocabulario fija reglas para ambos.

---

### 10. MEDIO — La prueba de neutralización del correo solo cubre el nombre, no todos los campos declarados peligrosos

**Qué está mal:** la regla exige tratar como texto nombre, cliente y teléfono, pero el único escenario adversarial prueba exclusivamente el nombre.

**Evidencia:**

- `no-reportados/spec.md`, requisito **«Contenido mínimo del correo»**:  
  > «Los textos que vienen de los datos —nombre, cliente, teléfono— se escriben en el correo como texto»
- Escenario **«un nombre con marcas de formato»**:  
  > «un consultor cuyo nombre guardado contiene una etiqueta de enlace»

**Regla que se rompe y fallo observable:** una implementación puede escapar correctamente `nombre` y concatenar sin neutralización el alias del cliente o el teléfono. Todos los escenarios escritos pasarían, pero un cliente con marcas HTML o un teléfono manipulado podría introducir formato o enlaces en el correo, contrariando el propio requisito.

## Sospechas que no pueden confirmarse con los archivos

- **Alcance de la cookie:** solo se exigen las marcas para impedir lectura desde la página y para conexión cifrada. No se declara que sea `HostOnly`, su `Domain`, su `Path` ni un prefijo como `__Host-`. Si la dirección pública comparte dominio con un subdominio no confiable, podría existir fijación o colisión de cookies; los archivos no indican si ese supuesto se da.
- **Políticas de PostgreSQL sobre `usuario`:** la separación por organización y la comprobación de `activo` probablemente requieren consultar `usuario` desde políticas aplicadas a la propia tabla `usuario`. Una implementación directa puede producir recursión de RLS o necesitar una función privilegiada. No se incluye el SQL, por lo que no puede afirmarse que el defecto exista.
