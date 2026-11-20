# PRD — MVP del Controlador de Tiempo

> **Versión 2 · lunes 16/11/2026 · después de la primera refutación.**
> Paso 3 del método (PROMPTS 5, 6 y 6b). Fuentes: `../02-Alcance/Propuesta MVP Controlador de Tiempo-20260910-v2.html`
> y las decisiones **D-1 a D-34** de `../01-Discovery/discovery-controlador-tiempo.md`.
> Este documento es de **producto**: dice qué debe hacer el sistema y para quién, no cómo se construye.
> Lo que es supuesto y no decisión va marcado **[SUPUESTO]**. Documento anonimizado: los clientes
> aparecen como `Cliente A`…, las empresas como `Proveedor A` y `Proveedor B`.
> **Qué cambió frente a la v1:** las respuestas a los 18 hallazgos de la revisión adversarial están en
> `Respuesta-Revision-Thibaut-PRD-v1-20261116-ronda1.md`; las decisiones nuevas son D-29 a D-34.

**Totales de este documento:** 4 épicas · 25 requisitos funcionales (RF-1 a RF-25) · 8 requisitos no
funcionales (RNF-1 a RNF-8) · 6 restricciones · 5 métricas · 3 supuestos · 3 puntos abiertos ·
5 riesgos aceptados.

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
  nombre y teléfono **al vencer el margen**. Se llama antes de que llame el cliente.
- **Para el consultor:** avisar cuesta un toque, y es un acto separado del registro de actividad. A
  la hora de empezar no tiene que decidir en qué va a trabajar.
- **Para la facturación:** un solo acto de registro alimenta un formato único de reporte, aprobado
  por el supervisor y exportable, que acompaña la factura mensual.

**Lo que no es:** no es un motor de facturación (se factura por otra vía; el sistema produce el
respaldo) ni un sistema de notificaciones en tiempo real.

## 4. Alcance y fuera de alcance

### Dentro del MVP

1. Acceso con cuenta propia y separación entre organizaciones.
2. Aviso de inicio de actividades en un toque.
3. Reporte de no reportados, con anotación del motivo.
4. Registro de actividad contra un catálogo.
5. Envío del período mensual y aprobación del supervisor en un solo paso.
6. Formato único de reporte, exportable a Excel.
7. Trazabilidad de todo lo anterior.

### Sale del MVP y queda contemplado

| Qué sale | Qué lo cubre mientras tanto | Decisión |
|---|---|---|
| Exportación a PDF | El Excel conserva la red de seguridad | D-18 |
| Bloqueo del período aprobado y reapertura con motivo | El período aprobado admite correcciones trazadas y queda marcado; el ajuste final se hace en el Excel antes de facturar | D-18, D-32 |
| Descripción breve del cambio al corregir un período aprobado | La marca «aprobado con cambios posteriores» y la traza | D-32 |
| Registro de ausencias (vacaciones, incapacidad, permiso) | Quien está ausente aparece en el reporte y se anota el motivo con su categoría | D-18, D-22 |
| Ida y vuelta de observaciones entre supervisor y consultor | Aprobación en un solo paso | D-18 |
| Sección «De vacaciones» en el reporte, con quienes tienen ese estatus | La categoría del motivo | D-22 |
| Cambiar la zona horaria en una asignación concreta | Toda asignación usa la zona de su cliente | D-20 |
| Acceso de aplicaciones externas al sistema | Solo la aplicación web | D-23 |
| Proyectos llave en mano: el consultor tiene fecha de entrega y solo registra actividades, sin aviso | No se atienden en este entregable | D-30 |
| Observar el cambio de modalidad de un día concreto, para informar al cliente | La modalidad que el consultor indica en cada registro de actividad | D-31 |
| Seguimiento semanal de quién no ha registrado sus actividades, y reconocimiento a quienes van al día | La revisión del supervisor al aprobar el mes | D-33 |

### Fuera del MVP, explícito

Notificación en tiempo real y escalamiento · recordatorios al consultor · conexión con las
herramientas del cliente, de lectura o de escritura · evidencia desde repositorios de código ·
conformidad del cliente dentro del sistema · administración de varias empresas y cobro del servicio
· migración del histórico · indicadores y tableros · aplicación móvil nativa · geolocalización ·
motor de facturación · pantallas de administración (D-34).

## 5. Épicas del MVP

| Épica | Nombre | Qué agrupa |
|---|---|---|
| **E1** | Acceso y separación | Cuentas, roles, la frontera entre organizaciones y la carga de los datos de arranque |
| **E2** | Presencia | El aviso de inicio, el reporte de no reportados y la anotación del motivo |
| **E3** | Actividad y aprobación | El registro de actividad, el período y su aprobación |
| **E4** | Respaldo de facturación | El formato único de reporte, su exportación y la trazabilidad |

