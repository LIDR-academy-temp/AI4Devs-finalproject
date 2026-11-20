# PRD — MVP del Controlador de Tiempo

> **Versión 8 · jueves 19/11/2026 · incorpora las decisiones D-69 a D-89.** De la v7 a la v8
> (cierre de la especificación inicial, D-86 a D-89): RF-8 (el rol de supervisor no se quita
> mientras supervise una asignación que no ha terminado; el consultor tiene su rol, y un supervisor
> o una dirección con asignación propia lleva los dos: D-86, D-88) · RF-10 (el correo lleva los no
> reportados sin notificar, y va en texto sin formato: D-86) · RNF-3 (límite declarado del plazo,
> D-84, D-86) · RA-10 y RA-11 (el límite por IP está documentado, no probado) · RA-15 nuevo y una
> fila nueva en «Sale del MVP y queda contemplado» (D-87). No cambia el número de requisitos. La
> especificación inicial quedó aprobada el 19/11/2026 (D-89).
> **Texto de la versión 7:** incorporaba las decisiones D-69 a D-85. De la v6 a la v7
> (comprobación de HU-01.6, recorte de la entrega y especificación inicial): RF-1 (cerrar la sesión
> corta de inmediato, D-76) · RF-6 (sin ninguna asignación, D-84) · RF-8 (el supervisor tiene ese
> rol, D-84) · RF-10 (correo repetido si se pierde la confirmación, D-82; reintento hasta 24 horas
> y fecha en el correo, D-84) · RF-13 (el no reportado no se altera, D-80) · RF-14 (sesión por
> organización controlada por el sistema, enlace de 24 horas, fecha de la organización en su zona
> horaria: D-69, D-70, D-81) · RF-25 (enlace de 24 horas, D-70) · R-1 (recorte y meta interna,
> D-73, D-75) · seis filas nuevas en «Sale del MVP y queda contemplado» y una precisada · RA-6
> ampliado y RA-10 a RA-14 nuevos (D-72, D-77, D-79, D-85). No cambia el número de requisitos. **Para la entrega del curso se construye un recorte
> de este MVP** (D-73): `../05-Tickets/Recorte-Entrega-20261119-v4.md`. Este documento sigue
> describiendo el MVP completo.
> **Texto de la versión 6:** incorporaba las decisiones D-42 a D-68. De la v5 a la v6
> (tercera ronda del backlog, D-65 a D-68): RF-1 (fijar contraseña cierra las demás sesiones; un
> correo, una cuenta) · RF-2 (lo ajeno dentro de la organización responde como inexistente) · RF-9
> (el instante exacto del vencimiento es puntual) · RF-13 (aviso posterior solo mientras dure el
> horario) · RF-21 (todo texto del Excel es texto) · RF-25 (enlace más reciente, cuenta
> desactivada, correo repetido, varios dominios) · RNF-7 (alcance). No cambia ningún total.
> **Texto de la versión 5:** incorporaba las decisiones D-42 a D-64. La refutación del
> PRD se cerró en la v3; las versiones 4 y 5 recogen lo que precisaron después la refutación del
> README v2 (D-42 a D-48), las dos rondas del backlog (D-49 a D-56) y las decisiones de cierre del
> backlog (D-57 a D-64).
> **Qué cambió de la v4 a la v5:** RF-1 (sesión, cierre y mensaje de entrada) · RF-2 (más de un
> rol; mensaje de rechazo) · RF-3 (lo ajeno responde como inexistente) · RF-4 (cliente del aviso;
> sin confirmación falsa) · RF-8 (supervisor distinto del consultor) · RF-10 (sin novedades no
> sale correo) · RF-11 (consulta sin resultados; al consultor no se le muestra que fue reportado)
> · RF-14 (cuatro parámetros, por script) · RF-24 (sin correos al desactivado) · RF-25 (enlace,
> recuperación y traza de la carga inicial) · sección 3 (intención de la llamada) · una fila nueva
> y una ampliada en «Sale del MVP y queda contemplado» · RA-8 ampliado y RA-9 nuevo. No cambia el
> número de requisitos.
> Paso 3 del método (PROMPTS 5, 6 y 6b). Fuentes: `../02-Alcance/Propuesta MVP Controlador de Tiempo-20260910-v2.html`
> y las decisiones **D-1 a D-89** de `../01-Discovery/discovery-controlador-tiempo.md`.
> Este documento es de **producto**: dice qué debe hacer el sistema y para quién, no cómo se construye.
> Lo que es supuesto y no decisión va marcado **[SUPUESTO]**. Documento anonimizado: los clientes
> aparecen como `Cliente A`…, las empresas como `Proveedor A` y `Proveedor B`.
> **Qué cambió:** las respuestas a la ronda 1 (18 hallazgos) están en
> `Respuesta-Revision-Thibaut-PRD-v1-20261116-ronda1.md` y las de la ronda 2 (32 hallazgos, 17 temas)
> en `Respuesta-Revision-Thibaut-PRD-v2-20261117-ronda2.md`. Las decisiones nuevas de la v3
> fueron D-35 a D-41.
> **Qué cambió de la v3 a la v4:** RF-2 (el aviso no se corrige, D-49) · RF-4 (hora del aviso,
> D-55) · RF-6 (aviso antes de la hora de inicio, D-44) · RF-10 (resumen por destinatario y al
> terminar la jornada, D-42 y D-43; qué recibe la dirección, D-53) · RF-15 (descripción obligatoria
> y ticket con clave, D-46) · RF-24 (cuentas que no se pueden desactivar, D-52) · RF-25 (carga
> inicial y primera credencial, D-50) · RNF-3 (qué mide el plazo, D-51) · cuatro filas nuevas en
> «Sale del MVP y queda contemplado» (D-48 y D-54) · riesgo aceptado RA-8 (D-54). No cambia el
> número de requisitos.

