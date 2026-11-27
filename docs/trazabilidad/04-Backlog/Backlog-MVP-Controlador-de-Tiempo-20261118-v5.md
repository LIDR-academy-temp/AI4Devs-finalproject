# Backlog — MVP del Controlador de Tiempo

> **Versión 5 · miércoles 18/11/2026 · después de tres rondas de refutación (15, 12 y 12
> hallazgos). Refutación cerrada por la Dirección.**
> La respuesta a la ronda 3 está en `Respuesta-Revision-Thibaut-Backlog-v4-20261118-ronda3.md`
> (decisiones D-65 a D-68).
> Paso 4 del método (PROMPTS 8, 9, 10 y 10b). Fuente: `../03-PRD/PRD-MVP-Controlador-de-Tiempo-20261118-v6.md`,
> que incorpora las decisiones **D-42 a D-68** de `../01-Discovery/discovery-controlador-tiempo.md`.
> **Qué cambió:** las respuestas a las dos rondas están en
> `Respuesta-Revision-Thibaut-Backlog-v1-20261118-ronda1.md` (decisiones D-49 a D-55) y
> `Respuesta-Revision-Thibaut-Backlog-v2-20261118-ronda2.md` (D-56). De la v3 a la v4: se aprobaron
> los once criterios propuestos (D-59) y se cerraron todos los puntos abiertos (D-57, D-58 y D-60
> a D-64).
> Este documento es de **producto**: un criterio dice qué es verdad para el usuario. No nombra
> rutas, códigos de respuesta, tablas ni campos.
> Documento anonimizado: los clientes aparecen como `Cliente A`…, las empresas como `Proveedor A`
> y `Proveedor B`.

**Totales de este documento:** 4 épicas · 18 historias (HU-01 a HU-18) · 6 historias con
criterios de aceptación y 12 solo listadas · 75 criterios (CA) · ninguno marcado como propuesto:
los once de la v3 se aprobaron (D-59) · 10 puntos abiertos (PA-B1 a PA-B10), de los cuales 9
están cerrados y 1 sigue abierto (PA-B10, una verificación técnica) · 5 notas para historias aún
no detalladas (N-1 a N-5). **Las notas no están resueltas:** cada una es una regla que hay que
decidir o escribir cuando su historia se detalle; N-1 en particular es una decisión de producto
pendiente.

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
aceptado del PRD). El que no deriva de ninguno se marca como propuesto, con su motivo, hasta que
la Dirección lo decide. En esta versión no queda ninguno: los once de la v3 se aprobaron y su
origen es **D-59**, con el motivo conservado.

**Identificadores.** `HU-nn` para la historia y `HU-nn.CA-n` para el criterio. Son una propuesta:
los fija la Dirección.

---

## 2. Listado de historias (PROMPT 8)

### E1 · Acceso y separación

| # | Historia | Cubre | Detalle |
|---|---|---|---|
| HU-01 | **Como** persona con cuenta, **quiero** entrar con mi propia cuenta, **para** que solo yo use el sistema en mi nombre. | RF-1, RF-2 (parte), RF-24 (parte), RF-25 (parte) | Sección 4 |
| HU-02 | **Como** dirección, **quiero** que cada persona vea y haga solo lo que corresponde a su rol, **para** que nadie lea ni cambie lo que no le toca. | RF-2, RF-11 (parte), RF-19 (parte) | Sección 4 |
| HU-03 | **Como** dirección de una empresa, **quiero** que los datos de mi organización queden separados de los de cualquier otra, **para** que la información de mis clientes y de mi gente no la vea un tercero. | RF-3, y su aplicación a RF-10, RF-14, RF-21 y RF-25 | Sección 4 |
| HU-04 | **Como** dirección, **quiero** desactivar la cuenta de una persona, **para** que deje de entrar desde ese momento y sus asignaciones como consultor terminen ese día, sin perder lo que registró. | RF-24, con sus dos límites: no se desactiva la cuenta propia ni la última de dirección (D-52) | Solo listada |
| HU-05 | **Como** dirección, **quiero** cargar clientes, proyectos, asignaciones, usuarios y catálogo con una carga controlada, **para** arrancar y mantener los datos sin pantallas de administración. | RF-25, RF-8, RF-17 (parte) | Solo listada |

### E2 · Presencia

