# Revisión adversarial

- Fecha: 2026-11-19 10:15 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<repositorio>/openspec/specs/acceso/spec.md` · huella `2fe4a7e5c79a` · 25019 caracteres
- Archivo: `<repositorio>/openspec/specs/aviso-inicio/spec.md` · huella `ffa4631712c3` · 21020 caracteres
- Archivo: `<repositorio>/openspec/specs/no-reportados/spec.md` · huella `a4b836587026` · 24965 caracteres
- Archivo: `<espacio-de-trabajo>/05-Tickets/Recorte-Entrega-20261119-v4.md` · huella `c6d68d085af4` · 8225 caracteres
- Archivo: `<espacio-de-trabajo>/06-Spec-viva/HU-01.6-prueba-local-20261118-v1.md` · huella `300e2df41965` · 4913 caracteres
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` · huella `84e92c472ace` · 38894 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. CRÍTICO — El plazo máximo de detección es incompatible con saltar ejecuciones simultáneas

- **Qué está mal:** No se puede garantizar que `detectado_en` quede como máximo un intervalo después del vencimiento si una ejecución larga hace que las siguientes salten la organización.
- **Evidencia:**
  - `openspec/specs/no-reportados/spec.md`, requisito **«Ejecución recurrente»**: “`detectado_en` […] queda como máximo un intervalo después del vencimiento”.
  - Mismo requisito, **«Límite declarado del plazo»**: “no se fija un tope de tiempo” para procesar una organización.
  - Requisito **«Protección de la ejecución recurrente»**, punto 5: si una organización ya se está procesando, otra ejecución “la salta”.
- **Regla que se rompe y fallo observable:** Con intervalo de 5 minutos, una llamada de las 09:00 puede retener la organización hasta las 09:12. Las llamadas de 09:05 y 09:10 la saltan. Si el margen venció a las 09:01, la primera detección sería a las 09:15, catorce minutos después, incumpliendo HU-07.CA-15 y el escenario **«plazo»**.

### 2. CRÍTICO — Un pase cerrado o vencido por la aplicación puede seguir autorizando consultas directas a la base

- **Qué está mal:** Las reglas de la base comprueban organización, rol y cuenta activa, pero no que la sesión siga abierta en el servicio ni que no haya vencido `sesion_dias`.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, requisito **«Sesión vigente»**: esas dos comprobaciones se hacen “en cada petición, en el servidor”.
  - Requisito **«Separación por organización en la base»**: la regla de base exige organización y usuario activo, pero no sesión reconocida ni antigüedad de la entrada.
  - Decisión **«Identidad ante la base»**: la consulta se hace con “el pase de la persona”.
  - `HU-01.6-prueba-local-20261118-v1.md`, resultado **P2**: “Validando el pase en local, la ventana es lo que le quede de vida al pase”.
  - `acceso/spec.md`, escenario **«consulta directa a la base»**, que contempla expresamente consultas directas con identidad de usuario.
- **Regla que se rompe y fallo observable:** Después de cerrar sesión, o después de vencer los 30 días controlados por la aplicación, un pase aún criptográficamente válido podría seguir leyendo datos directamente mediante la capa de base. Se rompen **«el pase anterior ya no sirve»** y **«Sin sesión no se ve ni se registra nada»**. Ninguna regla declara que la base sea inaccesible fuera del servidor que consulta al servicio de autenticación.

### 3. ALTO — El reporte puede no existir dentro del plazo que el recorte conserva como obligatorio

- **Qué está mal:** La especificación sustituye el plazo de generación real del reporte por una marca temporal anterior a su inserción y admite una demora adicional sin límite.
- **Evidencia:**
  - `Recorte-Entrega-20261119-v4.md`, sección **«Criterios que este recorte deja sin comprobar»**: de HU-07.CA-15 entra que “el reporte quede generado en el sistema dentro del plazo”.
  - `openspec/specs/no-reportados/spec.md`, **«Límite declarado del plazo»**: la fila existe solo al terminar de procesarse la organización y “no se fija un tope de tiempo”.
  - El escenario **«plazo»** comprueba únicamente el valor de `detectado_en`, no cuándo aparece la fila.
- **Regla que se rompe y fallo observable:** Una llamada puede tener `detectado_en` dentro del intervalo, pero tardar minutos u horas en insertar la fila. Durante ese tiempo el reporte no está generado en el sistema, aunque el escenario declarado pase por usar una hora retroactiva.

