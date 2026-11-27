# Backlog — MVP del Controlador de Tiempo

> **Versión 1 · miércoles 18/11/2026 · borrador para refutación. Sin aprobar.**
> Paso 4 del método (PROMPTS 8, 9, 10 y 10b). Fuente: `../03-PRD/PRD-MVP-Controlador-de-Tiempo-20261117-v3.md`
> y las decisiones **D-42 a D-48** de `../01-Discovery/discovery-controlador-tiempo.md`, que son
> posteriores al PRD v3 y lo precisan.
> Este documento es de **producto**: un criterio dice qué es verdad para el usuario. No nombra
> rutas, códigos de respuesta, tablas ni campos.
> Documento anonimizado: los clientes aparecen como `Cliente A`…, las empresas como `Proveedor A`
> y `Proveedor B`.

**Totales de este documento:** 4 épicas · 18 historias (HU-01 a HU-18) · 5 historias con
criterios de aceptación y 13 solo listadas · 55 criterios (CA) · 8 de ellos marcados
**[PROPUESTO]** · 6 puntos abiertos (PA-B1 a PA-B6).

**Por qué existe este documento ahora.** El paso 4 no se hizo cuando tocaba: del PRD se pasó al
README v2, que trae tres historias y doce tickets escritos sin pasar por aquí. La desviación se
detectó el 18/11/2026 y la Dirección decidió corregirla antes de escribir la especificación. Lo que
el README diga distinto de este backlog se corrige en el paso 5, cuando se crucen los tickets.

---

## 1. Cómo leer este documento

- **Sección 2 — listado (PROMPT 8).** Todas las historias de las cuatro épicas, sin criterios, cada
  una con los requisitos del PRD que cubre. Sirve para comprobar que ningún requisito quedó sin
  historia.
- **Sección 3 — cobertura.** El cruce en los dos sentidos: de requisito a historia y de historia a
  requisito.
- **Sección 4 — historias con criterios (PROMPTS 9 y 10).** Solo las próximas a construirse. El
  método lo pide así: una historia detallada con diez de antelación caduca antes de usarse.
- **Sección 5 — puntos abiertos.** Lo que el PRD no dice y hace falta decidir. No se rellenó.

**Marcas.** Cada criterio lleva su origen entre paréntesis (un requisito, una decisión o un riesgo
aceptado del PRD). El que no deriva de ninguno va marcado **[PROPUESTO]** con su motivo: lo decide
la Dirección, y si no lo aprueba se quita.

**Identificadores.** `HU-nn` para la historia y `HU-nn.CA-n` para el criterio. Son una propuesta:
los fija la Dirección.

---

## 2. Listado de historias (PROMPT 8)

### E1 · Acceso y separación

| # | Historia | Cubre | Detalle |
|---|---|---|---|
| HU-01 | **Como** persona con cuenta, **quiero** entrar con mi propia cuenta, **para** que solo yo use el sistema en mi nombre. | RF-1, RF-24 (parte) | Sección 4 |
| HU-02 | **Como** dirección, **quiero** que cada persona vea y haga solo lo que corresponde a su rol, **para** que nadie lea ni cambie lo que no le toca. | RF-2 | Sección 4 |
| HU-03 | **Como** dirección de una empresa, **quiero** que los datos de mi organización queden separados de los de cualquier otra, **para** que la información de mis clientes y de mi gente no la vea un tercero. | RF-3 | Sección 4 |
| HU-04 | **Como** dirección, **quiero** desactivar la cuenta de una persona, **para** que deje de entrar desde ese momento sin perder lo que registró. | RF-24 | Solo listada |
| HU-05 | **Como** dirección, **quiero** cargar clientes, proyectos, asignaciones, usuarios y catálogo con una carga controlada, **para** arrancar y mantener los datos sin pantallas de administración. | RF-25, RF-8, RF-17 (parte) | Solo listada |

### E2 · Presencia

