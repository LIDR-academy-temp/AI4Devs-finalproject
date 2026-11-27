# Revisión adversarial

- Fecha: 2026-11-18 22:31 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<repositorio>/openspec/specs/acceso/spec.md` · huella `705671ae49d4` · 20096 caracteres
- Archivo: `<repositorio>/openspec/specs/aviso-inicio/spec.md` · huella `829d8d3115ea` · 14052 caracteres
- Archivo: `<repositorio>/openspec/specs/no-reportados/spec.md` · huella `6c82f95cfc45` · 19417 caracteres
- Archivo: `<espacio-de-trabajo>/05-Tickets/Recorte-Entrega-20261118-v2.md` · huella `9bdfad9a5e99` · 7011 caracteres
- Archivo: `<espacio-de-trabajo>/06-Spec-viva/HU-01.6-prueba-local-20261118-v1.md` · huella `300e2df41965` · 4913 caracteres
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` · huella `84e92c472ace` · 38894 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. Severidad: CRÍTICO
**Qué está mal:** La ejecución recurrente necesita modificar datos sin una sesión personal, pero la especificación de acceso prohíbe toda operación sin sesión salvo la entrada.

**Evidencia:**
- `acceso/spec.md`, requisito **«Sin sesión no se ve ni se registra nada»**:  
  > “DEBE exigir una sesión vigente en toda página y en toda operación, salvo la pantalla de entrada”  
  > “Sin sesión vigente [...] no se registra nada”.
- `no-reportados/spec.md`, requisito **«Protección de la ejecución recurrente»**:  
  > “Solo se ejecuta si la llamada trae un secreto del sistema, que no es la credencial de ninguna persona”.
- El mismo requisito permite que esa llamada ejecute “la clasificación y el correo”, lo que crea `no_reportado` y actualiza `notificado_en`.

**Qué se rompe y cómo:** La ejecución recurrente solo tiene dos resultados posibles: se rechaza por no tener sesión y nunca genera reportes, rompiendo **HU-07.CA-1 y HU-07.CA-15**; o se introduce una excepción no declarada, dejando falso el requisito universal de acceso y su escenario **«operación sin sesión»**.

---

### 2. Severidad: ALTO
**Qué está mal:** Repetir secuencialmente una petición de aviso puede registrar la siguiente asignación pendiente, aunque el requisito afirma que una petición repetida nunca crea otro aviso.

**Evidencia:**
- `aviso-inicio/spec.md`, requisito **«Registrar el aviso»**:  
  > “La petición no dice nada [...] de qué asignación”  
  > “el servidor [...] decide cuál asignación toca”.
- Requisito **«Cuál asignación toca»**, escenario **«la primera ya tiene aviso»**: una vez avisada la asignación de las 08:00, pasa a tocar la de las 14:00.
- Requisito **«Un aviso por asignación y día»**:  
  > “Si la petición se repite, no se crea otro: se devuelve el que existe”.

**Qué se rompe y cómo:** Si el primer toque registra la asignación de las 08:00 y el navegador reintenta después de recibir tarde o perder la respuesta, el servidor recalcula “la que toca” y registra también la de las 14:00. Se rompe el escenario **«toque repetido»** y se generan declaraciones de inicio que la persona no quiso hacer.

---

### 3. Severidad: ALTO
**Qué está mal:** Una asignación cuyo margen vence después de la medianoche puede no ser reportada nunca, contradiciendo el plazo máximo de un intervalo.

**Evidencia:**
- `no-reportados/spec.md`, requisito **«Clasificación de no reportados»**: las condiciones se evalúan “en el día de la asignación” correspondiente al instante de ejecución.
- Requisito **«Recuperación tras una caída»**, escenario **«lo de ayer no se recupera»**:  
  > “no se crea ningún no reportado con fecha de ayer”.
- Requisito **«Ejecución recurrente»**:  
  > “el no reportado queda creado como máximo un intervalo después del vencimiento del margen”.
- La tabla `parametro` solo exige que `margen_minutos` sea mayor que cero; no impide que el vencimiento cruce la medianoche.