**Totales de este documento:** 4 épicas · 25 identificadores de requisito funcional (RF-1 a RF-25),
de los cuales 24 están vigentes, todos necesarios, y 1 está retirado (RF-16) · 8 requisitos no
funcionales (RNF-1 a RNF-8) · 7 restricciones · 5 métricas · 2 supuestos · 2 puntos abiertos ·
15 riesgos aceptados · 26 filas en «Sale del MVP y queda contemplado».

---

## 1. Problema y contexto

Dos empresas de consultoría (Proveedor A y Proveedor B) asignan consultores a bancos y entidades
financieras bajo contratos con horario comprometido. La necesidad apareció en tres clientes y no es
de un proyecto: es capacidad operativa del servicio. Son **dos dolores distintos**:

| | Presencia y puntualidad | Actividad |
|---|---|---|
| Por qué duele | Nos enteramos **por el cliente** de que un consultor no asistió o no se conectó. Cuesta reputación | Sin sustento de actividad no se puede facturar. En uno de los países donde se opera es exigencia legal |
| Qué necesita | Detección oportuna: hoy, no al cierre del mes | Evidencia con trazabilidad y aprobación |
| Si falla | Se pierde reputación | No se factura |

**El reencuadre que guía el producto:** el primer dolor no es de registro, es de **detección**. Una
hoja de horas que se llena al cierre deja que el cliente siga avisando primero. El producto es
*saberlo antes que el cliente*; el registro es el subproducto.

**Lo que hay hoy:** tres modelos que conviven sin hablarse —plantillas de asistencia en Excel, un
reporte mensual de imputación por porcentaje y un catálogo de actividades diseñado y sin
implementar—, más una herramienta comercial de registro de horas.

**Por qué este MVP está recortado.** La primera versión del alcance tenía nueve capacidades. La
revisión de la entrega 1 del curso señaló que era demasiado para el plazo. La Dirección lo recortó
al núcleo del primer dolor más lo mínimo del segundo (D-18).

## 2. Usuarios y trabajos por hacer

| Usuario | Trabajo que necesita resolver | En el MVP |
|---|---|---|
| **Consultor asignado** — usuario primario | «Cuando empiezo a trabajar, quiero avisarlo sin pensar en nada más.» · «Cuando termino una tarea, quiero dejar constancia en segundos.» | Sí |
| **Supervisor** | «Cuando alguien de mi equipo no ha avisado al vencer el margen, quiero saberlo enseguida para llamarlo antes de que llame el cliente.» · «Al cierre del mes, quiero aprobar lo que respalda la factura.» | Sí |
| **Dirección** | «Quiero el respaldo de la factura sin armarlo a mano, y saber qué pasó con quien no se reportó.» | Sí |
| Contraparte del cliente | Dar conformidad a las horas | No: recibe el archivo exportado, como hoy |

**La condición que manda sobre todo lo demás:** el consultor no gana nada registrando; el valor lo
cobran las empresas. Si el incentivo es externo, la adopción depende de que registrar **no cueste
nada**. La fricción mínima es restricción de diseño, no aspiración (D-3, D-4).

## 3. Propuesta de valor

- **Para el supervisor y la Dirección:** el silencio de un consultor se convierte en una lista con
  nombre y teléfono **al vencer el margen**. Se llama antes de que llame el cliente. La lista trae
  solo a quienes siguen pendientes, que es lo que apremia (D-35). **La llamada es para saber si la
  persona está bien: esa es la intención primaria del reporte** (D-62). El producto detecta el
  silencio para cuidar a la persona y al servicio, no para vigilar.
- **Para el consultor:** avisar cuesta un toque, y es un acto separado del registro de actividad. A
  la hora de empezar no tiene que decidir en qué va a trabajar.
- **Para la facturación:** un solo acto de registro, por proyecto y actividad, alimenta un formato
  único de reporte, aprobado y exportable, que acompaña la factura mensual.

**Lo que no es:** no es un motor de facturación (se factura por otra vía; el sistema produce el
respaldo) ni un sistema de notificaciones en tiempo real.

## 4. Alcance y fuera de alcance

### Dentro del MVP