Orden de construcción: E1 → E2 → E3 → E4. E2 va antes que E3 porque resuelve el primer dolor.

## 6. Requisitos funcionales

Prioridad: **N** = necesario para el MVP · **D** = deseable, entra si el plazo alcanza.

### E1 · Acceso y separación

| # | Requisito | Prior. |
|---|---|---|
| RF-1 | Solo una persona con cuenta activa y sesión iniciada puede usar el sistema. Sin sesión no se ve ni se registra nada. | N |
| RF-2 | Hay tres roles: consultor, supervisor y dirección. El consultor ve y registra solo lo propio; el supervisor ve lo de los consultores que supervisa; la dirección ve todo lo de su organización. | N |
| RF-3 | Todo dato pertenece a una organización. Un usuario nunca ve ni modifica datos de otra organización, sea cual sea su rol. | N |
| RF-24 | Una cuenta se puede desactivar. Desde ese momento la persona no puede entrar ni seguir usando una sesión que tuviera abierta. Lo que registró se conserva. | N |
| RF-25 | Clientes, asignaciones, usuarios y catálogo los carga la Dirección mediante una carga controlada, sin pantallas de administración. La carga valida los datos, rechaza los que no cumplen e informa qué quedó cargado (D-34). | N |

### E2 · Presencia

| # | Requisito | Prior. |
|---|---|---|
| RF-4 | Un consultor con asignación activa hoy ve, al abrir la aplicación, un único botón de aviso con el texto «Inicio de Actividades», igual para toda modalidad (D-31). Un toque registra el aviso con la hora exacta y lo confirma. Si el consultor tiene dos asignaciones el mismo día, el botón corresponde a la que está en curso o, si ninguna lo está, a la siguiente del día. | N |
| RF-5 | Hay un solo aviso por asignación y día. Si el consultor vuelve a tocar, no se crea otro: ve el que ya existe. | N |
| RF-6 | Si el consultor no tiene asignación activa hoy (fin de semana, asignación terminada o aún no iniciada), no ve el botón y ve el motivo. | N |
| RF-7 | El aviso no pide actividad, proyecto ni descripción. | N |
| RF-8 | Una asignación une a un consultor con un cliente (D-30). Tiene un horario comprometido (hora de inicio, hora de fin y días laborables) tomado del contrato, y una modalidad: presencial, teletrabajo o híbrida. Las horas se interpretan en la zona horaria del cliente. Un consultor tiene normalmente una asignación; se admite otra solo si su horario no se cruza con el de la primera, y el sistema rechaza la que se cruce. | N |
| RF-9 | En un día laborable de la asignación, si vence el margen desde la hora de inicio comprometida sin aviso, el consultor entra en el reporte de no reportados. Si avisó dentro del margen, no entra. Un aviso posterior al vencimiento no lo saca del reporte: queda como llegada tardía (RF-13), aunque el reporte todavía no hubiera salido. | N |
| RF-10 | El reporte sale hacia el supervisor de la asignación en la ejecución siguiente al vencimiento del margen, por el canal configurado, y una sola vez por asignación y día. Las ejecuciones se repiten cada intervalo. No hay hora de cierre: cada asignación del día deja de revisarse cuando queda clasificada, con aviso o como no reportada (D-29). | N |
| RF-11 | Por cada no reportado el reporte muestra nombre, cliente, hora comprometida, minutos de retraso y teléfono de contacto. Queda consultable en la aplicación por fecha: el supervisor ve sus asignaciones y la dirección las de su organización. El consultor no accede al reporte. | N |
| RF-12 | El supervisor o la dirección anotan el motivo de cada no reportado: una categoría (vacaciones, incapacidad, permiso, tardanza, falla técnica, otro) y un texto. Queda quién lo anotó y cuándo. | N |
| RF-13 | Si el consultor avisa después de vencido el margen, el registro del reporte se conserva y muestra la llegada tardía con sus minutos de retraso. | N |
| RF-14 | El margen y el intervalo son parámetros generales, uno de cada uno para toda la organización (D-29). Valores iniciales: 60 y 5 minutos. Se cambian sin modificar el sistema; el cambio lo decide la Dirección y queda registrado con quién, cuándo, valor anterior y valor nuevo. | N |

### E3 · Actividad y aprobación