| # | Historia | Cubre | Detalle |
|---|---|---|---|
| HU-06 | **Como** consultor asignado a un cliente, **quiero** avisar con un solo toque que empecé a trabajar, **para** que mi empresa lo sepa antes que el cliente sin que yo tenga que pensar en qué voy a trabajar. | RF-4, RF-5, RF-6, RF-7, RF-8 (parte), RF-13 (parte) | Sección 4 |
| HU-07 | **Como** supervisor, **quiero** recibir al vencer el margen la lista de quienes siguen sin avisar, **para** contactarlos antes de que el cliente me lo diga. | RF-9, RF-10 (parte), RF-11 (parte), RF-13 (parte) | Sección 4 |
| HU-08 | **Como** supervisor, **quiero** anotar el motivo de cada no reportado, **para** que quede constancia de qué pasó sin guardar detalle médico. | RF-12 | Solo listada |
| HU-09 | **Como** supervisor o dirección, **quiero** recibir un resumen al final de la jornada, **para** cerrar el día sabiendo quién no se reportó, quién llegó tarde y por qué. | RF-10 (parte) | Solo listada |
| HU-10 | **Como** supervisor o dirección, **quiero** consultar por fecha los no reportados y las llegadas tardías, **para** revisar lo ocurrido sin depender del correo. | RF-11 (parte), RF-13 (parte) | Solo listada |
| HU-11 | **Como** dirección, **quiero** cambiar el margen y el intervalo, **para** ajustar la detección sin pedir un cambio al sistema. | RF-14 | Solo listada |

### E3 · Actividad y aprobación

| # | Historia | Cubre | Detalle |
|---|---|---|---|
| HU-12 | **Como** consultor, **quiero** registrar lo que hice por proyecto y actividad, **para** dejar el sustento de mis horas en segundos. | RF-15 (parte), RF-17 | Solo listada |
| HU-13 | **Como** consultor, **quiero** editar o quitar un registro mío, **para** corregir un error antes de enviar el mes. | RF-15 (parte) | Solo listada |
| HU-14 | **Como** consultor, **quiero** ver mi mes y enviarlo a mi supervisor, **para** que lo apruebe. | RF-18 | Solo listada |
| HU-15 | **Como** supervisor, **quiero** aprobar en un solo paso el mes de un consultor, **para** que lo que acompaña la factura tenga una aprobación con nombre y fecha. | RF-19 | Solo listada |
| HU-16 | **Como** consultor, **quiero** corregir un mes ya aprobado, **para** que el respaldo refleje lo que de verdad ocurrió, dejando a la vista que cambió. | RF-20 | Solo listada |

### E4 · Respaldo de facturación

| # | Historia | Cubre | Detalle |
|---|---|---|---|
| HU-17 | **Como** supervisor o dirección, **quiero** exportar el mes de una asignación al formato único en Excel, con su resumen calculado, **para** acompañar la factura sin armarlo a mano. | RF-21, RF-22 | Solo listada |
| HU-18 | **Como** dirección, **quiero** que quede registro de quién hizo cada cosa y cuándo, **para** poder responder ante un reclamo con evidencia que nadie pudo alterar. | RF-23 | Solo listada |

### Validación contra el alcance

Ninguna de las 18 historias se sale del MVP. Lo que el PRD dejó fuera aparece como **«Fuera de esta
historia»** dentro de cada una, para que no se cuele al construir.

El README v2 dice que el backlog tiene «cinco historias». Son las mismas capacidades, agrupadas más
grueso: aquí cada historia es lo bastante pequeña para probarse sola. La correspondencia con las
tres que el README documenta es: Historia 1 del README → HU-06 · Historia 2 → HU-07, HU-08, HU-09 y
HU-11 · Historia 3 → HU-14, HU-15, HU-16 y HU-17.

---

## 3. Cobertura en los dos sentidos

### De requisito a historia

| Requisito | Historia | | Requisito | Historia |
|---|---|---|---|---|
| RF-1 | HU-01 | | RF-13 | HU-06, HU-07, HU-10 |
| RF-2 | HU-02 | | RF-14 | HU-11 |
| RF-3 | HU-03 | | RF-15 | HU-12, HU-13 |
| RF-4 | HU-06 | | RF-16 | *Retirado en el PRD v3* |
| RF-5 | HU-06 | | RF-17 | HU-05, HU-12 |
| RF-6 | HU-06 | | RF-18 | HU-14 |
| RF-7 | HU-06 | | RF-19 | HU-15 |
| RF-8 | HU-05, HU-06 | | RF-20 | HU-16 |
| RF-9 | HU-07 | | RF-21 | HU-17 |
| RF-10 | HU-07, HU-09 | | RF-22 | HU-17 |
| RF-11 | HU-07, HU-10 | | RF-23 | HU-18 |
| RF-12 | HU-08 | | RF-24 | HU-01, HU-04 |
| | | | RF-25 | HU-05 |