1. Acceso con cuenta propia y separación entre organizaciones.
2. Aviso de inicio de actividades en un toque.
3. Reporte de no reportados, con anotación del motivo y resumen final del día.
4. Registro de actividad por proyecto, contra un catálogo.
5. Envío del período mensual y aprobación en un solo paso.
6. Formato único de reporte, exportable a Excel.
7. Trazabilidad de todo lo anterior.

### Sale del MVP y queda contemplado

| Qué sale | Qué lo cubre mientras tanto | Decisión |
|---|---|---|
| Solución móvil (iOS y Android) que recuerda el aviso al consultor y notifica los no reportados a los designados | El correo agrupado por ejecución y el resumen final; el consultor avisa desde la aplicación web en su teléfono | D-36 |
| Exportación a PDF | El Excel conserva la red de seguridad | D-18 |
| Bloqueo del período aprobado y reapertura con motivo | El período aprobado admite correcciones trazadas y queda marcado; el ajuste final se hace en el Excel antes de facturar | D-18, D-32 |
| Descripción breve del cambio al corregir un período aprobado | La marca «aprobado con cambios posteriores» y la traza con valor anterior y nuevo | D-32 |
| Registro de ausencias (vacaciones, incapacidad, permiso) | Quien está ausente aparece en el reporte y se anota el motivo con su categoría | D-18, D-22 |
| Ida y vuelta de observaciones entre supervisor y consultor | Aprobación en un solo paso | D-18 |
| Sección «De vacaciones» en el reporte, con quienes tienen ese estatus | La categoría del motivo | D-22 |
| Cambiar la zona horaria en una asignación concreta | Toda asignación usa la zona de su cliente | D-20 |
| Acceso de aplicaciones externas al sistema | Solo la aplicación web | D-23 |
| Proyectos llave en mano: el consultor tiene fecha de entrega y solo registra actividades, sin aviso | No se atienden en este entregable | D-30 |
| Observar el cambio de modalidad de un día concreto, para informar al cliente | La modalidad que el consultor indica en cada registro de actividad | D-31 |
| Seguimiento semanal de quién no ha registrado sus actividades, y reconocimiento a quienes van al día | La lista de días sin registro que el sistema muestra al enviar el mes | D-33, D-38 |
| Pantalla para consultar la traza | Consulta técnica a pedido de la Dirección | D-41 |
| Horarios que cruzan la medianoche | No se admiten: toda asignación tiene su horario dentro de un mismo día | D-41 |
| Fecha por zona horaria del cliente para el resumen final y para la entrada en vigor de los parámetros | El día de la organización, en la zona horaria propia de la organización (D-81); con clientes en zonas distintas puede haber un desfase de horas | D-48, D-81 |
| Calendario de festivos por cliente | Un festivo que sea día laborable de la asignación reporta a sus consultores, y se anota el motivo | D-48 |
| Control del texto del motivo para que no lleve detalle médico | La categoría «incapacidad» y la instrucción a quien anota | D-48 |
| Tope del margen y del intervalo según el horario de cada asignación | Los fija la dirección y valen 60 y 5 minutos | D-54, D-58 |
| Pantalla para cambiar los parámetros | Se cambian por script, a pedido de la dirección | D-64 |
| Limitar los intentos de entrada por cuenta, o pedir la comprobación de «no soy un robot» | El límite por dirección IP del servicio de autenticación (RA-10) | D-72 |
| Igualar el tiempo de respuesta de la entrada, para que no delate si un correo tiene cuenta | El mensaje es el mismo; el límite por dirección IP (RA-11) | D-77 |
| Calcular el vencimiento del margen con fecha y hora completas, para que el cambio de día no importe | Ninguna asignación empieza cerca de la medianoche (RA-12) | D-79 |
| Evitar del lado del servicio de correo el correo repetido cuando se pierde su confirmación, si el proveedor lo admite | Se prefiere el correo repetido a un silencio (RA-6) | D-82 |
| Una regla para el horario que el cambio de hora deja sin duración, y escenarios de la hora que se repite | Los clientes actuales están en zonas sin horario de verano (RA-13) | D-85 |
| Que el sistema anote su propio momento de entrada, sin depender de un campo del servicio de autenticación | La prueba en el despliegue; sin ese campo la sesión vence (RA-14) | D-85 |
| Corregir el correo mal capturado de una cuenta en una sola operación, que cambie a la vez la cuenta del servicio de autenticación y el correo que guarda el sistema | Los correos no se cambian; el sistema no ofrece cambiarlo (RA-15) | D-87 |

### Fuera del MVP, explícito

Notificación en tiempo real y escalamiento · conexión con las herramientas del cliente, de lectura
o de escritura · evidencia desde repositorios de código · conformidad del cliente dentro del sistema
· administración de varias empresas y cobro del servicio · migración del histórico · indicadores y
tableros · geolocalización · motor de facturación · pantallas de administración (D-34).

## 5. Épicas del MVP

| Épica | Nombre | Qué agrupa |
|---|---|---|
| **E1** | Acceso y separación | Cuentas, roles, la frontera entre organizaciones y la carga de los datos de arranque |
| **E2** | Presencia | El aviso de inicio, el reporte de no reportados, la anotación del motivo y el resumen final |
| **E3** | Actividad y aprobación | El registro de actividad, el período y su aprobación |
| **E4** | Respaldo de facturación | El formato único de reporte, su exportación y la trazabilidad |