| # | Requisito | Prior. |
|---|---|---|
| RF-15 | El consultor registra su actividad con: asignación (implícita si tiene una sola; la elige si tiene dos), fecha, hora de entrada (propuesta a partir del aviso de ese día), hora de salida, modalidad, actividad del catálogo, descripción breve y tipo de hora (ordinaria o extra). El sistema calcula las horas. No se acepta: una salida igual o anterior a la entrada, un registro que se cruce con otro del mismo consultor, una fecha u hora futura, ni una fecha fuera de la vigencia de la asignación. | N |
| RF-16 | El consultor puede asociar el registro a una referencia del cliente, indicando sistema, clave y título. | D |
| RF-17 | El catálogo tiene actividades transversales y actividades propias de cada cliente. El consultor ve solo las que aplican a su asignación. | N |
| RF-18 | El período es el mes calendario, y hay uno por asignación (D-33). El consultor ve su período con las horas por día y el total, y lo envía a su supervisor. | N |
| RF-19 | El supervisor aprueba un período enviado en un solo paso. Queda quién aprobó y cuándo. Un consultor no puede aprobar su propio período. | N |
| RF-20 | Un período aprobado no queda bloqueado: admite correcciones. Con la primera corrección posterior a la aprobación el período pasa a «aprobado con cambios posteriores», y toda corrección queda trazada. No se exige una nueva aprobación (D-32). | N |

### E4 · Respaldo de facturación

| # | Requisito | Prior. |
|---|---|---|
| RF-21 | El supervisor o la dirección exportan el período de una asignación a un archivo de Excel con el formato único: encabezado (empresa, cliente, proyecto, consultor, supervisor, contraparte del cliente, período y horario comprometido), detalle diario, resumen y espacio de conformidad para tres firmas. El archivo indica a la vista el estado del período: sin enviar, enviado, aprobado o aprobado con cambios posteriores, este último con la fecha del último cambio. Solo el de un período aprobado sirve de respaldo de factura; el de uno con cambios posteriores lo declara, y presentarlo es decisión de la Dirección (RA-2). | N |
| RF-22 | En el resumen, las horas por actividad y los totales de horas ordinarias y extras del mes se calculan. Ninguno se teclea. Si RF-16 entra, el resumen suma las horas por referencia del cliente con su porcentaje; esa parte es deseable. | N |
| RF-23 | Queda registro de quién avisó, registró, corrigió, envió, aprobó, anotó, exportó, cargó datos, desactivó una cuenta o cambió un parámetro, y cuándo. Ese registro no se puede modificar ni borrar desde la aplicación. | N |

## 7. Requisitos no funcionales

| # | Requisito |
|---|---|
| RNF-1 | **Fricción.** Con sesión vigente, avisar toma menos de 5 segundos desde abrir la aplicación hasta la confirmación; registrar una actividad, menos de 60 segundos. En el MVP se comprueba por observación con usuarios, no por medición automática. |
| RNF-2 | **Dispositivo.** Aplicación web que se usa bien desde el teléfono; el aviso se diseña primero para teléfono. |
| RNF-3 | **Oportunidad.** Con el sistema en servicio, el reporte de no reportados sale con un retraso máximo de un intervalo sobre el vencimiento del margen (D-21, D-29). Se mide la salida del sistema, no la entrega por el canal (RA-3). |
| RNF-4 | **Recuperación.** Si el sistema estuvo fuera de servicio a la hora del reporte, al volver reporta lo pendiente, una sola vez. En ese caso el retraso es el que duró la caída y RNF-3 no aplica. |
| RNF-5 | **Red de seguridad.** Los datos tienen respaldo diario. Si la aplicación no está disponible en el cierre del mes, la contingencia es la plantilla anterior en Excel, que se sigue conservando; el sistema no promete exportar mientras está caído. |
| RNF-6 | **Datos personales mínimos.** Nombre, correo corporativo y teléfono de contacto. Sin documento de identidad ni datos sensibles. El archivo exportado lleva solo lo que el cliente necesita para dar conformidad. |
| RNF-7 | **Idioma y hora.** Interfaz en español. Toda hora se muestra en la zona horaria del cliente de la asignación. |
| RNF-8 | **Confidencialidad del repositorio.** El código y la documentación son públicos por exigencia del curso: no contienen nombres reales de clientes, personas ni contratos. |

## 8. Restricciones

| # | Restricción |
|---|---|
| R-1 | **Plazo del curso.** Código funcional de referencia, jueves 19/11/2026 (no obligatoria); entrega final, miércoles 09/12/2026 (obligatoria). Unas 30 horas de trabajo en total. |
| R-2 | **Tecnología.** La misma del sistema de talento que la empresa ya opera (decisión de la Dirección del 17/10/2026), para que lo mantenga el mismo equipo. |
| R-3 | **Una sola aplicación desplegada**, sin procesos aparte (D-27). |
| R-4 | **Equipo.** Una persona, con asistencia de IA. Toda pieza de código pasa por revisión adversarial antes de integrarse (D-28), y las pruebas se escriben antes del código en reglas de negocio y permisos, con un caso positivo y uno negativo por pieza (D-26). |
| R-5 | **Anonimización.** Lo que se publica usa alias; la clave que los relaciona con los nombres reales no está en el repositorio. |
| R-6 | **Adopción por un cliente primero.** [SUPUESTO] `Cliente A`, que arranca sin histórico que migrar. |