**Resultado:** los 24 requisitos vigentes tienen al menos una historia. RF-16 está retirado y no
lleva historia.

### De historia a requisito

Las 18 historias derivan de al menos un requisito funcional; ninguna es huérfana. Los criterios que
no derivan del PRD están marcados **[PROPUESTO]** en la sección 4.

### Requisitos no funcionales

No son historias. Se comprueban dentro de las historias que tocan: RNF-1 (fricción) en HU-06 ·
RNF-3 y RNF-4 (oportunidad y recuperación) en HU-07 · RNF-6 (datos personales mínimos) en HU-07 y
HU-08 · RNF-7 (idioma y hora) en todas. RNF-2, RNF-5 y RNF-8 son condiciones de construcción y de
operación: van a los tickets, no a los criterios.

---

## 4. Historias con criterios de aceptación (PROMPTS 9 y 10)

Se detallan cinco: las tres de acceso, porque sin ellas no se puede probar nada de lo demás, y las
dos primeras de presencia, que resuelven el primer dolor. Las otras trece se detallan cuando les
toque construirse.

---

### HU-01 · Entrar con cuenta propia

> **Como** persona con cuenta, **quiero** entrar con mi propia cuenta, **para** que solo yo use el
> sistema en mi nombre.

| # | Criterio | Origen |
|---|---|---|
| HU-01.CA-1 | **DADO** que tengo una cuenta activa, **CUANDO** entro con mis credenciales, **ENTONCES** accedo al sistema y veo lo que corresponde a mi rol. | RF-1, RF-2 |
| HU-01.CA-2 | **DADO** que no he iniciado sesión, **CUANDO** intento abrir cualquier parte del sistema, **ENTONCES** no veo ningún dato, no puedo registrar nada y se me pide entrar. | RF-1 |
| HU-01.CA-3 | **DADO** que escribo credenciales que no son correctas, **CUANDO** intento entrar, **ENTONCES** no entro y el mensaje es el mismo exista o no la cuenta. | **[PROPUESTO]** Motivo: un mensaje distinto le dice a un extraño qué correos tienen cuenta |
| HU-01.CA-4 | **DADO** que mi cuenta fue desactivada, **CUANDO** intento entrar con mis credenciales correctas, **ENTONCES** no entro. | RF-24 |
| HU-01.CA-5 | **DADO** que tengo una sesión abierta, **CUANDO** la dirección desactiva mi cuenta, **ENTONCES** no puedo seguir usando esa sesión: lo siguiente que intento se rechaza. | RF-24 |
| HU-01.CA-6 | **DADO** que ya entré desde mi teléfono, **CUANDO** vuelvo a abrir la aplicación mientras mi sesión sigue vigente, **ENTONCES** estoy dentro sin volver a escribir mis credenciales. | RNF-1 («con sesión vigente»). Cuánto dura: PA-B1 |
| HU-01.CA-7 | **DADO** que tengo una sesión abierta, **CUANDO** la cierro, **ENTONCES** para volver a usar el sistema tengo que entrar de nuevo. | **[PROPUESTO]** Motivo: un teléfono prestado o perdido |

**Fuera de esta historia:** cómo recibe una persona su primera credencial y cómo la recupera si la
olvida (PA-B2) · entrar con la cuenta de otro proveedor de identidad · acceso de aplicaciones
externas (D-23).

---

### HU-02 · Cada rol ve y hace solo lo suyo

> **Como** dirección, **quiero** que cada persona vea y haga solo lo que corresponde a su rol,
> **para** que nadie lea ni cambie lo que no le toca.