| # | Historia | Cubre | Detalle |
|---|---|---|---|
| HU-06 | **Como** consultor asignado a un cliente, **quiero** avisar con un solo toque que empecé a trabajar, **para** que mi empresa lo sepa antes que el cliente sin que yo tenga que pensar en qué voy a trabajar. | RF-2 (parte), RF-4, RF-5, RF-6, RF-7, RF-8 (parte), RF-9 (parte), RF-13 (parte) | Sección 4 |
| HU-07 | **Como** supervisor, **quiero** recibir al vencer el margen la lista de quienes siguen sin avisar, **para** llamarlos y saber si están bien, antes de que el cliente me lo diga. | RF-2 (parte), RF-8 (parte), RF-9, RF-10 (parte), RF-11 (parte), RF-13 (parte), RF-14 (parte), RF-24 (parte) | Sección 4 |
| HU-08 | **Como** supervisor, **quiero** anotar el motivo de cada no reportado, **para** que quede constancia de qué pasó sin guardar detalle médico. | RF-12 | Solo listada |
| HU-09 | **Como** supervisor o dirección, **quiero** recibir un resumen al final de la jornada, **para** cerrar el día sabiendo quién no se reportó, quién llegó tarde y por qué. | RF-10 (parte) | Solo listada |
| HU-10 | **Como** supervisor o dirección, **quiero** consultar por fecha los no reportados y las llegadas tardías, **para** revisar lo ocurrido sin depender del correo. | RF-2 (parte), RF-11 (parte), RF-13 (parte) | Sección 4 |
| HU-11 | **Como** dirección, **quiero** que el margen, el intervalo, la duración de la sesión y la del enlace de contraseña sean parámetros que se cambian por script, **para** ajustarlos sin modificar el sistema. | RF-14 (D-60, D-63, D-64) | Solo listada |

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
| HU-18 | **Como** dirección, **quiero** que quede registro de quién hizo cada cosa y cuándo, **para** poder responder ante un reclamo con un registro que no se puede cambiar ni borrar desde la aplicación. | RF-23 | Solo listada |

### Validación contra el alcance

Ninguna de las 18 historias se sale del MVP. En las seis detalladas, lo que el PRD dejó fuera
aparece como **«Fuera de esta historia»**, para que no se cuele al construir. Las doce solo
listadas todavía no llevan ese bloque: se escribe cuando se detallen, y ninguna pasa a tickets
antes de eso.

**No todas se prueban solas.** Tres criterios de HU-03 comprueban la separación sobre capacidades
de historias aún no construidas (exportación, carga y parámetros). Van marcados con **«Depende
de»**: se escriben aquí para que no se olviden y se comprueban cuando esa historia se construya.
HU-03 se da por aceptada con los demás, y esos tres quedan como condición de aceptación de la
historia de la que dependen.

El README v2 dice que el backlog tiene «cinco historias». Son las mismas capacidades, agrupadas más
grueso. La correspondencia con las
tres que el README documenta es: Historia 1 del README → HU-06 · Historia 2 → HU-07, HU-08, HU-09 y
HU-11 · Historia 3 → HU-14, HU-15, HU-16 y HU-17.

---

## 3. Cobertura en los dos sentidos

### De requisito a historia

| Requisito | Historia | | Requisito | Historia |
|---|---|---|---|---|
| RF-1 | HU-01 | | RF-13 | HU-06, HU-07, HU-10 |
| RF-2 | HU-01, HU-02, HU-06, HU-07, HU-10 | | RF-14 | HU-03, HU-07, HU-11 |
| RF-3 | HU-03 | | RF-15 | HU-12, HU-13 |
| RF-4 | HU-06 | | RF-16 | *Retirado en el PRD v3* |
| RF-5 | HU-06 | | RF-17 | HU-05, HU-12 |
| RF-6 | HU-06 | | RF-18 | HU-14 |
| RF-7 | HU-06 | | RF-19 | HU-02, HU-15 |
| RF-8 | HU-05, HU-06, HU-07 | | RF-20 | HU-16 |
| RF-9 | HU-06, HU-07 | | RF-21 | HU-03, HU-17 |
| RF-10 | HU-03, HU-07, HU-09 | | RF-22 | HU-17 |
| RF-11 | HU-02, HU-07, HU-10 | | RF-23 | HU-18 |
| RF-12 | HU-08 | | RF-24 | HU-01, HU-04, HU-07 |
| | | | RF-25 | HU-01, HU-03, HU-05 |

**Resultado:** los 24 requisitos vigentes tienen al menos una historia. RF-16 está retirado y no
lleva historia. **Regla de esta tabla:** un requisito aparece en toda historia que tenga al menos
un criterio cuyo origen lo cite. La tabla, la columna «Cubre» de la sección 2 y el origen de los
75 criterios se comprobaron entre sí con un cruce automático, sin diferencias.

### De historia a requisito

Las 18 historias derivan de al menos un requisito funcional; ninguna es huérfana. Los criterios que
no derivaban del PRD v4 llevan origen **D-59** en la sección 4, y el PRD v5 ya los recoge.

### Requisitos no funcionales

No son historias. Se comprueban dentro de las historias que tocan: RNF-1 (fricción) en HU-06 para
el aviso en 5 segundos, y en HU-12 para el registro en 60 segundos, que queda pendiente hasta que
HU-12 se detalle ·
RNF-3 y RNF-4 (oportunidad y recuperación) en HU-07 · RNF-6 (datos personales mínimos) en HU-07 y
HU-08 · RNF-7 (idioma y hora) en todas. RNF-2, RNF-5 y RNF-8 son condiciones de construcción y de
operación: van a los tickets, no a los criterios.

---

## 4. Historias con criterios de aceptación (PROMPTS 9 y 10)

Se detallan seis: las tres de acceso, porque sin ellas no se puede probar nada de lo demás; las dos
primeras de presencia, que resuelven el primer dolor; y la consulta del reporte (HU-10), porque el
plazo del reporte se mide sobre que quede consultable (D-51). Las otras doce se detallan cuando les
toque construirse.

---

### HU-01 · Entrar con cuenta propia

> **Como** persona con cuenta, **quiero** entrar con mi propia cuenta, **para** que solo yo use el
> sistema en mi nombre.