Orden de construcción: E1 → E2 → E3 → E4. E2 va antes que E3 porque resuelve el primer dolor.

## 6. Requisitos funcionales

Todos los requisitos vigentes son **necesarios** para el MVP. RF-16 está retirado.

### E1 · Acceso y separación

| # | Requisito |
|---|---|
| RF-1 | Solo una persona con cuenta activa y sesión iniciada puede usar el sistema. Sin sesión no se ve ni se registra nada. La sesión dura 30 días sin volver a escribir las credenciales (D-60) y la persona puede cerrarla; cerrada, deja de servir de inmediato (D-76). Si las credenciales no son correctas, el mensaje es el mismo exista o no la cuenta (D-59). Fijar una contraseña nueva cierra las demás sesiones abiertas de esa cuenta (D-65). Un correo identifica una sola cuenta en todo el sistema: quien trabaje para dos empresas tiene dos cuentas, cada una con el correo de su empresa (D-66). |
| RF-2 | Hay tres roles (D-40). El **consultor** ve, registra y corrige solo lo propio, y envía su período; el aviso de inicio es la excepción: no se corrige ni se quita (D-49). El **supervisor** ve lo de los consultores que supervisa, anota motivos, aprueba y exporta. La **dirección** ve todo lo de su organización y puede, además de lo que hace el supervisor, cargar datos, desactivar cuentas y cambiar parámetros. Nadie más puede hacer esas operaciones. Una persona puede tener más de un rol: un supervisor o una dirección con asignación propia avisa, registra y envía lo suyo como cualquier consultor, y al abrir la aplicación ve primero el botón de aviso (D-56, D-59). Cuando la persona intenta una operación que su rol no permite, ve un mensaje que lo dice y nada cambia (D-59). Un dato ajeno que no puede ver responde como si no existiera, también dentro de su organización (D-67). |
| RF-3 | Todo dato pertenece a una organización. Un usuario nunca ve ni modifica datos de otra organización, sea cual sea su rol. Ante el intento de abrir un dato ajeno, el sistema responde igual que si ese dato no existiera (D-59). |
| RF-24 | La dirección puede desactivar una cuenta. Desde ese momento la persona no puede entrar ni seguir usando una sesión que tuviera abierta, deja de recibir correos del sistema, y sus asignaciones como consultor terminan ese día. Si era supervisor, la dirección recibe sus reportes y aprueba sus períodos hasta que se cargue otro supervisor. Lo que registró se conserva. La dirección no puede desactivar su propia cuenta ni la última cuenta de dirección activa de la organización (D-52). |
| RF-25 | Clientes, proyectos, asignaciones, usuarios y catálogo los carga la dirección mediante una carga controlada, sin pantallas de administración (D-34). La carga valida los datos, rechaza los que no cumplen e informa qué quedó cargado. La carga inicial crea la organización y su primera cuenta de dirección: la ejecuta quien instala el sistema, fuera de la aplicación, y queda trazada con actor «sistema» y con el nombre de quien la ejecutó (D-50, D-57). Cada cuenta nueva recibe por correo un enlace para fijar su contraseña (D-50). El enlace es de un solo uso, dura 24 horas y deja de servir si la cuenta se desactiva (D-59, D-63, D-70). También deja de servir cuando se pide uno más reciente o cuando ya se fijó una contraseña nueva. Quien olvida su contraseña pide desde la pantalla de entrada un enlace igual (D-61); si la cuenta no existe o está desactivada no se envía ningún correo, y la respuesta en pantalla es la misma. La carga rechaza un correo que ya pertenece a otra cuenta, y no ata la organización a un dominio de correo: una misma empresa puede usar varios (D-66). Un proyecto o una actividad del catálogo se desactiva; no se borra ni se renombra, y los registros que lo usaron lo conservan tal como era (D-40). |

### E2 · Presencia