### 4. ALTO — Se puede quitar el rol a un supervisor de una asignación futura y dejarla inválida cuando empiece

- **Qué está mal:** La protección inversa solo impide quitar el rol a quien supervisa una asignación actualmente vigente, no una asignación futura.
- **Evidencia:**
  - `openspec/specs/aviso-inicio/spec.md`, tabla `asignacion`: el disparador rechaza quitar el rol a quien supervisa “una asignación vigente”.
  - Requisito **«La asignación es coherente en la base»** y escenario **«quitar el rol a quien supervisa»**: ambos se limitan a una asignación vigente.
  - El mismo archivo afirma: “la base lo mantiene en las dos direcciones”.
- **Regla que se rompe y fallo observable:** Hoy se programa una asignación que comienza mañana y se quita hoy el rol `supervisor` a su supervisor. La eliminación no está prohibida porque la asignación aún no está vigente; mañana pasa a estar vigente con un supervisor sin el rol exigido. La base, por tanto, no mantiene el invariante en las dos direcciones.

### 5. ALTO — Los dos disparadores no garantizan el invariante de supervisor bajo concurrencia

- **Qué está mal:** Comprobar la relación desde dos disparadores separados no impide que una inserción de asignación y una eliminación de rol concurrentes validen estados distintos y ambas confirmen.
- **Evidencia:**
  - `openspec/specs/aviso-inicio/spec.md`, tabla `asignacion`: un disparador comprueba el rol al crear o cambiar la asignación y otro disparador de `usuario_rol` comprueba las asignaciones al quitarlo.
  - Requisito **«La asignación es coherente en la base»**: afirma que la base debe rechazar ambos estados inválidos.
  - No se declara ningún candado, serialización ni restricción diferida compartida para estas dos operaciones.
- **Regla que se rompe y fallo observable:** Una transacción crea una asignación después de ver el rol existente y otra elimina el rol después de no ver todavía la asignación no confirmada. Ambas pueden confirmar y dejar una asignación cuyo supervisor ya no tiene rol `supervisor`.

### 6. ALTO — La garantía de no repetir correos tiene una ventana no resuelta entre el envío y `notificado_en`

- **Qué está mal:** El envío externo y la marca en la base no son atómicos, pero el escenario de llamada repetida presupone que una confirmación aceptada evita necesariamente un segundo correo.
- **Evidencia:**
  - `openspec/specs/no-reportados/spec.md`, requisito **«Correo agrupado al supervisor»**: primero el servicio acepta el mensaje y después los registros quedan marcados con `notificado_en`.
  - Requisito **«Protección de la ejecución recurrente»**, escenario **«llamada repetida»**: si el servicio “aceptó y confirmó”, una repetición debe producir los mismos correos que una sola llamada.
  - La excepción D-82 solo describe que la confirmación no llegue; no cubre que llegue al proceso pero este caiga antes de persistir la marca.
- **Regla que se rompe y fallo observable:** El proveedor acepta y confirma el correo, el proceso cae antes de confirmar la transacción que marca `notificado_en`, y la ejecución siguiente lo envía otra vez. No se declara idempotencia en el proveedor ni otra evidencia persistente que cierre esa ventana.

### 7. ALTO — “Un solo instante” contradice la comprobación tardía del aviso después de adquirir el candado

- **Qué está mal:** Se afirma que todas las condiciones se evalúan en el instante de la llamada, pero la existencia del aviso se comprueba posteriormente contra el estado que haya cuando se obtiene el candado.
- **Evidencia:**
  - `openspec/specs/no-reportados/spec.md`, requisito **«Clasificación de no reportados»**: las condiciones se cumplen “en el instante de la ejecución”.
  - Mismo requisito: el instante de la llamada es “uno solo para todas las organizaciones y asignaciones”.
  - Mismo requisito: “la clasificación comprueba la condición 3 después de tomar” el candado.
- **Regla que se rompe y fallo observable:** La llamada comienza a las 09:05 sin aviso, pero la asignación se procesa a las 09:06 después de que el consultor avisó a las 09:05:30. La comprobación posterior ve el aviso y no genera reporte, aunque en el instante único de las 09:05 sí se cumplían todas las condiciones. El resultado depende del orden y duración del procesamiento, no solo del instante declarado.