| # | Criterio | Origen |
|---|---|---|
| HU-01.CA-1 | **DADO** que tengo una cuenta activa, **CUANDO** entro con mis credenciales, **ENTONCES** accedo al sistema y veo lo que corresponde a mi rol. | RF-1, RF-2 |
| HU-01.CA-2 | **DADO** que no he iniciado sesión, **CUANDO** intento abrir cualquier parte del sistema, **ENTONCES** no veo ningún dato, no puedo registrar nada y se me pide entrar. | RF-1 |
| HU-01.CA-3 | **DADO** que escribo credenciales que no son correctas, **CUANDO** intento entrar, **ENTONCES** no entro y el mensaje es el mismo exista o no la cuenta. | D-59. Motivo: un mensaje distinto le dice a un extraño qué correos tienen cuenta |
| HU-01.CA-4 | **DADO** que mi cuenta fue desactivada, **CUANDO** intento entrar con mis credenciales correctas, **ENTONCES** no entro. | RF-24 |
| HU-01.CA-5 | **DADO** que tengo una sesión abierta, **CUANDO** la dirección desactiva mi cuenta, **ENTONCES** no puedo seguir usando esa sesión: lo siguiente que intento se rechaza. | RF-24 |
| HU-01.CA-6 | **DADO** que ya entré desde mi teléfono, **CUANDO** vuelvo a abrir la aplicación mientras mi sesión sigue vigente, **ENTONCES** estoy dentro sin volver a escribir mis credenciales. La sesión dura 30 días; el valor es un parámetro. | RNF-1 («con sesión vigente»), D-60 |
| HU-01.CA-7 | **DADO** que tengo una sesión abierta, **CUANDO** la cierro, **ENTONCES** para volver a usar el sistema tengo que entrar de nuevo. | D-59. Motivo: un teléfono prestado o perdido |
| HU-01.CA-8 | **DADO** que la dirección cargó mi cuenta, **CUANDO** queda creada, **ENTONCES** recibo en mi correo un enlace para fijar mi contraseña; nadie más la conoce, y hasta que la fijo no puedo entrar. | RF-25, D-50 |
| HU-01.CA-9 | **DADO** un enlace para fijar la contraseña, **CUANDO** ya se usó una vez, pasó su plazo, la cuenta fue desactivada, se pidió un enlace más reciente o ya se fijó una contraseña nueva, **ENTONCES** deja de servir: quien lo abra no puede fijar ni cambiar la contraseña. | D-59. Motivo: un enlace que sigue vivo en un correo reenviado o en un buzón ajeno entrega la cuenta. El plazo es de 72 horas y es un parámetro (D-63) |
| HU-01.CA-10 | **DADO** que olvidé mi contraseña, **CUANDO** lo indico en la pantalla de entrada con mi correo, **ENTONCES** recibo un enlace igual al de HU-01.CA-9 para fijar una nueva; la respuesta en pantalla es la misma exista o no una cuenta con ese correo. Si la cuenta no existe o está desactivada, no se envía ningún correo. | D-61, D-59, RF-24 |
| HU-01.CA-11 | **DADO** que tengo sesiones abiertas en uno o más dispositivos, **CUANDO** fijo una contraseña nueva, **ENTONCES** las demás sesiones se cierran: en esos dispositivos hay que entrar de nuevo con la contraseña nueva. | RF-1, D-65 |
| HU-01.CA-12 | **DADO** que trabajo para dos empresas, **CUANDO** entro, **ENTONCES** uso dos cuentas distintas, cada una con el correo de su empresa, y cada cuenta entra solo a su organización. Un mismo correo nunca pertenece a dos cuentas. | RF-1, D-66 |

**Fuera de esta historia:** que otra persona restablezca mi contraseña: no hay pantallas de
administración (D-34) · la
carga inicial, que la ejecuta quien instala el sistema, fuera de la aplicación (D-50) · entrar con la cuenta de otro proveedor de identidad · acceso de aplicaciones
externas (D-23).

---

### HU-02 · Cada rol ve y hace solo lo suyo

> **Como** dirección, **quiero** que cada persona vea y haga solo lo que corresponde a su rol,
> **para** que nadie lea ni cambie lo que no le toca.

