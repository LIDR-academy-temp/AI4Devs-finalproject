# PRD — MVP del Controlador de Tiempo

> **Versión 1 · lunes 16/11/2026 · BORRADOR, antes de la refutación.**
> Paso 3 del método (PROMPT 5). Fuentes: `../02-Alcance/Propuesta MVP Controlador de Tiempo-20260910-v2.html`
> y las decisiones **D-1 a D-28** de `../01-Discovery/discovery-controlador-tiempo.md`.
> Este documento es de **producto**: dice qué debe hacer el sistema y para quién, no cómo se construye.
> Lo que es supuesto y no decisión va marcado **[SUPUESTO]**. Documento anonimizado: los clientes
> aparecen como `Cliente A`…, las empresas como `Proveedor A` y `Proveedor B`.

**Totales de este documento:** 4 épicas · 23 requisitos funcionales (RF-1 a RF-23) · 8 requisitos no
funcionales (RNF-1 a RNF-8) · 6 restricciones · 5 métricas · 7 puntos abiertos.

---

## 1. Problema y contexto

Dos empresas de consultoría (Proveedor A y Proveedor B) asignan consultores a bancos y entidades
financieras bajo contratos con horario comprometido. La necesidad apareció en tres clientes y no es
de un proyecto: es capacidad operativa del servicio. Son **dos dolores distintos**:

| | Presencia y puntualidad | Actividad |
|---|---|---|
| Por qué duele | Nos enteramos **por el cliente** de que un consultor no asistió o no se conectó. Cuesta reputación | Sin sustento de actividad no se puede facturar. En uno de los países donde se opera es exigencia legal |
| Qué necesita | Detección oportuna: hoy, no al cierre de la quincena | Evidencia con trazabilidad y aprobación |
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
| **Consultor asignado** — usuario primario | «Cuando llego o me conecto, quiero avisarlo sin pensar en nada más.» · «Cuando termino una tarea, quiero dejar constancia en segundos.» | Sí |
| **Supervisor** | «Cuando alguien de mi equipo no ha avisado, quiero saberlo dentro de la primera hora para llamarlo antes de que llame el cliente.» · «Al cierre, quiero aprobar lo que respalda la factura.» | Sí |
| **Dirección** | «Quiero el respaldo de la factura sin armarlo a mano, y saber qué pasó con quien no se reportó.» | Sí |
| Contraparte del cliente | Dar conformidad a las horas | No: recibe el archivo exportado, como hoy |

**La condición que manda sobre todo lo demás:** el consultor no gana nada registrando; el valor lo
cobran las empresas. Si el incentivo es externo, la adopción depende de que registrar **no cueste
nada**. La fricción mínima es restricción de diseño, no aspiración (D-3, D-4).

## 3. Propuesta de valor

- **Para el supervisor y la Dirección:** el silencio de un consultor se convierte en una lista con
  nombre y teléfono dentro de la primera hora. Se llama antes de que llame el cliente.
- **Para el consultor:** avisar cuesta un toque, y es un acto separado del registro de actividad. A
  la hora de llegada no tiene que decidir en qué va a trabajar.
- **Para la facturación:** un solo acto de registro alimenta un formato único de reporte, aprobado
  por el supervisor y exportable, que acompaña la factura.

**Lo que no es:** no es un motor de facturación (se factura por otra vía; el sistema produce el
respaldo) ni un sistema de notificaciones en tiempo real.

## 4. Alcance y fuera de alcance

### Dentro del MVP

1. Acceso con cuenta propia y separación entre organizaciones.
2. Aviso de llegada en un toque.
3. Reporte de no reportados, con anotación del motivo.
4. Registro de actividad contra un catálogo.
5. Envío del período y aprobación del supervisor en un solo paso.
6. Formato único de reporte, exportable a Excel.
7. Trazabilidad de todo lo anterior.

### Sale del MVP y queda contemplado

| Qué sale | Qué lo cubre mientras tanto | Decisión |
|---|---|---|
| Exportación a PDF | El Excel conserva la red de seguridad | D-18 |
| Bloqueo del período aprobado y reapertura con motivo | El período aprobado admite correcciones trazadas; el ajuste final se hace en el Excel antes de facturar | D-18 |
| Registro de ausencias (vacaciones, incapacidad, permiso) | Quien está ausente aparece en el reporte y se anota el motivo con su categoría | D-18, D-22 |
| Ida y vuelta de observaciones entre supervisor y consultor | Aprobación en un solo paso | D-18 |
| Sección «De vacaciones» en el reporte, con quienes tienen ese estatus | La categoría del motivo | D-22 |
| Cambiar la zona horaria en una asignación concreta | Toda asignación usa la zona de su cliente | D-20 |
| Acceso de aplicaciones externas al sistema | Solo la aplicación web | D-23 |

### Fuera del MVP, explícito

Notificación en tiempo real y escalamiento · recordatorios al consultor · conexión con las
herramientas del cliente, de lectura o de escritura · evidencia desde repositorios de código ·
conformidad del cliente dentro del sistema · administración de varias empresas y cobro del servicio
· migración del histórico · indicadores y tableros · aplicación móvil nativa · geolocalización ·
motor de facturación.