| # | Requisito |
|---|---|
| RF-4 | Un consultor con una asignación pendiente de aviso hoy ve, al abrir la aplicación, un único botón con el texto «Inicio de Actividades», igual para toda modalidad (D-31). Un toque registra el aviso con la hora en que el sistema lo recibe, no la del reloj del teléfono (D-55), y lo confirma. El botón corresponde a la primera asignación del día que aún no tiene aviso y cuyo horario no ha terminado (D-40); si el consultor tiene dos, el botón muestra de qué cliente es. Si el aviso no llega a registrarse, la aplicación lo dice y permite reintentar: nunca confirma un aviso que no existe (D-59). |
| RF-5 | Hay un solo aviso por asignación y día. Si el consultor vuelve a tocar, no se crea otro: ve el que ya existe. |
| RF-6 | Si el consultor no tiene una asignación pendiente de aviso (no tiene ninguna asignación, fin de semana, asignación terminada o aún no iniciada, ya avisó, o el horario de hoy ya terminó), no ve el botón y ve el motivo (D-84). «Aún no iniciada» se refiere a la vigencia de la asignación, no a la hora: el aviso se acepta antes de la hora de inicio comprometida, desde que empieza el día en la zona horaria del cliente (D-44). |
| RF-7 | El aviso no pide proyecto, actividad ni descripción. |
| RF-8 | Una asignación une a un consultor con un cliente (D-30). Tiene un horario comprometido (hora de inicio, hora de fin y días laborables) tomado del contrato y contenido en un mismo día, una modalidad (presencial, teletrabajo o híbrida), un supervisor y una contraparte del cliente. Las horas se interpretan en la zona horaria del cliente. Un consultor tiene normalmente una asignación; se admite otra solo si su horario no se cruza con el de la primera, y la carga rechaza la que se cruce. El supervisor de una asignación es una persona distinta de su consultor; la carga rechaza la que nombre a la misma en los dos lugares (D-59). El supervisor tiene el rol de supervisor, y no se le quita mientras supervise una asignación que no ha terminado, vigente o futura (D-84, D-86). Lo mismo el consultor con el rol de consultor: un supervisor o una dirección con asignación propia lleva también ese rol (D-88). |
| RF-9 | En un día laborable de la asignación, quien no ha avisado cuando corre la primera ejecución posterior al vencimiento del margen entra en el reporte de no reportados. Quien avisó dentro del margen no entra; el instante exacto en que vence el margen cuenta como dentro (D-68). Quien avisó después del margen pero antes de esa ejecución tampoco entra en la lista: su aviso queda marcado como llegada tardía (RF-13). El reporte lista solo a quienes siguen pendientes (D-35). |
| RF-10 | Las ejecuciones se repiten cada intervalo. En cada una, cada supervisor recibe **un solo correo** con todos sus no reportados sin notificar, no uno por persona, y cada no reportado sale una sola vez por asignación y día. Cada asignación del día deja de revisarse cuando queda clasificada: con aviso o como no reportada. Si en una ejecución un supervisor no tiene no reportados sin notificar, no recibe correo (D-59, D-86). El correo va en texto sin formato: nada de lo que traigan los datos se muestra como enlace ni como imagen (D-86). La dirección no recibe el correo de cada ejecución, salvo cuando suple a un supervisor desactivado (D-53). El correo que no llega a salir se reintenta en la ejecución siguiente (D-51), hasta 24 horas después de detectado el no reportado, borde incluido; pasado ese tope deja de intentarse y queda contado en el registro de la ejecución (D-84). Cada no reportado del correo lleva su fecha, porque un reintento puede juntar dos días (D-84). Si el servicio de correo acepta un mensaje y su confirmación no llega al sistema, el correo se repite en la ejecución siguiente: se prefiere un correo repetido a un silencio (D-82, RA-6). Cuando todas las del día en la organización quedan clasificadas y además terminó el horario de la última (D-43), sale por correo un **resumen final**, con los no reportados y su motivo si ya se anotó, las llegadas tardías en sección aparte y el total de avisos a tiempo (D-29, D-36). El resumen se arma por destinatario: cada supervisor recibe solo el de sus supervisados, y la dirección el de toda la organización (D-42). |
| RF-11 | Por cada no reportado el reporte muestra nombre, cliente, hora comprometida, minutos de retraso y teléfono de contacto. Queda consultable en la aplicación por fecha, junto con las llegadas tardías: el supervisor ve sus asignaciones y la dirección las de su organización. El consultor no accede al reporte, y la aplicación no le muestra que fue reportado: él ya sabe que no avisó (D-62). Si en la fecha consultada no hubo no reportados ni llegadas tardías, la aplicación lo dice; no muestra una pantalla vacía (D-59). |
| RF-12 | El supervisor o la dirección anotan el motivo de cada no reportado: una categoría (vacaciones, incapacidad, permiso, tardanza, falla técnica, otro) y un texto. El texto no lleva diagnóstico ni detalle médico; eso se maneja aparte, fuera del sistema. Queda quién lo anotó y cuándo. |
| RF-13 | Toda llegada tardía se conserva con sus minutos de retraso, en sus dos casos: quien avisó tarde antes de ser reportado, y quien fue reportado y avisó después, cuyo registro del reporte no se borra ni se altera, por nadie y tampoco por el propio sistema (D-22, D-35, D-80). El aviso posterior solo es posible mientras el horario del día no haya terminado (RF-6); después, quien no avisó queda como no reportado ese día. |
| RF-14 | El margen y el intervalo son parámetros, uno de cada uno por organización (D-39). Valores iniciales: 60 y 5 minutos. El margen es un entero positivo; el intervalo, de 5 minutos como mínimo y en múltiplos de 5. Los cambia la dirección sin modificar el sistema; el cambio aplica desde el día siguiente, contado en la zona horaria propia de la organización (D-81), y queda registrado con quién, cuándo, valor anterior y valor nuevo. Son también parámetros la duración de la sesión (30 días, D-60) y la del enlace de contraseña (24 horas, D-70). En el MVP los cuatro se cambian por script, a pedido de la dirección, sin pantalla (D-64). La duración de la sesión la controla el sistema y puede ser distinta por organización (D-69); la del enlace es una sola para todo el sistema, porque la fija el servicio de autenticación para todos sus enlaces (D-70). |