| # | Criterio | Origen |
|---|---|---|
| HU-02.CA-1 | **DADO** que soy consultor, **CUANDO** uso el sistema, **ENTONCES** veo solo mis avisos, mis registros y mis períodos; registro mis avisos y mis registros; y corrijo mis registros. El aviso no se corrige ni se quita (HU-06.CA-13). | RF-2, D-49 |
| HU-02.CA-2 | **DADO** que soy consultor, **CUANDO** intento ver o cambiar un aviso, un registro o un período de otro consultor, **ENTONCES** no lo veo y no cambia nada: el sistema responde igual que si ese dato no existiera. | RF-2, D-67 |
| HU-02.CA-3 | **DADO** que soy consultor, **CUANDO** intento abrir el reporte de no reportados, **ENTONCES** no accedo. | RF-11 |
| HU-02.CA-4 | **DADO** que soy supervisor, **CUANDO** uso el sistema, **ENTONCES** veo lo de los consultores que superviso, y puedo anotar motivos, aprobar períodos y exportar. Si además tengo un período propio, no puedo aprobarlo yo. | RF-2, RF-19 |
| HU-02.CA-5 | **DADO** que soy supervisor, **CUANDO** intento ver o aprobar lo de un consultor que supervisa otra persona de mi misma organización, **ENTONCES** no lo veo y no cambia nada. | RF-2, D-47 |
| HU-02.CA-6 | **DADO** que soy dirección, **CUANDO** uso el sistema, **ENTONCES** veo todo lo de mi organización y puedo hacer lo que hace un supervisor sobre cualquier consultor de ella, salvo aprobar un período que sea mío. | RF-2, RF-19 |
| HU-02.CA-7 | **DADO** que soy consultor o supervisor, **CUANDO** intento cargar datos, desactivar una cuenta o cambiar un parámetro, **ENTONCES** la operación se rechaza y no cambia nada. | RF-2 |
| HU-02.CA-8 | **DADO** que soy supervisor o dirección, **CUANDO** intento registrar un aviso o un registro de actividad a nombre de un consultor, **ENTONCES** no puedo: eso lo hace solo el propio consultor. | RF-2 («registra y corrige solo lo propio») |
| HU-02.CA-9 | **DADO** que intento una operación que mi rol no permite (cargar datos, cambiar un parámetro, aprobar sin ser supervisor), **CUANDO** se rechaza, **ENTONCES** veo un mensaje que dice que no tengo permiso, en español, y el intento no deja ningún cambio. | D-59. Motivo: un rechazo en silencio parece una falla del sistema |
| HU-02.CA-10 | **DADO** que soy supervisor o dirección y además tengo una asignación propia, **CUANDO** uso el sistema, **ENTONCES** sobre lo mío actúo como cualquier consultor —aviso, registro, corrijo mis registros y envío mi período— y conservo sobre los demás lo que mi rol permite. | D-56 |
| HU-02.CA-11 | **DADO** que soy supervisor o dirección con una asignación pendiente de aviso hoy, **CUANDO** abro la aplicación, **ENTONCES** veo primero el botón de aviso, y desde ahí llego a los reportes. | D-59. Motivo: avisar es lo que corre contra el margen; lo demás puede esperar un toque |
| HU-02.CA-12 | **DADO** una asignación, **CUANDO** se carga, **ENTONCES** su supervisor es una persona distinta de su consultor; la carga rechaza la que nombre a la misma persona en los dos lugares. | D-59. Motivo: sin eso, quien se supervisa a sí mismo recibiría su propio reporte y nadie podría aprobarle el mes. Depende de HU-05 |

**Fuera de esta historia:** el rol de aprobador del cliente, que no existe en el MVP (D-45) ·
pantallas para administrar roles (D-34): el rol llega con la carga de datos (HU-05).

---

### HU-03 · Ninguna organización ve a otra

> **Como** dirección de una empresa, **quiero** que los datos de mi organización queden separados de
> los de cualquier otra, **para** que la información de mis clientes y de mi gente no la vea un
> tercero.

| # | Criterio | Origen |
|---|---|---|
| HU-03.CA-1 | **DADO** que pertenezco a una organización, **CUANDO** consulto cualquier lista o reporte, **ENTONCES** solo aparecen datos de mi organización, sea cual sea mi rol. | RF-3 |
| HU-03.CA-2 | **DADO** que soy dirección de mi organización, **CUANDO** intento ver o cambiar un dato de otra organización, **ENTONCES** no lo veo y no cambia nada: el rol más alto tampoco cruza la frontera. | RF-3 |
| HU-03.CA-3 | **DADO** que conozco o adivino la dirección exacta de un dato de otra organización, **CUANDO** intento abrirlo, **ENTONCES** el sistema responde igual que si ese dato no existiera. | D-59. Motivo: decir «existe, pero no es tuyo» ya revela información de un tercero |
| HU-03.CA-4 | **DADO** que soy supervisor o dirección, **CUANDO** recibo un correo de no reportados o un resumen final, **ENTONCES** trae solo personas y clientes de mi organización. | RF-3 aplicado a RF-10 |
| HU-03.CA-5 | **DADO** que exporto un período, **CUANDO** se genera el archivo, **ENTONCES** contiene solo datos de mi organización. | RF-3 aplicado a RF-21. **Depende de** HU-17 |
| HU-03.CA-6 | **DADO** que soy dirección y hago una carga de datos, **CUANDO** se procesa, **ENTONCES** todo lo cargado queda en mi organización y nada de otra cambia. | RF-3 aplicado a RF-25. **Depende de** HU-05 |
| HU-03.CA-7 | **DADO** que el margen o el intervalo se cambian en una organización, **CUANDO** el cambio entra en vigor, **ENTONCES** las demás organizaciones conservan los suyos. | RF-14 («uno de cada uno por organización»). **Depende de** HU-11 |