**Qué se rompe y cómo:** Con inicio a las 23:30 y margen de 60 minutos, el vencimiento es a las 00:30 del día siguiente. A las 00:35 el sistema evalúa la asignación del nuevo día, cuyo inicio comprometido aún es futuro, y además tiene prohibido recuperar el día anterior. No se crea el reporte, rompiendo el escenario **«plazo»** y **HU-07.CA-15** incluso con el sistema en servicio.

---

### 4. Severidad: ALTO
**Qué está mal:** La política sobre correos repetidos sigue contradiciendo el criterio aprobado y además está pendiente de decisión.

**Evidencia:**
- `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-07.CA-6**:  
  > “no vuelve a salir [...] Única excepción: la recuperación tras una caída”.
- `no-reportados/spec.md`, requisito **«Correo agrupado al supervisor»**, punto **E-5**:  
  > “Si el servicio de correo acepta el mensaje y su confirmación no llega al sistema [...] el correo sale otra vez”  
  > “Es una excepción nueva a HU-07.CA-6”  
  > “propuesta pendiente de la Dirección”.
- Requisito **«Protección de la ejecución recurrente»**, escenario **«llamada repetida»**: exige “los mismos correos que con una sola”.

**Qué se rompe y cómo:** Una pérdida de confirmación, sin caída del sistema, puede producir dos correos para el mismo no reportado. Eso incumple literalmente **HU-07.CA-6** y hace imposible garantizar el escenario **«llamada repetida»** mientras E-5 siga sin decisión.

---

### 5. Severidad: ALTO
**Qué está mal:** Los atributos de seguridad obligatorios de la cookie no tienen ninguna verificación prevista, aunque el propio documento admite que se desconoce cómo la entrega el cliente oficial.

**Evidencia:**
- `acceso/spec.md`, requisito **«Peticiones que vienen de otro sitio»**:  
  > “La cookie de sesión DEBE estar marcada para que no la lea el código de la página y para que solo viaje por conexión cifrada”.
- En el mismo requisito:  
  > “Por comprobar al construir HU-01.2: con qué atributos entrega la cookie el cliente oficial [...] No se ha comprobado”.
- Ninguno de sus escenarios comprueba `HttpOnly` ni `Secure`.
- `Recorte-Entrega-20261118-v2.md`, ticket **H-4**: solo repite P1, P2 y P5; no incluye una inspección de la cookie.

**Qué se rompe y cómo:** La entrega puede quedar aprobada con una cookie legible desde JavaScript o enviada por HTTP. En el primer caso, una inyección de script puede extraer la sesión; en el segundo, puede filtrarse por una conexión sin cifrar. La regla de seguridad existe, pero ningún escenario ni comprobación de despliegue puede detectar su incumplimiento.

---

### 6. Severidad: ALTO
**Qué está mal:** La inmutabilidad de `no_reportado` no está protegida frente a la credencial del sistema, precisamente la identidad que puede omitir todas las reglas de la base.

**Evidencia:**
- `no-reportados/spec.md`, requisito **«El no reportado se conserva»**:  
  > “sus datos [...] no cambian nunca”  
  > “Lo único que cambia [...] es `notificado_en`, una sola vez”.
- Su único escenario negativo es **«ninguna persona lo quita»**; no cubre la credencial del sistema.
- La definición de la tabla `no_reportado` no declara un disparador de inmutabilidad.
- `acceso/spec.md`, requisito **«Separación por organización en la base»**:  
  > “La única identidad que omite las reglas es la credencial del sistema”.
- En contraste, `aviso-inicio/spec.md` sí declara para `aviso_inicio` “un disparador rechaza editar o quitar, para cualquier rol” y prueba explícitamente también la credencial del sistema.

**Qué se rompe y cómo:** Un defecto en la ejecución recurrente podría modificar `detectado_en`, `minutos_retraso`, cambiar dos veces `notificado_en` o borrar una fila usando la credencial del sistema. La base no tiene una protección exigida ni un escenario que detecte el fallo, por lo que no se garantiza **HU-07.CA-14** ni la conservación histórica declarada.

---

### 7. Severidad: MEDIO
**Qué está mal:** La entrega no satisface la parte “consultable en la aplicación” de los criterios que usa como medida del plazo.

**Evidencia:**
- `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-07.CA-15**:  
  > “el reporte queda generado y consultable en la aplicación”.