### E3 · Actividad y aprobación

| # | Requisito |
|---|---|
| RF-15 | El consultor registra su actividad con: asignación (implícita si tiene una sola; la elige si tiene dos), fecha, hora de entrada (propuesta a partir del aviso de ese día), hora de salida, modalidad, **proyecto** del cliente (puede ser «Soporte a Producción»), **actividad** del catálogo, **ticket** opcional (clave y título de la tarea o del incidente; si se pone, la clave es obligatoria), descripción breve, que es obligatoria, y tipo de hora (ordinaria o extra) (D-37, D-46). El sistema calcula las horas. No se acepta: una salida igual o anterior a la entrada, un registro que se cruce con otro del mismo consultor, una fecha u hora futura, ni una fecha fuera de la vigencia de la asignación. El consultor puede editar o quitar sus registros. |
| RF-16 | *Retirado en la v3.* La referencia del cliente, que era deseable, se funde con el ticket de RF-15 (D-37). |
| RF-17 | El catálogo tiene actividades transversales y actividades propias de cada cliente. El consultor ve solo los proyectos y las actividades activos que aplican al cliente de su asignación. |
| RF-18 | El período es el mes calendario, y hay uno por asignación (D-33). El consultor ve su período con las horas por día y el total, y puede enviarlo a su supervisor desde el último día laborable del mes. Al enviar, el sistema le muestra los días laborables sin registro, sin impedir el envío. Si un período enviado cambia antes de aprobarse, vuelve a «sin enviar» (D-38). |
| RF-19 | El supervisor de la asignación, o la dirección, aprueba un período enviado en un solo paso. Queda quién aprobó y cuándo. Nadie aprueba su propio período. |
| RF-20 | Un período aprobado no queda bloqueado: admite correcciones del consultor. Corregir es agregar, editar o quitar un registro. Con la primera corrección posterior a la aprobación el período pasa a «aprobado con cambios posteriores», y toda corrección queda trazada. No se exige una nueva aprobación (D-32, D-40). |

### E4 · Respaldo de facturación

| # | Requisito |
|---|---|
| RF-21 | El supervisor o la dirección exportan el período de una asignación a un archivo de Excel con el formato único: encabezado (empresa, cliente, consultor, supervisor, contraparte del cliente, período y horario comprometido), detalle diario (fecha, proyecto, actividad, ticket, descripción y horas), resumen y espacio de conformidad para tres firmas. El archivo indica a la vista el estado del período: sin enviar, enviado, aprobado o aprobado con cambios posteriores, este último con la fecha del último cambio. Solo el de un período aprobado sirve de respaldo de factura; el de uno con cambios posteriores lo declara, y presentarlo es decisión de la dirección (RA-2). Todo texto del archivo —nombres, proyecto, actividad, ticket y descripción— se escribe como texto y nunca se interpreta como fórmula. |
| RF-22 | El resumen calcula: las horas y el porcentaje por proyecto, sobre el total de horas del período; las horas por actividad; y los totales de horas ordinarias y extras del mes. Ninguno se teclea. Si el período no tiene horas, el porcentaje no se calcula (D-10, D-37). |
| RF-23 | Queda registro de quién avisó, registró, corrigió, envió, aprobó, anotó, exportó, cargó datos, desactivó una cuenta o cambió un parámetro, y cuándo. En las correcciones y en los cambios de parámetro se guarda el valor anterior y el nuevo. Ese registro no se puede modificar ni borrar desde la aplicación. |

## 7. Requisitos no funcionales

| # | Requisito |
|---|---|
| RNF-1 | **Fricción.** Con sesión vigente, avisar toma menos de 5 segundos desde abrir la aplicación hasta la confirmación; registrar una actividad, menos de 60 segundos. En el MVP se comprueba por observación con usuarios, no por medición automática. |
| RNF-2 | **Dispositivo.** Aplicación web que se usa bien desde el teléfono; el aviso se diseña primero para teléfono, y el consultor puede dejar el acceso directo en su pantalla de inicio. No hay aplicación que instalar. |
| RNF-3 | **Oportunidad.** Con el sistema en servicio, el reporte de no reportados queda generado y consultable en la aplicación con un retraso máximo de un intervalo sobre el vencimiento del margen (D-21, D-29, D-51). Se mide que el reporte exista en el sistema, no la entrega del correo (RA-3): el correo que no llega a salir se reintenta en la ejecución siguiente y no incumple este plazo. **Límite declarado (D-84, D-86):** el plazo lo cumple el momento de la detección si el proceso programado llama a su hora; el retraso con que llame y lo que tarde la ejecución en llegar a cada organización se suman, no se acotan y quedan anotados en el registro de cada ejecución. |
| RNF-4 | **Recuperación.** Si el sistema estuvo fuera de servicio a la hora del reporte, al volver reporta lo pendiente. En ese caso el retraso es el que duró la caída y RNF-3 no aplica (RA-6). |
| RNF-5 | **Red de seguridad.** Los datos tienen respaldo diario. Si la aplicación no está disponible en el cierre del mes, la contingencia es la plantilla anterior en Excel, que se sigue conservando; el sistema no promete exportar mientras está caído. |
| RNF-6 | **Datos personales mínimos.** Nombre, correo corporativo y teléfono de contacto. Sin documento de identidad. De la salud solo se guarda la categoría «incapacidad» del motivo, sin diagnóstico ni detalle (RF-12). El archivo exportado lleva solo lo que el cliente necesita para dar conformidad. |
| RNF-7 | **Idioma y hora.** Interfaz en español. Toda hora de una asignación (horario, aviso, registro, reporte) se muestra en la zona horaria del cliente de esa asignación. Las horas de la traza que no pertenecen a una asignación no tienen pantalla en el MVP (RA-7); en qué zona se muestran se decide cuando se detalle la trazabilidad. |
| RNF-8 | **Confidencialidad del repositorio.** El código y la documentación son públicos por exigencia del curso: no contienen nombres reales de clientes, personas ni contratos. |