**Fuera de esta historia:** la carga inicial que crea una organización nueva y su primera cuenta de
dirección, que la ejecuta quien instala el sistema (HU-05, D-50) · separar a los dos proveedores dentro de una misma organización, que sigue
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
| HU-06.CA-2 | **DADO** que veo el botón, **CUANDO** lo toco, **ENTONCES** el aviso queda registrado con la hora en que el sistema recibe el toque, no con la del reloj de mi teléfono, y veo la confirmación con esa hora. | RF-4, D-55 |
| HU-06.CA-3 | **DADO** que ya avisé hoy para esa asignación, **CUANDO** vuelvo a tocar o repito el intento, **ENTONCES** no se crea otro aviso: veo el que ya existe, con su hora original. | RF-5 |
| HU-06.CA-4 | **DADO** que llego antes de mi hora de inicio comprometida, **CUANDO** toco el botón, **ENTONCES** el aviso se acepta: se puede avisar desde que empieza el día en la zona horaria del cliente. | D-44 |
| HU-06.CA-5 | **DADO** que aviso dentro del margen, **CUANDO** queda registrado, **ENTONCES** no cuenta como llegada tardía. El instante exacto en que vence el margen cuenta como dentro: con inicio a las 08:00 y margen de 60 minutos, un aviso a las 09:00 en punto es puntual. | RF-9, D-68 |
| HU-06.CA-6 | **DADO** que aviso después de vencido el margen, **CUANDO** queda registrado, **ENTONCES** el aviso se acepta igual y queda marcado como llegada tardía, con sus minutos de retraso. | RF-9, RF-13 |
| HU-06.CA-7 | **DADO** que ya salí en el reporte de no reportados de hoy y mi horario de hoy no ha terminado, **CUANDO** aviso después, **ENTONCES** el aviso se acepta como llegada tardía y mi registro en el reporte no se borra. Terminado el horario ya no hay botón (HU-06.CA-8): quien no avisó queda como no reportado ese día. | RF-13, RF-6 |
| HU-06.CA-8 | **DADO** que hoy no tengo una asignación pendiente de aviso, **CUANDO** abro la aplicación, **ENTONCES** no veo el botón y veo el motivo. Los motivos son: hoy no es día laborable de mi asignación · mi asignación ya terminó · mi asignación todavía no empieza · ya avisé · el horario de hoy ya terminó. | RF-6, D-44 |
| HU-06.CA-9 | **DADO** que tengo dos asignaciones hoy, **CUANDO** abro la aplicación, **ENTONCES** el botón corresponde a la primera del día que aún no tiene aviso y cuyo horario no ha terminado, y veo de qué cliente es. | RF-4, D-40. «Veo de qué cliente es»: D-59. Motivo: con dos asignaciones, avisar sin saber a cuál desconcierta |
| HU-06.CA-10 | **DADO** que toco el botón, **CUANDO** se registra el aviso, **ENTONCES** no se me pide proyecto, actividad ni descripción. | RF-7 |
| HU-06.CA-11 | **DADO** que toco el botón, **CUANDO** el aviso no llega a registrarse (sin conexión o falla), **ENTONCES** veo que no quedó registrado y puedo reintentar; nunca veo una confirmación de un aviso que no existe. | D-59. Motivo: una confirmación falsa convierte en no reportado a quien sí avisó |
| HU-06.CA-12 | **DADO** que avisé, **CUANDO** veo la hora del aviso, **ENTONCES** está en la zona horaria del cliente de la asignación. | RF-8, RNF-7 |
| HU-06.CA-13 | **DADO** que avisé, **CUANDO** busco cambiar la hora de ese aviso o quitarlo, **ENTONCES** no hay forma de hacerlo. | RF-2, D-49 |
| HU-06.CA-14 | **DADO** que tengo sesión vigente, **CUANDO** aviso, **ENTONCES** pasan menos de 5 segundos desde que abro la aplicación hasta la confirmación. Se comprueba por observación con usuarios, no por medición automática. | RNF-1 |
| HU-06.CA-15 | **DADO** que hoy salí en el reporte de no reportados, **CUANDO** abro la aplicación, **ENTONCES** no veo ningún mensaje que me lo diga: veo lo mismo que cualquier consultor con el aviso pendiente. | D-62 |

**Fuera de esta historia:** verificar que de verdad empecé —el aviso es una declaración, no una
verificación (RA-5)— · recordatorio al consultor y aplicación móvil (D-36) · avisar por otra
persona (HU-02.CA-8) · proyectos llave en mano, que no llevan aviso (D-30) · horarios que cruzan la
medianoche (D-41) · dos asignaciones en clientes de zonas horarias distintas: cada una se rige por
el día de su cliente (HU-06.CA-4), y cuál es «la primera del día» cuando esos días no coinciden no
se define: es riesgo aceptado (D-58).

---

### HU-07 · Recibir la lista de no reportados al vencer el margen

> **Como** supervisor, **quiero** recibir al vencer el margen la lista de quienes siguen sin avisar,
> **para** llamarlos y saber si están bien, antes de que el cliente me lo diga.

**La intención manda sobre el diseño (D-62).** La llamada del supervisor es para saber si la
persona está bien. El reporte detecta el silencio para cuidar a la persona y al servicio, no para
vigilar: por eso al consultor no se le muestra que fue reportado (HU-06.CA-15).

Ejemplo que usan los criterios: hora de inicio comprometida 08:00, margen de 60 minutos, intervalo
de 5 minutos. El margen vence a las 09:00 y la primera ejecución posterior es la de las 09:05.