## 9. Métricas de éxito

Ninguna **meta de éxito** tiene número decidido. El único tope numérico del documento es el de
M-2, y es un requisito del sistema (RNF-3), no una meta. Para cada métrica se indica cómo se mide y
qué falta para fijarle una meta.

| # | Métrica | Cómo se mide | Qué falta |
|---|---|---|---|
| M-1 | Proporción de días-asignación con aviso dentro del margen. No cuentan los días cuyo motivo anotado es vacaciones, incapacidad o permiso | Con los datos del sistema | Línea base del primer mes con el primer cliente |
| M-2 | Tiempo entre el vencimiento del margen y la salida del reporte del sistema | Con los datos del sistema | Nada: con el sistema en servicio el máximo es un intervalo (RNF-3) |
| M-3 | Proporción de no reportados con motivo anotado el mismo día | Con los datos del sistema | Línea base del primer mes |
| M-4 | Veces que el cliente avisa de una ausencia antes que nosotros | **El sistema no puede medirlo.** Exige un registro manual de la Dirección | Decidir si ese registro se lleva y quién |
| M-5 | Períodos facturados con el archivo del sistema, sin volver a la plantilla anterior | Con los datos del sistema más la confirmación de quien factura | Definir quién confirma |

M-4 es la que responde al primer dolor y es justo la que el sistema no mide por sí solo. Se declara
así, sin sustituirla por una que sí se pueda medir.

## 10. Supuestos y puntos abiertos

### Supuestos de este documento

Los supuestos S-2 (margen) y S-5 (período) de la v1 dejaron de serlo: son las decisiones D-29 y D-33.

| # | Supuesto | Valor provisional |
|---|---|---|
| S-1 | Canal del reporte de no reportados | Correo electrónico al supervisor de la asignación |
| S-3 | Cómo se obliga el registro | Reglamento interno; la cláusula contractual se evalúa aparte, fuera del sistema |
| S-4 | Primer cliente | `Cliente A` |

### Puntos abiertos

Conservan la numeración de la v1. PA-P1 y PA-P2 se cerraron con D-32 y D-34; PA-P3 y PA-P7 pasaron
a riesgos aceptados.

| # | Punto abierto | Por qué importa |
|---|---|---|
| PA-P4 | **Canal del reporte** (PA-1 del discovery): sigue como supuesto S-1. | Define si el aviso se ve a tiempo |
| PA-P5 | **Qué gana el consultor por registrar** (PA-2 del discovery). Candidato: un reconocimiento a quienes llevan avisos y registros al día (D-33). | Sin eso, la adopción depende solo de la obligación |
| PA-P6 | **Quién lleva la métrica M-4**, la única que mide el primer dolor. | Sin ella no se puede afirmar que el producto funcionó |

## 11. Riesgos aceptados

Son defectos conocidos que la Dirección decidió no resolver en el MVP. Se dejan escritos para que
nadie los descubra después como sorpresa.

| # | Riesgo | Por qué se acepta | Decisión |
|---|---|---|---|
| RA-1 | El ajuste final se hace en el Excel, fuera del sistema: el archivo que acompaña la factura puede diferir de lo aprobado, sin traza de ese cambio | Sin bloqueo ni reapertura en el MVP, el archivo es donde se corrige; el bloqueo vuelve cuando vuelva la reapertura | D-18, D-32 |
| RA-2 | Un período corregido después de aprobado no pasa por una nueva aprobación | El estado «aprobado con cambios posteriores» lo deja a la vista en la aplicación y en el archivo; exigir otra aprobación complica el MVP | D-32 |
| RA-3 | El sistema garantiza que el reporte sale, no que el canal lo entrega a tiempo | El reporte queda consultable en la aplicación (RF-11) aunque el correo se retrase o no llegue | D-29 |
| RA-4 | Quien está ausente varios días aparece cada día en el reporte y hay que anotarlo cada vez | El registro de ausencias salió del MVP; la categoría del motivo lo cubre mientras tanto | D-18, D-22 |
| RA-5 | El aviso es una declaración, no una verificación: un consultor puede avisar sin haber empezado. El sistema detecta el silencio, no la falsedad | Verificar exigiría geolocalización o conexión con herramientas del cliente, fuera del MVP | Alcance v2 |