## 8. Restricciones

| # | Restricción |
|---|---|
| R-1 | **Plazo del curso.** Código funcional de referencia, jueves 19/11/2026 (no obligatoria); entrega final, miércoles 09/12/2026 (obligatoria), con meta interna el sábado 05/12/2026 (D-75). La estimación inicial era de unas 30 horas; para la entrega se construye un recorte de 23 tickets, estimado en unas 82 horas (D-73). |
| R-2 | **Tecnología.** La misma del sistema de talento que la empresa ya opera (decisión de la Dirección del 17/10/2026), para que lo mantenga el mismo equipo. |
| R-3 | **Una sola aplicación desplegada**, sin procesos aparte (D-27). |
| R-4 | **Equipo.** Una persona, con asistencia de IA. Toda pieza de código pasa por revisión adversarial antes de integrarse (D-28), y las pruebas se escriben antes del código en reglas de negocio y permisos, con un caso positivo y uno negativo por pieza (D-26). |
| R-5 | **Anonimización.** Lo que se publica usa alias; la clave que los relaciona con los nombres reales no está en el repositorio. |
| R-6 | **Adopción por un cliente primero.** [SUPUESTO] `Cliente A`, que arranca sin histórico que migrar. |
| R-7 | **Horarios dentro de un mismo día.** El MVP no admite turnos que crucen la medianoche (D-41). |

## 9. Métricas de éxito

Ninguna **meta de éxito** tiene número decidido: se fijan con la línea base del primer mes (D-41).
El único tope numérico del documento es el de M-2, y es un requisito del sistema (RNF-3), no una
meta. Para cada métrica se indica cómo se mide y qué falta para fijarle una meta.

| # | Métrica | Cómo se mide | Qué falta |
|---|---|---|---|
| M-1 | Proporción de días-asignación con aviso dentro del margen. No cuentan los días cuyo motivo anotado es vacaciones, incapacidad, permiso o falla técnica | Con los datos del sistema | Línea base del primer mes con el primer cliente |
| M-2 | Tiempo entre el vencimiento del margen y la salida del reporte del sistema | Con los datos del sistema | Nada: con el sistema en servicio el máximo es un intervalo (RNF-3) |
| M-3 | Proporción de no reportados con motivo anotado el mismo día | Con los datos del sistema | Línea base del primer mes |
| M-4 | Veces que el cliente avisa de una ausencia antes que nosotros | **El sistema no puede medirlo.** Exige un registro manual de la Dirección | Decidir si ese registro se lleva y quién |
| M-5 | Períodos facturados con el archivo del sistema, sin volver a la plantilla anterior | Con los datos del sistema más la confirmación de quien factura | Definir quién confirma |

M-4 es la que responde al primer dolor y es justo la que el sistema no mide por sí solo. Se declara
así, sin sustituirla por una que sí se pueda medir.

## 10. Supuestos y puntos abiertos

### Supuestos de este documento

Los supuestos S-1 (canal), S-2 (margen) y S-5 (período) de versiones anteriores dejaron de serlo:
son las decisiones D-36, D-29 y D-33.

| # | Supuesto | Valor provisional |
|---|---|---|
| S-3 | Cómo se obliga el registro | Reglamento interno; la cláusula contractual se evalúa aparte, fuera del sistema |
| S-4 | Primer cliente | `Cliente A` |

### Puntos abiertos

**Sobre la numeración.** Los puntos abiertos de este PRD se llaman **PA-P** y son distintos de los
**PA-1 a PA-9 del discovery**. PA-P1, PA-P2 y PA-P4 se cerraron con las decisiones D-32, D-34 y D-36; los
PA-P3 y PA-P7 de la v1 —ausencias de varios días y aviso como declaración— son hoy los riesgos
RA-4 y RA-5. Los PA-3 y PA-7 del discovery —instrumento contractual y segregación entre
proveedores— siguen abiertos allí y no forman parte del MVP.