| # | Criterio | Origen |
|---|---|---|
| HU-07.CA-1 | **DADO** un día laborable de la asignación, **CUANDO** corre la primera ejecución posterior al vencimiento del margen y el consultor no ha avisado, **ENTONCES** entra en el reporte de no reportados. En el ejemplo: sin aviso, entra a las 09:05. | RF-9 |
| HU-07.CA-2 | **DADO** un no reportado, **CUANDO** lo veo en el reporte, **ENTONCES** trae nombre, cliente, hora comprometida, minutos de retraso y teléfono de contacto. Los minutos se cuentan desde la hora de inicio comprometida. En el ejemplo: 65. | RF-11. Desde dónde se cuentan: README v2, sección 6 |
| HU-07.CA-3 | **DADO** que el consultor avisó dentro del margen, **CUANDO** corre la ejecución, **ENTONCES** no entra en el reporte. En el ejemplo: aviso a las 08:59. | RF-9 |
| HU-07.CA-4 | **DADO** que el consultor avisó después del margen pero antes de esa ejecución, **CUANDO** corre la ejecución, **ENTONCES** no entra en la lista y su aviso queda como llegada tardía. En el ejemplo: aviso a las 09:02. | RF-9, RF-13, D-35 |
| HU-07.CA-5 | **DADO** que varios de mis supervisados entran en una misma ejecución, **CUANDO** se envía el reporte, **ENTONCES** recibo un solo correo con todos ellos, no uno por persona. | RF-10 |
| HU-07.CA-6 | **DADO** que una persona ya me fue reportada hoy por una asignación, **CUANDO** corren las ejecuciones siguientes, **ENTONCES** no vuelve a salir por esa asignación ese día. Única excepción: la recuperación tras una caída (HU-07.CA-11). | RF-10, RA-6 |
| HU-07.CA-7 | **DADO** que en una ejecución no tengo ningún no reportado nuevo, **CUANDO** corre, **ENTONCES** no recibo ningún correo. | D-59. Motivo: un correo vacío cada 5 minutos enseña a ignorar el que sí importa |
| HU-07.CA-8 | **DADO** que soy supervisor, **CUANDO** recibo el reporte, **ENTONCES** trae solo a quienes yo superviso; no recibo a los de otro supervisor de mi organización. | RF-2, D-47 |
| HU-07.CA-9 | **DADO** que hoy no es día laborable de una asignación, o que la asignación no está vigente hoy, **CUANDO** corren las ejecuciones, **ENTONCES** su consultor no entra en el reporte. | RF-9, RF-8 |
| HU-07.CA-10 | **DADO** que el correo de una ejecución no llegó a salir, **CUANDO** corre la siguiente, **ENTONCES** sale en esa, con los no reportados que quedaron sin notificar. Mientras tanto el reporte ya está consultable en la aplicación, y eso es lo que mide el plazo de HU-07.CA-15. | D-47, D-51 |
| HU-07.CA-11 | **DADO** que el sistema estuvo fuera de servicio a la hora del reporte, **CUANDO** vuelve, **ENTONCES** reporta lo pendiente de ese día. Puede salir un correo repetido, o aparecer quien no pudo avisar porque la aplicación no estaba disponible. | RNF-4, RA-6 |
| HU-07.CA-12 | **DADO** que el supervisor de una asignación tiene la cuenta desactivada, **CUANDO** su consultor no avisa, **ENTONCES** el reporte lo recibe la dirección hasta que se cargue otro supervisor, y la persona desactivada no recibe ningún correo del sistema, ni el de cada ejecución ni el resumen final. | RF-24 |
| HU-07.CA-13 | **DADO** que la dirección cambió hoy el margen o el intervalo, **CUANDO** corren las ejecuciones de hoy, **ENTONCES** siguen usando los valores anteriores; los nuevos rigen desde mañana. | RF-14 |
| HU-07.CA-14 | **DADO** que una persona fue reportada y avisó después, **CUANDO** consulto lo ocurrido, **ENTONCES** su registro en el reporte sigue ahí, junto con su llegada tardía. | RF-13 |
| HU-07.CA-15 | **DADO** que el sistema está en servicio, **CUANDO** vence el margen de una asignación sin aviso, **ENTONCES** el reporte queda generado y consultable en la aplicación con un retraso máximo de un intervalo. Se mide que el reporte exista en el sistema, no la entrega del correo. | RNF-3, RA-3, D-51 |
| HU-07.CA-16 | **DADO** un consultor con dos asignaciones hoy, **CUANDO** no avisa en ninguna, **ENTONCES** cada asignación se reporta por separado, al supervisor de cada una y al vencer el margen de cada una. | RF-8, RF-10 («por asignación y día») |
| HU-07.CA-17 | **DADO** un no reportado, **CUANDO** se envía el correo, **ENTONCES** lleva solo los datos de HU-07.CA-2: no lleva documento de identidad ni datos de salud. | RNF-6 |
| HU-07.CA-18 | **DADO** que soy dirección y ningún supervisor está suplido por mí, **CUANDO** corren las ejecuciones, **ENTONCES** no recibo el correo de cada ejecución: lo recibo todo junto en el resumen final. | RF-10, D-53 |
| HU-07.CA-19 | **DADO** que la dirección desactivó la cuenta de un consultor, **CUANDO** corren las ejecuciones desde el día siguiente, **ENTONCES** ese consultor no entra en el reporte: sus asignaciones terminaron el día de la desactivación. | RF-24 |
| HU-07.CA-20 | **DADO** que un aviso llega en el mismo momento en que corre la ejecución que lo reportaría, **CUANDO** ambos se procesan, **ENTONCES** el resultado es uno solo y coherente: o el aviso queda como llegada tardía sin reporte, o queda el reporte y después la llegada tardía. Nunca las dos cosas a medias ni ninguna. | RF-9, RF-13 |