- **HU-07.CA-10**:  
  > “Mientras tanto el reporte ya está consultable en la aplicación”.
- `no-reportados/spec.md`, alcance:  
  > “Que una persona pueda consultarlo en pantalla espera a HU-10”.
- `Recorte-Entrega-20261118-v2.md`, sección 2: `HU-10.1` y `HU-10.2` están diferidos.

**Qué se rompe y cómo:** El reporte puede existir en la base dentro del intervalo, pero ningún supervisor puede consultarlo en la aplicación. Por tanto, la entrega solo cumple una parte de **HU-07.CA-10 y CA-15**, no los criterios aprobados completos.

---

### 8. Severidad: MEDIO
**Qué está mal:** No existe un escenario que garantice que `aviso_inicio.fecha` sea la fecha del cliente en el instante real de recepción, especialmente alrededor de la medianoche.

**Evidencia:**
- `aviso-inicio/spec.md`, datos de `aviso_inicio`:  
  > “`fecha` es el día de la asignación en que se recibió el aviso”.
- Solo `recibido_en` se protege con un disparador que impone la hora de la base; no se declara una derivación equivalente para `fecha`.
- Requisito **«Registrar el aviso»**: la petición no envía asignación ni hora, pero ningún escenario verifica la fecha almacenada al cruzar una medianoche o con servidor y cliente en fechas distintas.
- `no-reportados/spec.md`, clasificación: busca el aviso “de esa asignación para ese día”.

**Qué se rompe y cómo:** Si el código usa la fecha UTC o la del servidor en vez de la del cliente, un aviso cercano a la medianoche queda asociado al día incorrecto. La clasificación puede reportar como ausente a quien sí avisó y la restricción `UNIQUE (asignacion_id, fecha)` dejaría registrar otro aviso para el mismo día real.

---

### 9. Severidad: MEDIO
**Qué está mal:** El plazo máximo de un intervalo supone que procesar secuencialmente todas las organizaciones tarda prácticamente cero, pero no existe ninguna garantía que lo sostenga.

**Evidencia:**
- `no-reportados/spec.md`, requisito **«Ejecución recurrente»**:  
  > “Las organizaciones se procesan una por una”.
- El mismo requisito promete:  
  > “el no reportado queda creado como máximo un intervalo después del vencimiento”.
- No se fija un límite de organizaciones, tiempo máximo por organización ni presupuesto de ejecución.
- El escenario **«una organización falla»** solo comprueba que se continúe con la siguiente, no cuánto tarda.

**Qué se rompe y cómo:** Si una organización tarda varios minutos en clasificar o enviar correos, las siguientes pueden procesarse después de su intervalo. Con intervalo de cinco minutos, una organización al final de la lista puede incumplir **HU-07.CA-15** aunque el disparador haya comenzado puntualmente.

---

### 10. Severidad: MEDIO
**Qué está mal:** La protección contra peticiones de otro origen no define qué hacer cuando el origen falta o es ambiguo.

**Evidencia:**
- `acceso/spec.md`, requisito **«Peticiones que vienen de otro sitio»**:  
  > “DEBE rechazar toda operación que cambie datos cuando la petición no viene del propio sitio”.
- Solo hay escenarios para **«petición desde otro sitio»** y **«petición desde el propio sitio»**.
- No se cubren peticiones sin cabecera de origen, con origen `null`, desde otro subdominio o con discrepancias entre el origen público y el visto detrás de un proxy.

**Qué se rompe y cómo:** Una implementación que permita peticiones sin origen para no bloquear clientes legítimos deja una vía no cubierta para cambios inducidos; una que las rechace sin distinguir llamadas internas puede volver a bloquear la ejecución recurrente. La regla de seguridad no determina cuál conducta es válida ni dispone de pruebas para esos bordes.