| # | Criterio | Origen |
|---|---|---|
| HU-02.CA-1 | **DADO** que soy consultor, **CUANDO** uso el sistema, **ENTONCES** veo, registro y corrijo solo mis avisos, mis registros y mis períodos. | RF-2 |
| HU-02.CA-2 | **DADO** que soy consultor, **CUANDO** intento ver o cambiar un aviso, un registro o un período de otro consultor, **ENTONCES** no lo veo y no cambia nada. | RF-2 |
| HU-02.CA-3 | **DADO** que soy consultor, **CUANDO** intento abrir el reporte de no reportados, **ENTONCES** no accedo. | RF-11 |
| HU-02.CA-4 | **DADO** que soy supervisor, **CUANDO** uso el sistema, **ENTONCES** veo lo de los consultores que superviso, y puedo anotar motivos, aprobar períodos y exportar. | RF-2 |
| HU-02.CA-5 | **DADO** que soy supervisor, **CUANDO** intento ver o aprobar lo de un consultor que supervisa otra persona de mi misma organización, **ENTONCES** no lo veo y no cambia nada. | RF-2, D-47 |
| HU-02.CA-6 | **DADO** que soy dirección, **CUANDO** uso el sistema, **ENTONCES** veo todo lo de mi organización y puedo hacer lo que hace un supervisor sobre cualquier consultor de ella. | RF-2 |
| HU-02.CA-7 | **DADO** que soy consultor o supervisor, **CUANDO** intento cargar datos, desactivar una cuenta o cambiar un parámetro, **ENTONCES** la operación se rechaza y no cambia nada. | RF-2 |
| HU-02.CA-8 | **DADO** que soy supervisor o dirección, **CUANDO** intento registrar un aviso o un registro de actividad a nombre de un consultor, **ENTONCES** no puedo: eso lo hace solo el propio consultor. | RF-2 («registra y corrige solo lo propio») |
| HU-02.CA-9 | **DADO** que una operación se rechaza por permiso, **CUANDO** ocurre, **ENTONCES** veo un mensaje que dice que no tengo permiso, en español, y el intento no deja ningún cambio. | **[PROPUESTO]** Motivo: un rechazo en silencio parece una falla del sistema |

**Fuera de esta historia:** el rol de aprobador del cliente, que no existe en el MVP (D-45) ·
pantallas para administrar roles (D-34): el rol llega con la carga de datos (HU-05) · que una misma
persona actúe con dos roles (PA-B3).

---

### HU-03 · Ninguna organización ve a otra

> **Como** dirección de una empresa, **quiero** que los datos de mi organización queden separados de
> los de cualquier otra, **para** que la información de mis clientes y de mi gente no la vea un
> tercero.

| # | Criterio | Origen |
|---|---|---|
| HU-03.CA-1 | **DADO** que pertenezco a una organización, **CUANDO** consulto cualquier lista o reporte, **ENTONCES** solo aparecen datos de mi organización, sea cual sea mi rol. | RF-3 |
| HU-03.CA-2 | **DADO** que soy dirección de mi organización, **CUANDO** intento ver o cambiar un dato de otra organización, **ENTONCES** no lo veo y no cambia nada: el rol más alto tampoco cruza la frontera. | RF-3 |
| HU-03.CA-3 | **DADO** que conozco o adivino la dirección exacta de un dato de otra organización, **CUANDO** intento abrirlo, **ENTONCES** el sistema responde igual que si ese dato no existiera. | **[PROPUESTO]** Motivo: decir «existe, pero no es tuyo» ya revela información de un tercero |
| HU-03.CA-4 | **DADO** que soy supervisor o dirección, **CUANDO** recibo un correo de no reportados o un resumen final, **ENTONCES** trae solo personas y clientes de mi organización. | RF-3 aplicado a RF-10 |
| HU-03.CA-5 | **DADO** que exporto un período, **CUANDO** se genera el archivo, **ENTONCES** contiene solo datos de mi organización. | RF-3 aplicado a RF-21 |
| HU-03.CA-6 | **DADO** que soy dirección y hago una carga de datos, **CUANDO** se procesa, **ENTONCES** todo lo cargado queda en mi organización y nada de otra cambia. | RF-3 aplicado a RF-25 |
| HU-03.CA-7 | **DADO** que el margen o el intervalo se cambian en una organización, **CUANDO** el cambio entra en vigor, **ENTONCES** las demás organizaciones conservan los suyos. | RF-14 («uno de cada uno por organización») |

**Fuera de esta historia:** la carga inicial que crea una organización nueva y su primera cuenta de
dirección (HU-05) · separar a los dos proveedores dentro de una misma organización, que sigue
abierto en el discovery (PA-7) y no es parte del MVP · administrar varias empresas y cobrar el
servicio.

---

### HU-06 · Avisar el inicio de actividades en un toque