**Fuera de esta historia:** anotar el motivo (HU-08) · el resumen final (HU-09) · consultar el
reporte por fecha en la aplicación (HU-10) · cambiar los parámetros (HU-11) · escalamiento
automático, recordatorio al consultor y notificación en el móvil (D-36) · garantizar que el correo
se entregó o se leyó (RA-3) · calendario de festivos por cliente, que es característica futura
(D-48): un festivo que sea día laborable de la asignación reporta a todos, y se anota el motivo ·
un tope para el margen: uno más largo que la jornada deja el reporte fuera de ella, y es riesgo
aceptado (D-54, RA-8) · la fecha por zona horaria para decidir desde cuándo rige un parámetro
(D-48).

---

### HU-10 · Consultar por fecha los no reportados y las llegadas tardías

> **Como** supervisor o dirección, **quiero** consultar por fecha los no reportados y las llegadas
> tardías, **para** revisar lo ocurrido sin depender del correo.

| # | Criterio | Origen |
|---|---|---|
| HU-10.CA-1 | **DADO** que soy supervisor, **CUANDO** consulto una fecha, **ENTONCES** veo los no reportados de mis supervisados de ese día, cada uno con nombre, cliente, hora comprometida, minutos de retraso y teléfono, y con su motivo si ya se anotó. | RF-11 |
| HU-10.CA-2 | **DADO** que soy dirección, **CUANDO** consulto una fecha, **ENTONCES** veo los de toda mi organización. | RF-11 |
| HU-10.CA-3 | **DADO** que en esa fecha hubo llegadas tardías, **CUANDO** consulto, **ENTONCES** aparecen en una sección aparte, con sus minutos de retraso. | RF-11, RF-13 |
| HU-10.CA-4 | **DADO** que una persona fue reportada y avisó después, **CUANDO** consulto esa fecha, **ENTONCES** aparece como no reportada y también como llegada tardía. | RF-13 |
| HU-10.CA-5 | **DADO** que soy supervisor, **CUANDO** consulto, **ENTONCES** no veo a los supervisados de otro supervisor de mi organización. | RF-2, D-47 |
| HU-10.CA-6 | **DADO** que soy consultor sin otro rol, **CUANDO** intento abrir la consulta, **ENTONCES** no accedo. | RF-11 |
| HU-10.CA-7 | **DADO** que una ejecución acaba de clasificar a alguien como no reportado, **CUANDO** consulto la fecha de hoy, **ENTONCES** ya aparece, aunque su correo todavía no haya salido. | RNF-3, D-51 |
| HU-10.CA-8 | **DADO** que en la fecha consultada no hubo no reportados ni llegadas tardías, **CUANDO** consulto, **ENTONCES** la aplicación lo dice con esas palabras; no muestra una pantalla vacía. | D-59. Motivo: una pantalla vacía no distingue «no pasó nada» de «algo falló» |
| HU-10.CA-9 | **DADO** un no reportado o una llegada tardía, **CUANDO** veo sus horas, **ENTONCES** están en la zona horaria del cliente de la asignación. | RNF-7 |

**Fuera de esta historia:** anotar el motivo desde la consulta (HU-08) · el resumen final (HU-09) ·
consultar la traza de quién hizo qué (RA-7) · indicadores y tableros · consultar un rango de
fechas o buscar por persona: se consulta un día a la vez.

---

## 5. Puntos abiertos

Se llaman **PA-B** para no confundirlos con los PA del discovery ni con los PA-P del PRD.

