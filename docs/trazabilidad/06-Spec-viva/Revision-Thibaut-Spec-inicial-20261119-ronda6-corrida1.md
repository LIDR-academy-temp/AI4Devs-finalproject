# Revisión adversarial

- Fecha: 2026-11-19 10:28 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<repositorio>/openspec/specs/acceso/spec.md` · huella `6c4e7cfbaa3c` · 27799 caracteres
- Archivo: `<repositorio>/openspec/specs/aviso-inicio/spec.md` · huella `3d68482f94be` · 22682 caracteres
- Archivo: `<repositorio>/openspec/specs/no-reportados/spec.md` · huella `9263060e4c80` · 25930 caracteres
- Archivo: `<espacio-de-trabajo>/05-Tickets/Recorte-Entrega-20261119-v4.md` · huella `c6d68d085af4` · 8225 caracteres
- Archivo: `<espacio-de-trabajo>/06-Spec-viva/HU-01.6-prueba-local-20261118-v1.md` · huella `300e2df41965` · 4913 caracteres
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` · huella `84e92c472ace` · 38894 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. ALTO — La protección de consultas directas depende de una capacidad no comprobada y de un dato cuya prueba citada no existe

**Qué está mal:** La especificación exige que la base compruebe si una sesión sigue abierta, pero reconoce que no sabe si puede hacerlo y afirma sin respaldo que la prueba local verificó que el pase contiene el identificador de sesión.

**Evidencia:**

- `openspec/specs/acceso/spec.md`, requisito **«Separación por organización en la base»**:
  > “Que el pase trae el identificador de su sesión y el momento de entrada está comprobado (prueba local de HU-01.6).”
  >
  > “Por comprobar al construir HU-03.1: que la base pueda consultar si la sesión [...] sigue abierta en el servicio.”
- `HU-01.6-prueba-local-20261118-v1.md`, resultado **P5**, solo prueba:
  > “El pase trae la marca del momento de entrada y se conserva al renovar.”
  
  No documenta que el pase traiga el identificador de sesión.
- `Recorte-Entrega-20261119-v4.md`, sección **4**, coloca `HU-03.1` en el tramo 2 y la sesión `HU-01.2` en el tramo 4.

**Regla que se rompe y fallo visible:** Se rompe el escenario **«pase de una sesión cerrada o vencida»**. Si la base solo puede validar el pase firmado, un pase aún no expirado podría consultar directamente datos después del cierre de la sesión. Además, el plan construye la barrera de base antes de resolver la capacidad técnica de la que depende.

---

### 2. ALTO — La hora registrada no es necesariamente la hora en que el sistema recibió el toque

**Qué está mal:** El aviso toma su hora después de esperar el candado, aunque el criterio exige la hora de recepción, y se supone sin garantía que la espera siempre dura milisegundos.

**Evidencia:**

- `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-06.CA-2**:
  > “el aviso queda registrado con la hora en que el sistema recibe el toque”
- `openspec/specs/aviso-inicio/spec.md`, requisito **«Registrar el aviso»**, punto 3:
  > “Toma un solo instante, ya con el candado”
  >
  > “Lo que tarda la petición en llegar a la base y en conseguir el candado no se mide: son milisegundos.”

**Regla que se rompe y fallo visible:** Si el toque llega a las 23:59:59 pero espera el candado hasta las 00:00:01, puede quedar en el día siguiente o ser rechazado por pantalla vieja. Del mismo modo, un toque recibido antes del fin del horario o del vencimiento del margen puede clasificarse como tardío o no admitirse. Esto contradice **HU-06.CA-2** y no está cubierto por el escenario **«la petición cruza la medianoche mientras se procesa»**, porque ese escenario solo cruza la medianoche después de haber tomado el instante.

---

### 3. ALTO — Los intervalos permitidos pueden impedir por completo la detección, pese a que se garantiza un máximo de un intervalo

**Qué está mal:** Se permiten intervalos arbitrariamente largos, pero solo se clasifica el día actual; por tanto, una asignación puede no ser procesada después del vencimiento durante su mismo día y no recuperarse nunca.

**Evidencia:**

- `openspec/specs/no-reportados/spec.md`, tabla `parametro`:
  > “CHECK intervalo de 5 o más y múltiplo de 5”
  
  No existe máximo.
- Mismo archivo, requisito **«Clasificación de no reportados»**:
  > “Solo el día en curso de la asignación.”
- Requisito **«Recuperación tras una caída»**, escenario **«lo de ayer no se recupera»**:
  > “no se crea ningún no reportado con fecha de ayer”
- Requisito **«Ejecución recurrente»**:
  > “`detectado_en` [...] queda como máximo un intervalo después del vencimiento”
- `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **PA-B9**:
  > “el intervalo no tiene tope [...] uno de un día entero cumple el plazo «de un intervalo» y anula la detección.”