> **Como** consultor asignado a un cliente, **quiero** avisar con un solo toque que empecé a
> trabajar, **para** que mi empresa lo sepa antes que el cliente sin que yo tenga que pensar en qué
> voy a trabajar.

| # | Criterio | Origen |
|---|---|---|
| HU-06.CA-1 | **DADO** que tengo una asignación pendiente de aviso hoy, **CUANDO** abro la aplicación, **ENTONCES** veo un único botón con el texto «Inicio de Actividades», igual para toda modalidad. | RF-4, D-31 |
| HU-06.CA-2 | **DADO** que veo el botón, **CUANDO** lo toco, **ENTONCES** el aviso queda registrado con la hora exacta del toque y veo la confirmación con esa hora. | RF-4 |
| HU-06.CA-3 | **DADO** que ya avisé hoy para esa asignación, **CUANDO** vuelvo a tocar o repito el intento, **ENTONCES** no se crea otro aviso: veo el que ya existe, con su hora original. | RF-5 |
| HU-06.CA-4 | **DADO** que llego antes de mi hora de inicio comprometida, **CUANDO** toco el botón, **ENTONCES** el aviso se acepta: se puede avisar desde que empieza el día en la zona horaria del cliente. | D-44 |
| HU-06.CA-5 | **DADO** que aviso dentro del margen, **CUANDO** queda registrado, **ENTONCES** no cuenta como llegada tardía. | RF-9 |
| HU-06.CA-6 | **DADO** que aviso después de vencido el margen, **CUANDO** queda registrado, **ENTONCES** el aviso se acepta igual y queda marcado como llegada tardía, con sus minutos de retraso. | RF-9, RF-13 |
| HU-06.CA-7 | **DADO** que ya salí en el reporte de no reportados de hoy, **CUANDO** aviso después, **ENTONCES** el aviso se acepta como llegada tardía y mi registro en el reporte no se borra. | RF-13 |
| HU-06.CA-8 | **DADO** que hoy no tengo una asignación pendiente de aviso, **CUANDO** abro la aplicación, **ENTONCES** no veo el botón y veo el motivo. Los motivos son: hoy no es día laborable de mi asignación · mi asignación ya terminó · mi asignación todavía no empieza · ya avisé · el horario de hoy ya terminó. | RF-6, D-44 |
| HU-06.CA-9 | **DADO** que tengo dos asignaciones hoy, **CUANDO** abro la aplicación, **ENTONCES** el botón corresponde a la primera del día que aún no tiene aviso y cuyo horario no ha terminado, y veo de qué cliente es. | RF-4, D-40. «Veo de qué cliente es»: **[PROPUESTO]** Motivo: con dos asignaciones, avisar sin saber a cuál desconcierta |
| HU-06.CA-10 | **DADO** que toco el botón, **CUANDO** se registra el aviso, **ENTONCES** no se me pide proyecto, actividad ni descripción. | RF-7 |
| HU-06.CA-11 | **DADO** que toco el botón, **CUANDO** el aviso no llega a registrarse (sin conexión o falla), **ENTONCES** veo que no quedó registrado y puedo reintentar; nunca veo una confirmación de un aviso que no existe. | **[PROPUESTO]** Motivo: una confirmación falsa convierte en no reportado a quien sí avisó |
| HU-06.CA-12 | **DADO** que avisé, **CUANDO** veo la hora del aviso, **ENTONCES** está en la zona horaria del cliente de la asignación. | RF-8, RNF-7 |
| HU-06.CA-13 | **DADO** que avisé, **CUANDO** busco cambiar la hora de ese aviso o quitarlo, **ENTONCES** no hay forma de hacerlo. | **[PROPUESTO]** Motivo: el aviso es la evidencia de puntualidad; si se edita deja de serlo |
| HU-06.CA-14 | **DADO** que tengo sesión vigente, **CUANDO** aviso, **ENTONCES** pasan menos de 5 segundos desde que abro la aplicación hasta la confirmación. Se comprueba por observación con usuarios, no por medición automática. | RNF-1 |

**Fuera de esta historia:** verificar que de verdad empecé —el aviso es una declaración, no una
verificación (RA-5)— · recordatorio al consultor y aplicación móvil (D-36) · avisar por otra
persona (HU-02.CA-8) · proyectos llave en mano, que no llevan aviso (D-30) · horarios que cruzan la
medianoche (D-41).