**[SUPUESTO] Pantallas de administración.** El MVP no incluye pantallas para crear clientes,
proyectos, asignaciones, usuarios ni el catálogo: esos datos se cargan por configuración. Ningún
documento previo lo decide de forma expresa; va a puntos abiertos (PA-P2).

## 5. Épicas del MVP

| Épica | Nombre | Qué agrupa |
|---|---|---|
| **E1** | Acceso y separación | Cuentas, roles y la frontera entre organizaciones |
| **E2** | Presencia | El aviso de llegada, el reporte de no reportados y la anotación del motivo |
| **E3** | Actividad y aprobación | El registro de actividad, el período y su aprobación |
| **E4** | Respaldo de facturación | El formato único de reporte, su exportación y la trazabilidad |

Orden de construcción: E1 → E2 → E3 → E4. E2 va antes que E3 porque resuelve el primer dolor.

## 6. Requisitos funcionales

Prioridad: **N** = necesario para el MVP · **D** = deseable, entra si el plazo alcanza.

### E1 · Acceso y separación

| # | Requisito | Prior. |
|---|---|---|
| RF-1 | Solo una persona con cuenta y sesión iniciada puede usar el sistema. Sin sesión no se ve ni se registra nada. | N |
| RF-2 | Hay tres roles: consultor, supervisor y dirección. El consultor ve y registra solo lo propio; el supervisor ve lo de los consultores que supervisa; la dirección ve todo lo de su organización. | N |
| RF-3 | Todo dato pertenece a una organización. Un usuario nunca ve ni modifica datos de otra organización, sea cual sea su rol. | N |

### E2 · Presencia

| # | Requisito | Prior. |
|---|---|---|
| RF-4 | Un consultor con asignación activa hoy ve, al abrir la aplicación, un único botón de aviso con el texto que corresponde a su modalidad del día («Llegué» o «Me conecté»). Un toque registra el aviso con la hora exacta y lo confirma. | N |
| RF-5 | Hay un solo aviso por asignación y día. Si el consultor vuelve a tocar, no se crea otro: ve el que ya existe. | N |
| RF-6 | Si el consultor no tiene asignación activa hoy (fin de semana, asignación terminada o aún no iniciada), no ve el botón y ve el motivo. | N |
| RF-7 | El aviso no pide actividad, proyecto ni descripción. | N |
| RF-8 | Cada asignación tiene un horario comprometido (hora de inicio, hora de fin y días laborables) tomado del contrato del cliente. Las horas se interpretan en la zona horaria del cliente. | N |
| RF-9 | En un día laborable de la asignación, si vence el margen desde la hora de inicio comprometida sin aviso, el consultor entra en el reporte de no reportados. Si avisó dentro del margen, no entra. | N |
| RF-10 | El reporte llega al supervisor de la asignación dentro de los cinco minutos siguientes al vencimiento del margen, por el canal configurado, y una sola vez por asignación y día. | N |
| RF-11 | Por cada no reportado el reporte muestra nombre, cliente, hora comprometida, minutos de retraso y teléfono de contacto. Queda consultable en la aplicación por fecha: el supervisor ve sus asignaciones y la dirección las de su organización. El consultor no accede al reporte. | N |
| RF-12 | El supervisor o la dirección anotan el motivo de cada no reportado: una categoría (vacaciones, incapacidad, permiso, tardanza, falla técnica, otro) y un texto. Queda quién lo anotó y cuándo. | N |
| RF-13 | Si el consultor avisa después de haber sido reportado, el registro del reporte se conserva y muestra la llegada tardía con sus minutos de retraso. | N |
| RF-14 | El margen se puede cambiar sin modificar el sistema. | N |

### E3 · Actividad y aprobación

| # | Requisito | Prior. |
|---|---|---|
| RF-15 | El consultor registra su actividad con: fecha, hora de entrada (propuesta a partir del aviso de ese día), hora de salida, modalidad, actividad del catálogo, descripción breve y tipo de hora (ordinaria o extra). El sistema calcula las horas. No se acepta una salida igual o anterior a la entrada. | N |
| RF-16 | El consultor puede asociar el registro a una referencia del cliente, indicando sistema, clave y título. | D |
| RF-17 | El catálogo tiene actividades transversales y actividades propias de cada cliente. El consultor ve solo las que aplican a su asignación. | N |
| RF-18 | El consultor ve su período (quincena) con las horas por día y los subtotales, y lo envía a su supervisor. | N |
| RF-19 | El supervisor aprueba un período enviado en un solo paso. Queda quién aprobó y cuándo. Un consultor no puede aprobar su propio período. | N |
| RF-20 | Un período aprobado no queda bloqueado: admite correcciones, y toda corrección posterior a la aprobación queda trazada. | N |

### E4 · Respaldo de facturación