**Regla que se rompe y fallo visible:** Con un intervalo de un día, si la ejecución diaria ocurre antes del vencimiento, la siguiente ocurre al día siguiente y ya no revisa el día anterior. No aparece ningún `no_reportado`, por lo que fallan el requisito **«Ejecución recurrente»**, su escenario **«plazo»** y el propósito de HU-07. Que el backlog lo acepte como riesgo no elimina la contradicción con la garantía incondicional escrita en la especificación.

---

### 4. ALTO — El plazo máximo de un intervalo ignora cualquier retraso del disparador

**Qué está mal:** La garantía temporal solo limita la duración del procesamiento por organización, pero presupone que el disparador inicia exactamente en el minuto programado.

**Evidencia:**

- `openspec/specs/no-reportados/spec.md`, requisito **«Ejecución recurrente»**:
  > “Un disparador programado llama cada 5 minutos”
  >
  > “`detectado_en` [...] queda como máximo un intervalo después del vencimiento”
- Límite declarado del mismo requisito:
  > “El plazo de un intervalo vale mientras procesar cada organización tarde menos que su intervalo.”
  
  No incluye retrasos del programador ni de la llamada.
- Escenario **«plazo»**:
  > “la diferencia con el vencimiento no pasa de un intervalo”

**Regla que se rompe y fallo visible:** Para un margen que vence a las 09:00 y un intervalo de 5 minutos, una llamada que comienza a las 09:05:01 genera `detectado_en` con más de cinco minutos de diferencia, aunque cada organización tarde solo milisegundos. Falla **HU-07.CA-15** aun con el sistema disponible.

---

### 5. ALTO — La comprobación estructural no define cómo reconoce una “tabla de negocio”

**Qué está mal:** La barrera que debe detectar tablas nuevas sin separación depende de una categoría semántica que no está definida de forma comprobable.

**Evidencia:**

- `openspec/specs/acceso/spec.md`, requisito **«Separación por organización en la base»**:
  > “Una comprobación de estructura DEBE recorrer todas las tablas de negocio”
- Escenario **«tabla nueva sin regla»**:
  > “cuando una migración crea una tabla de negocio sin `organizacion_id` o sin regla [...] la comprobación [...] falla”

No se define un esquema de base, una lista cerrada, una marca ni otra regla que permita distinguir automáticamente tablas de negocio de tablas internas.

**Regla que se rompe y fallo visible:** Una migración puede crear una tabla con datos personales fuera del conjunto que el comprobador considere “de negocio”. La integración continua quedaría verde y esa tabla podría carecer de `organizacion_id` o RLS, permitiendo una fuga entre organizaciones y rompiendo **HU-03.CA-1 a CA-3**.

---

### 6. ALTO — Los riesgos de fuerza bruta y enumeración se consideran cubiertos por un límite por IP que no fue probado

**Qué está mal:** El documento presenta el límite por IP como cobertura efectiva, aunque la prueba citada declara expresamente que no lo comprobó y H-4 tampoco lo incluye.

**Evidencia:**

- `openspec/specs/acceso/spec.md`, introducción:
  > “lo que no se comprobó se dice.”
- Mismo archivo, **«Riesgos aceptados»**:
  > “El servicio limita los intentos de entrada por dirección IP”
  >
  > “Qué lo cubre mientras tanto: El límite por IP del servicio”
- `HU-01.6-prueba-local-20261118-v1.md`, **«Límites de esta prueba»**:
  > “No se probó [...] los límites por dirección IP.”
- `Recorte-Entrega-20261119-v4.md`, ajuste **H-4**: repite P1, P2 y P5, pero no P7 ni una prueba del límite por IP.

**Regla que se rompe y fallo visible:** Si el servicio gestionado no limita, lo hace con una configuración distinta o el límite puede eludirse, quedan sin mitigación tanto los intentos ilimitados de contraseña como la enumeración temporal de correos aceptada en D-77. La cobertura declarada para D-72 y D-77 no está demostrada.

---

### 7. MEDIO — La garantía de correspondencia entre el correo de la base y el del servicio aún no tiene un mecanismo viable

**Qué está mal:** Se exige que la base rechace por sí misma un correo diferente, pero se admite como posible sustitución una validación hecha solo por la carga de arranque.