---

### HU-07 · Recibir la lista de no reportados al vencer el margen

> **Como** supervisor, **quiero** recibir al vencer el margen la lista de quienes siguen sin avisar,
> **para** contactarlos antes de que el cliente me lo diga.

Ejemplo que usan los criterios: hora de inicio comprometida 08:00, margen de 60 minutos, intervalo
de 5 minutos. El margen vence a las 09:00 y la primera ejecución posterior es la de las 09:05.

| # | Criterio | Origen |
|---|---|---|
| HU-07.CA-1 | **DADO** un día laborable de la asignación, **CUANDO** corre la primera ejecución posterior al vencimiento del margen y el consultor no ha avisado, **ENTONCES** entra en el reporte de no reportados. En el ejemplo: sin aviso, entra a las 09:05. | RF-9 |
| HU-07.CA-2 | **DADO** un no reportado, **CUANDO** lo veo en el reporte, **ENTONCES** trae nombre, cliente, hora comprometida, minutos de retraso y teléfono de contacto. Los minutos se cuentan desde la hora de inicio comprometida. En el ejemplo: 65. | RF-11. Desde dónde se cuentan: README v2, sección 6 |
| HU-07.CA-3 | **DADO** que el consultor avisó dentro del margen, **CUANDO** corre la ejecución, **ENTONCES** no entra en el reporte. En el ejemplo: aviso a las 08:59. | RF-9 |
| HU-07.CA-4 | **DADO** que el consultor avisó después del margen pero antes de esa ejecución, **CUANDO** corre la ejecución, **ENTONCES** no entra en la lista y su aviso queda como llegada tardía. En el ejemplo: aviso a las 09:02. | RF-9, RF-13, D-35 |
| HU-07.CA-5 | **DADO** que varios de mis supervisados entran en una misma ejecución, **CUANDO** se envía el reporte, **ENTONCES** recibo un solo correo con todos ellos, no uno por persona. | RF-10 |
| HU-07.CA-6 | **DADO** que una persona ya me fue reportada hoy por una asignación, **CUANDO** corren las ejecuciones siguientes, **ENTONCES** no vuelve a salir por esa asignación ese día. | RF-10 |
| HU-07.CA-7 | **DADO** que en una ejecución no tengo ningún no reportado nuevo, **CUANDO** corre, **ENTONCES** no recibo ningún correo. | **[PROPUESTO]** Motivo: un correo vacío cada 5 minutos enseña a ignorar el que sí importa |
| HU-07.CA-8 | **DADO** que soy supervisor, **CUANDO** recibo el reporte, **ENTONCES** trae solo a quienes yo superviso; no recibo a los de otro supervisor de mi organización. | RF-2, D-47 |
| HU-07.CA-9 | **DADO** que hoy no es día laborable de una asignación, o que la asignación no está vigente hoy, **CUANDO** corren las ejecuciones, **ENTONCES** su consultor no entra en el reporte. | RF-9, RF-8 |
| HU-07.CA-10 | **DADO** que el correo de una ejecución no llegó a salir, **CUANDO** corre la siguiente, **ENTONCES** sale en esa, con los no reportados que quedaron sin notificar. | D-47 |
| HU-07.CA-11 | **DADO** que el sistema estuvo fuera de servicio a la hora del reporte, **CUANDO** vuelve, **ENTONCES** reporta lo pendiente de ese día. Puede salir un correo repetido, o aparecer quien no pudo avisar porque la aplicación no estaba disponible. | RNF-4, RA-6 |
| HU-07.CA-12 | **DADO** que el supervisor de una asignación tiene la cuenta desactivada, **CUANDO** su consultor no avisa, **ENTONCES** el reporte lo recibe la dirección hasta que se cargue otro supervisor. | RF-24 |
| HU-07.CA-13 | **DADO** que la dirección cambió hoy el margen o el intervalo, **CUANDO** corren las ejecuciones de hoy, **ENTONCES** siguen usando los valores anteriores; los nuevos rigen desde mañana. | RF-14 |
| HU-07.CA-14 | **DADO** que una persona fue reportada y avisó después, **CUANDO** consulto lo ocurrido, **ENTONCES** su registro en el reporte sigue ahí, junto con su llegada tardía. | RF-13 |
| HU-07.CA-15 | **DADO** que el sistema está en servicio, **CUANDO** vence el margen de una asignación sin aviso, **ENTONCES** el reporte sale del sistema con un retraso máximo de un intervalo. Se mide la salida, no la entrega del correo. | RNF-3, RA-3 |
| HU-07.CA-16 | **DADO** un consultor con dos asignaciones hoy, **CUANDO** no avisa en ninguna, **ENTONCES** cada asignación se reporta por separado, al supervisor de cada una y al vencer el margen de cada una. | RF-8, RF-10 («por asignación y día») |
| HU-07.CA-17 | **DADO** un no reportado, **CUANDO** se envía el correo, **ENTONCES** lleva solo los datos de HU-07.CA-2: no lleva documento de identidad ni datos de salud. | RNF-6 |
| HU-07.CA-18 | **DADO** que soy dirección y ningún supervisor está suplido por mí, **CUANDO** corren las ejecuciones, **ENTONCES** no recibo el correo de cada ejecución: lo recibo todo junto en el resumen final. | RF-10 (el correo por ejecución es de «cada supervisor»). Confirmar: PA-B5 |