| # | Punto abierto | Por qué importa |
|---|---|---|
| PA-P5 | **Qué gana el consultor por registrar** (PA-2 del discovery). Candidato: un reconocimiento a quienes llevan avisos y registros al día (D-33). | Sin eso, la adopción depende solo de la obligación |
| PA-P6 | **Quién lleva la métrica M-4**, la única que mide el primer dolor. | Sin ella no se puede afirmar que el producto funcionó |

## 11. Riesgos aceptados

Son defectos conocidos que la Dirección decidió no resolver en el MVP. Se dejan escritos para que
nadie los descubra después como sorpresa.

| # | Riesgo | Por qué se acepta | Decisión |
|---|---|---|---|
| RA-1 | El ajuste final se hace en el Excel, fuera del sistema: el archivo que acompaña la factura puede diferir de lo aprobado, sin traza de ese cambio | Sin bloqueo ni reapertura en el MVP, el archivo es donde se corrige; el bloqueo vuelve cuando vuelva la reapertura | D-18, D-32 |
| RA-2 | Un período corregido después de aprobado no pasa por una nueva aprobación | El estado «aprobado con cambios posteriores» lo deja a la vista en la aplicación y en el archivo; exigir otra aprobación complica el MVP | D-32 |
| RA-3 | El sistema garantiza que el correo sale, no que se entrega ni que se lee a tiempo | El reporte queda consultable en la aplicación (RF-11); la notificación en el móvil es la versión siguiente | D-36 |
| RA-4 | Quien está ausente varios días aparece cada día en el reporte y hay que anotarlo cada vez | El registro de ausencias salió del MVP; la categoría del motivo lo cubre mientras tanto | D-18, D-22 |
| RA-5 | El aviso es una declaración, no una verificación: un consultor puede avisar sin haber empezado. El sistema detecta el silencio, no la falsedad | Verificar exigiría geolocalización o conexión con herramientas del cliente, fuera del MVP | Alcance v2 |
| RA-6 | Tras una caída del sistema puede salir un correo repetido, o aparecer como no reportado quien no pudo avisar porque la aplicación no estaba disponible. También se repite el correo cuando el servicio de correo lo acepta y su confirmación se pierde (D-82) | Se anota con el motivo «falla técnica», que M-1 excluye; garantizar un envío exacto cuesta más de lo que el plazo permite, y un correo de más es preferible a un silencio | D-41, D-82 |
| RA-7 | La traza se guarda, pero no hay pantalla para consultarla | La consulta se hace por vía técnica a pedido de la Dirección; la pantalla queda contemplada | D-41 |
| RA-8 | Ni el margen ni el intervalo tienen tope: un margen más largo que la jornada deja el reporte fuera de ella, y un intervalo de un día entero cumple el plazo «de un intervalo» y anula la detección | Los fija la dirección y valen 60 y 5 minutos; validarlos contra cada horario complica el MVP. Queda contemplado en la sección 4 | D-54, D-58 |
| RA-9 | Con clientes en zonas horarias distintas no está definido cuál es «la primera asignación del día» de un consultor con dos, ni en qué zona se cuenta «ese día» al desactivar una cuenta | El primer cliente opera en una sola zona horaria; es de la misma familia que la fecha por zona horaria de la sección 4 | D-48, D-58 |
| RA-10 | El servicio de autenticación limita los intentos de entrada por dirección IP, no por cuenta | Es un MVP interno con pocas cuentas; lo cubre el límite por IP que el servicio documenta, todavía sin probar: se comprueba en el despliegue. Queda contemplado en la sección 4 | D-72 |
| RA-11 | El tiempo de respuesta de la entrada puede delatar si un correo tiene cuenta, aunque el mensaje sea el mismo | Es un MVP interno con pocas cuentas; lo cubre el mismo límite por IP, con la misma salvedad. Queda contemplado en la sección 4 | D-77 |
| RA-12 | Una asignación cuyo margen vence pasada su medianoche no sale en el reporte | No hay turnos nocturnos en los datos y ninguna asignación empieza cerca de la medianoche; la regla central no se complica para un caso que hoy no existe. Queda contemplado en la sección 4 | D-79 |
| RA-13 | Con el cambio de hora, un horario que cae entero en la hora que el reloj se salta queda sin duración | Panamá, Lima y Bogotá no tienen horario de verano, y los clientes de los datos de arranque están en una sola zona. Queda contemplado en la sección 4 | D-85 |
| RA-14 | La vigencia de la sesión depende de un campo del pase que la documentación del servicio de autenticación no describe | Se comprueba en el despliegue, y si el campo falta la sesión vence: nunca queda vigente por error. Queda contemplado en la sección 4 | D-85 |
| RA-15 | Si una cuenta cambia su correo en el servicio de autenticación, el correo que guarda el sistema queda viejo y el reporte del supervisor iría a la dirección anterior | Los correos no se cambian: sería un error de captura, excepcional y una sola vez. El sistema no ofrece cambiar el correo. Queda contemplado en la sección 4 | D-87 |