**Evidencia:**

- `openspec/specs/acceso/spec.md`, requisito **«Un correo, una cuenta, una organización»**:
  > “la base rechaza un usuario cuyo correo no coincida con el de su cuenta en el servicio”
- Inmediatamente después:
  > “Por comprobar [...] que la base pueda leer el correo”
  >
  > “Si no puede, la comprobación la hace la carga de los datos de arranque”
- Escenario **«el correo no es el de la cuenta»**:
  > “la base lo rechaza”

**Regla que se rompe y fallo visible:** Si la base no puede consultar el correo y solo lo valida la carga inicial, una inserción posterior con la credencial del sistema o un cambio del correo en el servicio puede dejar `usuario.correo = B` mientras la cuenta entra con `A`. En ese caso la base no rechaza el estado y falla literalmente el escenario citado.

---

### 8. MEDIO — No está definida la zona horaria que decide cuándo una asignación “ha terminado” para quitar el rol de supervisor

**Qué está mal:** El disparador depende de comparar una fecha de fin con “hoy”, pero no se especifica qué fecha usa pese a que los clientes pueden estar en zonas distintas.

**Evidencia:**

- `openspec/specs/aviso-inicio/spec.md`, tabla `asignacion`:
  > “rechaza quitar ese rol a quien supervisa una asignación que no ha terminado”
- Requisito **«La asignación es coherente en la base»**:
  > “vigente o que todavía no empieza”
- Vocabulario del mismo archivo:
  > “Día de una asignación: la fecha en la zona horaria del cliente”
- Escenario **«quitar el rol a quien supervisa»** solo cubre:
  > “una asignación vigente, o una que empieza mañana”

No hay regla ni escenario para el último día, la medianoche o clientes con zonas distintas.

**Regla que se rompe y fallo visible:** Si el disparador usa la fecha UTC de la base, puede permitir quitar el rol durante la tarde del último día en América, cuando para el cliente la asignación aún no terminó. Quedaría una asignación activa sin supervisor con rol válido, rompiendo la coherencia exigida y el envío posterior del correo.

---

### 9. MEDIO — Dos criterios de borde obligatorios quedan expresamente sin verificación

**Qué está mal:** La entrega afirma reglas de concurrencia y de múltiples asignaciones, pero el propio recorte declara que no se comprobarán.

**Evidencia:**

- `Recorte-Entrega-20261119-v4.md`, sección **«Criterios que este recorte deja sin comprobar»**:
  > “HU-07.CA-16 [...] y CA-20”
- `openspec/specs/no-reportados/spec.md`, **«Riesgos aceptados»**:
  > “la prueba de concurrencia no se escribe en esta entrega”
- `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`:
  - **HU-07.CA-16:** dos asignaciones deben reportarse por separado.
  - **HU-07.CA-20:** aviso y clasificación simultáneos deben producir uno de dos resultados coherentes.
- `openspec/specs/no-reportados/spec.md`, requisito **«Clasificación de no reportados»**, afirma que el candado garantiza el resultado de CA-20.

**Regla que se rompe y fallo visible:** Una regresión podría omitir la segunda asignación o producir simultáneamente un reporte y un aviso puntual, sin que la entrega falle. La unicidad por tabla no demuestra la coherencia cruzada entre `aviso_inicio` y `no_reportado`.

---

### 10. MEDIO — La cobertura exigida de escrituras directas no aparece en los escenarios de la matriz

**Qué está mal:** Se exige un caso permitido y uno rechazado para ver y cambiar cada tabla, pero la regla automática descrita solo comprueba casos de consulta directa.

**Evidencia:**

- `openspec/specs/acceso/spec.md`, requisito **«Reglas por rol en la base»**:
  > “por cada situación, uno que la regla deja pasar y uno que rechaza, para ver y para cambiar”
- Requisito **«Matriz de permisos»**, escenario **«tabla sin sus casos de consulta directa»**:
  > “no tiene [...] su caso permitido y su caso rechazado de consulta directa”
  
  No exige ahí los casos de cambio.
- Los escenarios concretos de cambio solo cubren parcialmente `aviso_inicio`, `no_reportado`, `usuario`, `asignacion` y `parametro`; no se muestran equivalentes para todas las tablas de la tabla de permisos.

**Regla que se rompe y fallo visible:** Una política podría permitir por error actualizar o eliminar `cliente`, `usuario_rol` u `organizacion` dentro de la propia organización sin que la comprobación de “consulta directa” lo detecte. Eso contradice los valores **«Nadie»** de la columna **«Cambia»**.