| # | Requisito | Prior. |
|---|---|---|
| RF-21 | El supervisor o la dirección exportan un período a un archivo de Excel con el formato único: encabezado (empresa, cliente, proyecto, consultor, supervisor, contraparte del cliente, período y horario comprometido), detalle diario, resumen y espacio de conformidad para tres firmas. El archivo indica el estado del período; solo el de un período aprobado sirve de respaldo de factura. | N |
| RF-22 | En el resumen, las horas por actividad, las horas por referencia del cliente con su porcentaje, los subtotales por quincena y los totales de horas ordinarias y extras se calculan. Ninguno se teclea. | N |
| RF-23 | Queda registro de quién avisó, registró, corrigió, envió, aprobó, anotó y exportó, y cuándo. Ese registro no se puede modificar ni borrar desde la aplicación. | N |

## 7. Requisitos no funcionales

| # | Requisito |
|---|---|
| RNF-1 | **Fricción.** Avisar toma menos de 5 segundos desde abrir la aplicación hasta la confirmación; registrar una actividad, menos de 60 segundos. En el MVP se comprueba por observación con usuarios, no por medición automática. |
| RNF-2 | **Dispositivo.** Aplicación web que se usa bien desde el teléfono; el aviso se diseña primero para teléfono. |
| RNF-3 | **Oportunidad.** El reporte de no reportados sale con un retraso máximo de cinco minutos sobre el vencimiento del margen (D-21). |
| RNF-4 | **Recuperación.** Si el sistema estuvo fuera de servicio a la hora del reporte, al volver reporta lo pendiente, una sola vez. |
| RNF-5 | **Red de seguridad.** Una caída en el cierre del mes no impide facturar: lo registrado se puede exportar a archivo, y los datos tienen respaldo diario. |
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

Ninguna meta numérica está decidida. Para cada métrica se indica cómo se mide y qué falta para
fijarle una meta.

| # | Métrica | Cómo se mide | Qué falta |
|---|---|---|---|
| M-1 | Proporción de días-asignación con aviso dentro del margen | Con los datos del sistema | Línea base del primer mes con el primer cliente |
| M-2 | Tiempo entre el vencimiento del margen y la salida del reporte | Con los datos del sistema | Nada: el máximo es cinco minutos (RNF-3) |
| M-3 | Proporción de no reportados con motivo anotado el mismo día | Con los datos del sistema | Línea base del primer mes |
| M-4 | Veces que el cliente avisa de una ausencia antes que nosotros | **El sistema no puede medirlo.** Exige un registro manual de la Dirección | Decidir si ese registro se lleva y quién |
| M-5 | Períodos facturados con el archivo del sistema, sin volver a la plantilla anterior | Con los datos del sistema más la confirmación de quien factura | Definir quién confirma |

M-4 es la que responde al primer dolor y es justo la que el sistema no mide por sí solo. Se declara
así, sin sustituirla por una que sí se pueda medir.

## 10. Supuestos y puntos abiertos

### Supuestos de este documento

| # | Supuesto | Valor provisional |
|---|---|---|
| S-1 | Canal del reporte de no reportados | Correo electrónico al supervisor de la asignación |
| S-2 | Valor y ámbito del margen | 60 minutos, igual para todos |
| S-3 | Cómo se obliga el registro | Reglamento interno; la cláusula contractual se evalúa aparte, fuera del sistema |
| S-4 | Primer cliente | `Cliente A` |
| S-5 | Duración del período | Quincena |

### Puntos abiertos que este PRD deja a la vista

Se numeran PA-P para no confundirlos con los PA-1 a PA-9 del discovery.

| # | Punto abierto | Por qué importa |
|---|---|---|
| PA-P1 | **¿Qué pasa con la aprobación cuando se corrige un período ya aprobado?** RF-20 permite la corrección y la traza, pero no dice si el período sigue aprobado, vuelve a «enviado» o queda marcado como modificado. | Decide si el archivo exportado después de una corrección sigue siendo respaldo válido |
| PA-P2 | **¿Quién crea clientes, asignaciones, usuarios y catálogo, y cómo?** Hoy es supuesto que se cargan por configuración. | Sin asignaciones no hay aviso ni reporte; el primer cliente tiene que poder arrancar |
| PA-P3 | **Ausencias de varios días.** Quien toma dos semanas de vacaciones aparece cada día en el reporte y hay que anotarlo cada vez. | Es ruido diario para el supervisor; puede hacer que el reporte se ignore |
| PA-P4 | **Canal y margen** (PA-1 del discovery): siguen como supuestos S-1 y S-2. | El margen define cuándo se llama; el canal, si el aviso se ve a tiempo |
| PA-P5 | **Qué gana el consultor por registrar** (PA-2 del discovery). | Sin eso, la adopción depende solo de la obligación |
| PA-P6 | **Quién lleva la métrica M-4**, la única que mide el primer dolor. | Sin ella no se puede afirmar que el producto funcionó |
| PA-P7 | **El aviso es una declaración, no una verificación.** Un consultor puede avisar sin haber llegado. El sistema detecta el silencio, no la falsedad. | Aceptado en el alcance v2 como riesgo; se conserva a la vista |