**Fuera de esta historia:** anotar el motivo (HU-08) · el resumen final (HU-09) · consultar el
reporte por fecha en la aplicación (HU-10) · cambiar los parámetros (HU-11) · escalamiento
automático, recordatorio al consultor y notificación en el móvil (D-36) · garantizar que el correo
se entregó o se leyó (RA-3) · calendario de festivos por cliente, que es característica futura
(D-48): un festivo que sea día laborable de la asignación reporta a todos, y se anota el motivo.

---

## 5. Puntos abiertos

Se llaman **PA-B** para no confundirlos con los PA del discovery ni con los PA-P del PRD.

| # | Punto abierto | Dónde aparece | Por qué importa |
|---|---|---|---|
| PA-B1 | **Cuánto dura una sesión** sin volver a escribir las credenciales. | HU-01.CA-6 | RNF-1 mide el aviso «con sesión vigente»: si la sesión dura poco, el consultor escribe su contraseña casi todos los días y los 5 segundos no se cumplen. Si dura mucho, un teléfono perdido queda abierto |
| PA-B2 | **Cómo recibe una persona su primera credencial y cómo la recupera.** El PRD dice que la carga crea las cuentas; no dice cómo llega la credencial a la persona. | HU-01 | Sin esto nadie puede entrar el primer día. Sin pantallas de administración (D-34), la recuperación tiene que resolverse por otra vía |
| PA-B3 | **¿Una persona tiene un solo rol?** RF-19 («nadie aprueba su propio período») y RF-24 (al desactivar a un supervisor «sus asignaciones como consultor terminan») suponen que un supervisor puede tener además una asignación propia. | HU-02 | Si puede, hay que decir qué ve al abrir la aplicación —el botón de aviso, el reporte, o ambos— y quién supervisa a un supervisor |
| PA-B4 | **Qué ve el consultor cuando su supervisor ya lo contactó.** Hoy el consultor no se entera de que salió en el reporte. | HU-06, HU-07 | Decide si la pantalla del consultor le dice «fuiste reportado hoy». No es necesario para detectar, pero cambia lo que percibe |
| PA-B5 | **¿La dirección recibe el correo de cada ejecución, o solo el resumen final?** RF-10 habla de «cada supervisor». | HU-07.CA-18 | Si la dirección quiere enterarse en el momento, es otro destinatario en cada ejecución |
| PA-B6 | **Los cinco criterios [PROPUESTO] de comportamiento ante error** (HU-01.CA-3, HU-02.CA-9, HU-03.CA-3, HU-06.CA-11 y HU-07.CA-7) son reglas que el PRD no trae. | Sección 4 | Si se aprueban, conviene llevarlas al PRD como requisitos, para que no vivan solo aquí |

---

## 6. Lo que sigue

1. Refutación de este documento con el revisor adversarial y decisión de la Dirección sobre cada
   hallazgo.
2. Paso 5: tickets de las cinco historias detalladas, cruzados contra los doce del README v2.
3. Paso 6: la especificación de las capacidades que estas historias cubren. Las capacidades cuyas
   historias siguen solo listadas —entre ellas el registro de actividad— esperan a que se detallen.