### 8. ALTO — La protección por origen no cubre que otro sitio induzca un aviso mediante encuadre

- **Qué está mal:** Comprobar `Origin` evita CSRF directo, pero no evita que otro sitio muestre la aplicación en un marco y engañe a la persona para pulsar el botón real.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, requisito **«Peticiones que vienen de otro sitio»**: pretende rechazar cuando “otro sitio hace que su navegador envíe una petición de aviso”.
  - La única protección declarada es comparar el origen de la petición.
  - No existe requisito de impedir el encuadre de la aplicación ni escenario de interacción inducida desde un marco.
- **Regla que se rompe y fallo observable:** Dentro de un `iframe`, el botón pertenece al propio sistema, por lo que la petición lleva el origen permitido. Otro sitio puede inducir un toque y crear un aviso irreversible, pese al escenario **«petición desde otro sitio»**.

### 9. ALTO — La afirmación de cobertura completa de permisos no está respaldada por la matriz suministrada

- **Qué está mal:** Se afirma que cada fila de permisos tiene casos permitidos y rechazados, pero el material no incluye esa matriz y los escenarios nombrados omiten varias políticas concretas.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, requisito **«Reglas por rol en la base»**: “Cada fila de esta tabla tiene sus casos […] en la matriz de permisos”.
  - Requisito **«Matriz de permisos»**: exige una fila por operación y casos directos por tabla.
  - Los escenarios visibles del supervisor y de dirección consultan `aviso_inicio`, `asignacion` y `no_reportado`, pero no ejercitan, por ejemplo, el acceso de un supervisor a `cliente`, `usuario_rol`, `parametro` u `organizacion`.
  - No se adjunta ningún archivo que contenga la matriz afirmada.
- **Regla que se rompe y fallo observable:** Una política demasiado amplia sobre `cliente` o `usuario_rol` dentro de la misma organización podría permitir datos de compañeros y aun así pasar todos los escenarios concretos incluidos en los archivos.

### 10. MEDIO — El correo agrega una fecha que el criterio de producto prohíbe agregar

- **Qué está mal:** La especificación añade un sexto dato al correo aunque el backlog dice que debe llevar solo los cinco datos de HU-07.CA-2.
- **Evidencia:**
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-07.CA-17**: el correo “lleva solo los datos de HU-07.CA-2”.
  - HU-07.CA-2 enumera nombre, cliente, hora comprometida, minutos de retraso y teléfono.
  - `openspec/specs/no-reportados/spec.md`, requisito **«Contenido mínimo del correo»**: agrega `fecha` y dice “solo estos seis datos”.
  - La justificación aparece como **«Decidido aquí»**, sin una decisión de Dirección que modifique HU-07.CA-17.
- **Regla que se rompe y fallo observable:** El correo contiene un campo adicional a los permitidos por el criterio aprobado. Aunque la fecha no sea especialmente sensible, contradice literalmente la minimización expresada con “solo”.

### 11. MEDIO — El comportamiento de cambios de hora sigue sin decisión aprobada ni cobertura suficiente

- **Qué está mal:** La especificación usa una regla para horas inexistentes o repetidas, pero reconoce que horarios completos pueden colapsar y que la decisión sigue pendiente.
- **Evidencia:**
  - `openspec/specs/aviso-inicio/spec.md`, **«Vocabulario — Cambio de hora»**: fija cómo elegir el instante para horas inexistentes y duplicadas.
  - `Riesgos aceptados`: un horario 02:30–02:45 puede quedar con inicio y fin en el mismo instante; tampoco hay escenarios para hora repetida ni fin inexistente.
  - La decisión figura como **«Propuesto, pendiente de la Dirección»**, no como riesgo aceptado.
- **Regla que se rompe y fallo observable:** En un salto horario, una asignación puede tener inicio y fin efectivos iguales pese al `CHECK hora_fin > hora_inicio`. Queda indefinido si puede avisar, cuándo termina y cuándo debe reportarse; tampoco hay escenario que detecte esa inconsistencia.

## Sospecha separada

- **Lecturas entre orígenes:** la comprobación de `Origin` se exige solo para operaciones que cambian datos. No se declara ninguna política CORS para las lecturas autenticadas. No hay evidencia de que el despliegue habilite CORS con credenciales, por lo que no puede afirmarse una fuga actual; si lo hiciera, otro origen podría leer datos sin infringir la regla escrita sobre operaciones de cambio.