| # | Punto abierto | Dónde aparece | Por qué importa |
|---|---|---|---|
| ~~PA-B1~~ | **Cerrado por D-60: 30 días, por parámetro.** ~~Cuánto dura una sesión~~ sin volver a escribir las credenciales. | HU-01.CA-6 | RNF-1 mide el aviso «con sesión vigente»: si la sesión dura poco, el consultor escribe su contraseña casi todos los días y los 5 segundos no se cumplen. Si dura mucho, un teléfono perdido queda abierto |
| ~~PA-B2~~ | **Cerrado por D-61: el mismo enlace por correo, pedido por la propia persona (HU-01.CA-10).** ~~Cómo recupera una persona su contraseña si la olvida.~~ La primera credencial quedó decidida: llega por correo con un enlace para fijarla (D-50, HU-01.CA-8). La recuperación sigue sin decidir. | HU-01 | Sin pantallas de administración (D-34), la recuperación tiene que resolverse por otra vía; el candidato natural es el mismo enlace por correo |
| ~~PA-B3~~ | ~~**¿Una persona tiene un solo rol?**~~ → **Cerrado por D-56:** puede tener más de uno; un supervisor o una dirección puede tener además una asignación propia. Qué ve al abrir y quién lo supervisa quedaron como criterios, ya aprobados (HU-02.CA-11 y CA-12, D-59). | HU-02 | — |
| ~~PA-B4~~ | **Cerrado por D-62: no se le muestra nada; él ya sabe que no avisó, y la llamada es para saber si está bien (HU-06.CA-15).** ~~Qué ve el consultor cuando su supervisor ya lo contactó.~~ Hoy el consultor no se entera de que salió en el reporte. | HU-06, HU-07 | Decide si la pantalla del consultor le dice «fuiste reportado hoy». No es necesario para detectar, pero cambia lo que percibe |
| ~~PA-B5~~ | ~~**¿La dirección recibe el correo de cada ejecución, o solo el resumen final?**~~ → **Cerrado por D-53:** solo el resumen final, salvo cuando suple a un supervisor desactivado. | HU-07.CA-18 | — |
| ~~PA-B6~~ | **Cerrado por D-59: los once se aprobaron.** ~~Los once criterios propuestos esperan decisión de la Dirección:~~ HU-01.CA-3, HU-01.CA-7, HU-01.CA-9, HU-02.CA-9, HU-02.CA-11, HU-02.CA-12, HU-03.CA-3, HU-06.CA-9 (solo la parte «veo de qué cliente es»), HU-06.CA-11, HU-07.CA-7 y HU-10.CA-8. Son reglas que el PRD no trae. | Sección 4 | Ninguno pasa a un ticket como aprobado mientras siga marcado. Los que se aprueben conviene llevarlos al PRD como requisitos, para que no vivan solo aquí |
| ~~PA-B7~~ | **Cerrado por D-63: 72 horas, por parámetro.** ~~Cuánto dura el enlace para fijar la contraseña.~~ | HU-01.CA-9 | Corto protege más; largo evita que quien abre el correo dos días después se quede sin entrar y sin forma de pedir otro (PA-B2) |
| ~~PA-B8~~ | **Cerrado por D-57: guarda el actor «sistema» y el nombre de quien la ejecutó.** ~~¿La traza de la carga inicial guarda quién la ejecutó?~~ Hoy queda con actor «sistema» (D-50), y RF-23 pide saber «quién cargó datos». | HU-05, HU-18 | Si la organización nace con un dato o una cuenta equivocados, «sistema» no dice a quién preguntarle. Propuesta: guardar además el nombre de quien la ejecutó |
| PA-B10 | **Qué admite el servicio de autenticación.** No se ha comprobado si permite fijar la sesión en 30 días y el enlace en 72 horas, ni si esos dos valores pueden ser distintos por organización o son uno solo para todo el sistema. Tampoco qué límite pone a los intentos de entrada fallidos y a las peticiones repetidas de enlace. | HU-01.CA-6, CA-9 y CA-10; HU-11 | Si el servicio solo admite un valor para todo el sistema, D-60 y D-63 se cumplen igual, pero no «por organización». Se comprueba al construir el acceso, antes de escribirlo en la especificación |
| ~~PA-B9~~ | **Cerrado por D-58: los tres se aceptan como riesgo.** ~~Tres huecos de la misma familia: fecha y topes.~~ (a) Cuál es «la primera asignación del día» cuando dos clientes están en días distintos. (b) En qué zona horaria se cuenta «ese día» al desactivar una cuenta (RF-24). (c) El intervalo no tiene tope, igual que el margen: uno de un día entero cumple el plazo «de un intervalo» y anula la detección. | HU-06, HU-07 | (a) y (b) son de la familia del riesgo ya aceptado en D-48; (c), de la del aceptado en D-54. Propuesta: aceptarlos como riesgo, ampliando RA-8 al intervalo |

### Notas para historias aún no detalladas

Salieron en la refutación y pertenecen a historias que todavía no tienen criterios. Se anotan aquí
para que no se pierdan; cada una entra como criterio cuando su historia se detalle.

| # | Nota | Historia |
|---|---|---|
| N-1 | Editar un registro cambiándole la fecha o la asignación puede moverlo de un período a otro. Hay que decir qué pasa con el estado de los dos: el de origen y el de destino. | HU-13, HU-16 |
| N-2 | Todo texto que llega al Excel —empresa, cliente, consultor, supervisor, contraparte, proyecto, actividad, ticket y descripción— debe tratarse siempre como texto, nunca como fórmula. | HU-17 |
| N-3 | La dirección no puede desactivar su propia cuenta ni la última de dirección activa (D-52). | HU-04 |
| N-4 | Las horas de la traza que no pertenecen a una asignación (una carga, un cambio de parámetro, una desactivación) no tienen «zona horaria del cliente». Hay que decir en qué zona se guardan y se muestran. | HU-18 |
| N-5 | La carga rechaza un correo que ya pertenece a otra cuenta, de cualquier organización, y no ata la organización a un dominio de correo (D-66). | HU-05 |

---

## 6. Lo que sigue

1. Comprobar PA-B10 al construir el acceso.
2. Paso 5: tickets de las seis historias detalladas, cruzados contra los doce del README v2.
3. Paso 6: la especificación de las capacidades que estas historias cubren. Las capacidades cuyas
   historias siguen solo listadas —entre ellas el registro de actividad— esperan a que se detallen.
