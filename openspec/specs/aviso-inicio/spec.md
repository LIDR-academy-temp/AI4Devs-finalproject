# Especificación · aviso-inicio

> **Estado: aprobada por la Dirección el 19/11/2026 (D-89), tras siete rondas de revisión
> adversarial.** Ticket H-1.
> Cubre la historia HU-06 (avisar el inicio de actividades en un toque). Cada requisito cita el
> criterio del backlog del que sale o la decisión de la Dirección que lo origina.
> Quién puede ver y crear un aviso está en la especificación `acceso`.

## Propósito

Que el consultor avise con un solo toque que empezó a trabajar, y que ese aviso quede con la hora
del sistema, una sola vez por asignación y día, sin poder cambiarse.

## Alcance de esta entrega

**Entra:** el modelo de cliente, asignación y aviso · la regla de la asignación pendiente · el
registro del aviso · la pantalla del consultor, pensada primero para el navegador del celular.

**En parte:** HU-06.CA-14 (menos de 5 segundos) se comprueba por observación en el despliegue (H-4).

## Vocabulario

- **Día de una asignación:** la fecha en la zona horaria del cliente de esa asignación. Toda
  regla que diga «hoy» o «el día» sobre una asignación usa esa fecha, y el código la obtiene con
  una sola función.
- **Inicio comprometido de hoy:** el instante que resulta de la hora de inicio de la asignación en
  el día de la asignación y la zona horaria de su cliente. **Fin de hoy**, igual con la hora de fin.
- **Vencimiento del margen:** el inicio comprometido más el margen vigente (especificación
  `no-reportados`).
- **Cambio de hora.** En una zona con horario de verano, una hora local puede no existir un día o
  existir dos veces. **Decidido aquí:** si la hora no existe ese día, se toma el primer instante
  válido posterior; si existe dos veces, la primera. Así cada asignación tiene cada día un solo
  inicio y un solo fin.

## Datos

| Tabla | Columnas | Restricciones |
|---|---|---|
| `cliente` | `id` uuid · `organizacion_id` uuid · `alias` text · `zona_horaria` text | PK `id` · FK a `organizacion` · UNIQUE (`organizacion_id`, `alias`) · `zona_horaria` NOT NULL, nombre de la lista estándar de zonas; la base rechaza uno que no reconoce · UNIQUE (`id`, `organizacion_id`) |
| `asignacion` | `id` uuid · `organizacion_id` uuid · `consultor_id` uuid · `supervisor_id` uuid · `cliente_id` uuid · `inicio` date · `fin` date · `hora_inicio` time · `hora_fin` time · `dias_laborables` smallint[] | PK `id` · FK compuestas con `organizacion_id` a `usuario` (dos veces) y a `cliente` · `fin` admite nulo: sin fecha de fin · CHECK `fin` no anterior a `inicio` · CHECK `hora_fin` posterior a `hora_inicio` · `dias_laborables` NOT NULL, por defecto lunes a viernes, con valores de 1 (lunes) a 7 (domingo), **al menos un día y ninguno repetido** · CHECK `supervisor_id` distinto de `consultor_id` · **lo mismo vale para el consultor: se rechaza un `consultor_id` sin el rol `consultor`, y quitar ese rol a quien tiene una asignación que no ha terminado, con el mismo cálculo del día y un candado igual, sobre la fila del consultor en `usuario`** · **cuando un disparador toma los candados del consultor y del supervisor a la vez, los toma en orden de identificador**, para que dos cambios simultáneos no se bloqueen entre sí · **un disparador rechaza, al crear o cambiar la asignación, un `supervisor_id` que no tenga el rol `supervisor` en `usuario_rol`; y otro, en `usuario_rol`, rechaza quitar ese rol a quien supervisa una asignación que no ha terminado —vigente o que todavía no empieza: `fin` nulo o no anterior al día de la asignación, que la base calcula en la zona horaria de su cliente, no en la del servidor—. Los dos toman primero un candado sobre la fila del supervisor en `usuario`, para que una asignación nueva y un rol quitado a la vez no pasen los dos** · UNIQUE (`id`, `organizacion_id`) |
| `aviso_inicio` | `id` uuid · `organizacion_id` uuid · `asignacion_id` uuid · `fecha` date · `recibido_en` timestamptz · `minutos_retraso` integer | PK `id` · FK compuesta (`asignacion_id`, `organizacion_id`) a `asignacion` · **UNIQUE (`asignacion_id`, `fecha`)** · `recibido_en` NOT NULL · `minutos_retraso` admite nulo: nulo es puntual, un número es llegada tardía · un disparador pone al insertar, venga lo que venga, en `recibido_en` el instante que toma la operación de registro con el candado de la asignación (requisito «Registrar el aviso»), en `fecha` el día que ese instante es en la zona horaria del cliente y en `minutos_retraso` la clasificación calculada con ese mismo `recibido_en` · un disparador rechaza editar o quitar, para cualquier rol · **el permiso de insertar en la tabla lo tiene solo un rol propio de la operación de registro, que es su dueño y no puede conectarse a la base**: solo actúa cuando alguien llama a la operación, que corre con sus privilegios. Ninguna identidad con la que se conecte el sistema en servicio lo tiene, tampoco la credencial del sistema: la base se lo niega por permiso, no por regla. El dueño de las tablas, que usan las migraciones y las pruebas automatizadas, nunca lo usa el sistema en servicio |

`fecha` es el día de la asignación en que se recibió el aviso. La regla general de las tres
especificaciones aplica aquí: toda columna es NOT NULL salvo las que dicen «admite nulo».

El CHECK de supervisor distinto de consultor es una barrera en la base. El criterio HU-02.CA-12
habla de que la carga lo rechace con su mensaje, y eso sigue esperando a HU-05.

**Decidido aquí:** el supervisor de una asignación debe tener el rol `supervisor`, y la base lo
mantiene en las dos direcciones: no deja crear la asignación sin el rol ni quitar el rol mientras
supervise una asignación que no ha terminado. Para quitárselo, antes se cambia el supervisor de sus asignaciones.
**Igual con el consultor:** el consultor de una asignación debe tener el rol `consultor`, y no se
le quita mientras tenga una asignación que no ha terminado. Así nadie avisa por tener una
asignación sin que ningún rol se lo permita.

*Construido en HU-06.1 (25/11/2026):* las tres tablas, con sus llaves, sus CHECK, el único aviso
por asignación y día, y los dos disparadores que impiden editar, quitar o vaciar avisos, en toda
escritura y con cualquier rol, también el dueño de la tabla (migración
`20261125170000_aviso_modelo`, `tests/base/prueba-aviso-modelo.py`). **Hasta dónde llega esa
garantía (revisión del tramo 4, ronda 1):** un disparador no puede impedir que el dueño de la
tabla lo apague o lo quite antes de escribir, porque `ALTER TABLE` es suyo. Ese dueño es el rol de
las migraciones, que el sistema en servicio no usa y que queda dentro del límite de confianza; la
garantía vale frente a toda identidad con la que el sistema se conecta, la credencial del sistema
incluida. El caso P11 de `tests/base/prueba-aviso-modelo.py` deja escrito ese límite.
Ninguna identidad con la que se conecte el sistema en servicio puede insertar avisos, tampoco la
credencial del sistema. **Quedan para su ticket:** los disparadores de los roles de la asignación,
con sus candados, necesitan la tabla `usuario_rol` y van en HU-02.1; el disparador que pone la
hora, la fecha y la clasificación, y el rol propio de la operación de registro, van en HU-06.3,
que también necesita el margen de `parametro` (HU-07.1).

## Requisitos

### Requirement: La asignación es coherente en la base

El sistema DEBE rechazar en la base una asignación cuyo supervisor no tenga el rol `supervisor`,
cuyo consultor no tenga el rol `consultor`, o cuyos días laborables estén vacíos o repetidos, y
DEBE rechazar quitar el rol `supervisor` a quien supervisa, o el rol `consultor` a quien tiene,
una asignación que no ha terminado, vigente o que todavía no empieza, según el día de la
asignación en la zona de su cliente (Vocabulario). Una asignación así no tendría a quién enviar su
correo, o no tendría ningún día de trabajo, y las reglas de esta especificación y de
`no-reportados` la tratarían como válida.

Origen: HU-02.CA-12; hallazgos de la tercera ronda de revisión de esta especificación.

#### Scenario: supervisor sin el rol
- **DADO** un usuario de la organización que solo tiene el rol `consultor`
- **CUANDO** se intenta crear una asignación con él como supervisor
- **ENTONCES** la base la rechaza

#### Scenario: quitar el rol a quien supervisa
- **DADO** un supervisor de una asignación vigente, o de una que empieza mañana
- **CUANDO** se intenta quitarle el rol `supervisor` en `usuario_rol`
- **ENTONCES** la base lo rechaza y el rol sigue

#### Scenario: el último día lo marca el cliente
- **DADO** un supervisor cuya única asignación tiene `fin` hoy en la zona de su cliente, cuando en la zona del servidor ya es mañana
- **CUANDO** se intenta quitarle el rol `supervisor`
- **ENTONCES** la base lo rechaza: para el cliente la asignación todavía no terminó

#### Scenario: consultor sin el rol
- **DADO** un usuario de la organización sin el rol `consultor`
- **CUANDO** se intenta crear una asignación con él como consultor
- **ENTONCES** la base la rechaza

#### Scenario: quitar el rol a quien tiene una asignación
- **DADO** el consultor de una asignación vigente, o de una que empieza mañana
- **CUANDO** se intenta quitarle el rol `consultor` en `usuario_rol`
- **ENTONCES** la base lo rechaza y el rol sigue

#### Scenario: días laborables vacíos o repetidos
- **CUANDO** se intenta guardar una asignación con `dias_laborables` vacío, o con un día repetido
- **ENTONCES** la base la rechaza

### Requirement: Asignación pendiente de aviso

El sistema DEBE decidir, en un solo lugar del código y a partir del instante actual, si una
asignación está pendiente de aviso. Lo está cuando se cumplen todas estas condiciones, evaluadas en
el día de la asignación:

1. El día está dentro de su vigencia: no antes de `inicio` ni después de `fin`.
2. El día es uno de sus días laborables.
3. No tiene aviso para ese día.
4. El instante actual no pasó del fin de hoy.

Se puede avisar desde que empieza el día de la asignación, aunque falte para la hora de inicio.

Origen: HU-06.CA-4, HU-06.CA-8, RF-6, D-44.

#### Scenario: antes de la hora de inicio
- **DADO** una asignación con inicio a las 08:00
- **CUANDO** son las 06:30 de un día laborable en la zona horaria del cliente
- **ENTONCES** está pendiente de aviso

#### Scenario: terminó el horario
- **DADO** una asignación con fin a las 17:00 y sin aviso hoy
- **CUANDO** son las 17:01 en la zona horaria del cliente
- **ENTONCES** no está pendiente

#### Scenario: la hora de inicio no existe ese día
- **DADO** una asignación con inicio a las 02:30 en una zona donde ese día el reloj salta de las 02:00 a las 03:00
- **CUANDO** se calcula su inicio comprometido
- **ENTONCES** es el instante de las 03:00 de esa zona, y es uno solo

#### Scenario: el día lo marca el cliente
- **DADO** una asignación de lunes a viernes cuyo cliente está en una zona donde ya es sábado
- **CUANDO** en la zona del servidor todavía es viernes
- **ENTONCES** no está pendiente

### Requirement: Motivo cuando no hay botón

El sistema DEBE decir por qué no hay botón cuando el consultor no tiene ninguna asignación
pendiente. Los motivos son seis: no tiene ninguna asignación · hoy no es día laborable de la
asignación · la asignación ya terminó · la asignación todavía no empieza · ya avisó · el horario de
hoy ya terminó.

Origen: HU-06.CA-8. «No tiene ninguna asignación» viene del recorte (HU-02.3 diferido: quien no
tiene asignación ve un mensaje simple).

**Decidido aquí**, porque el backlog no lo dice: con más de una asignación y ninguna pendiente se
muestra un solo motivo, el primero que aplique en este orden: ya avisó · el horario de hoy ya
terminó · hoy no es día laborable · la asignación todavía no empieza · la asignación ya terminó.
Si el motivo se refiere a una asignación y varias lo cumplen, se muestra el de la que tiene el
inicio comprometido de hoy más temprano, y ante un empate la de identificador menor: la misma
regla de «Cuál asignación toca».

#### Scenario: ya avisó
- **DADO** un consultor con una asignación y su aviso de hoy
- **CUANDO** abre la aplicación
- **ENTONCES** no ve el botón, ve que ya avisó y la hora de su aviso

#### Scenario: cada motivo
- **DADO** un consultor cuya única asignación cae en uno de los otros cuatro motivos
- **CUANDO** abre la aplicación
- **ENTONCES** no ve el botón y ve ese motivo, y no otro

#### Scenario: sin ninguna asignación
- **DADO** un usuario con rol `consultor` y ninguna asignación
- **CUANDO** abre la aplicación
- **ENTONCES** no ve el botón y ve que no tiene ninguna asignación

#### Scenario: ya avisó en dos asignaciones
- **DADO** un consultor que hoy avisó en su asignación de las 08:00 y en la de las 14:00
- **CUANDO** abre la aplicación después de las 14:00
- **ENTONCES** ve que ya avisó, con el cliente y la hora del aviso de la de las 08:00, y siempre la misma

### Requirement: Cuál asignación toca

El sistema DEBE ofrecer el aviso de una sola asignación a la vez: de las pendientes, la que tiene el
inicio comprometido de hoy más temprano. La pantalla dice de qué cliente es.

Origen: HU-06.CA-9, D-40.

**Punto E-7 — riesgo aceptado en D-58, con lo que el sistema hace:** cuando las asignaciones de una
persona tienen clientes en días distintos, «la primera del día» no está definida por el backlog.
El sistema compara los inicios comprometidos como instantes, sin mirar la fecha local de cada uno,
y ante un empate toma la de identificador menor. El resultado es siempre el mismo para el mismo
instante; no se afirma que sea el que la persona espera en ese caso.

#### Scenario: dos asignaciones, ninguna avisada
- **DADO** un consultor con asignaciones que hoy empiezan a las 08:00 y a las 14:00
- **CUANDO** abre la aplicación a las 07:50
- **ENTONCES** el botón es el de la de las 08:00 y muestra su cliente

#### Scenario: la primera ya tiene aviso
- **DADO** el mismo consultor, con aviso en la de las 08:00
- **CUANDO** abre la aplicación
- **ENTONCES** el botón es el de la de las 14:00

### Requirement: Registrar el aviso

El sistema DEBE registrar el aviso de la asignación que toca cuando el consultor lo pide. **Todo
el registro —comprobar qué toca, la fecha, la hora y la clasificación— ocurre en una sola
operación de la base, en este orden:**

1. **Se llama con la sesión de la persona**, no con la credencial del sistema. La operación deduce
   de esa sesión quién es el consultor y cuál es su organización, y solo acepta una asignación
   que sea de ese consultor y de esa organización. Así, aunque el código del servidor se
   equivocara de asignación, la base no escribe un aviso de otra persona ni de otra organización.
   Como esa operación es la única que inserta en la tabla, **exige ella misma las condiciones de la
   regla de la base** (especificación `acceso`, «Separación por organización en la base»): usuario
   activo y sesión vigente. Sin ellas no registra nada.
2. **Toma el candado de la asignación**, el mismo que toma la clasificación (especificación
   `no-reportados`): uno espera a que el otro termine.
3. **Toma un solo instante, ya con el candado,** y con él comprueba qué toca y calcula la fecha,
   la hora y la clasificación. Ese instante es «la hora en que el sistema recibe el toque» de
   HU-06.CA-2 y D-55, y no el reloj del teléfono. Como la comprobación y la escritura usan el mismo
   instante, una petición que lo toma a las 23:59:59 del martes queda en el martes aunque termine
   de escribirse el miércoles.

**Decidido aquí: «la hora en que el sistema recibe el toque» es el instante en que la operación ya
tiene el candado.** La diferencia con la llegada de la petición es lo que tarda en llegar a la base
y en conseguir el candado. Esa espera está acotada: el candado es por asignación, y la
clasificación lo suelta al terminar con esa asignación (especificación `no-reportados`, cada
asignación en su propia transacción), así que solo se espera lo que tarda clasificar una
asignación. No se mide ni se corrige. Si esa espera cruza la medianoche o el vencimiento del
margen, cuenta el instante con candado: la petición puede responder que la pantalla quedó vieja,
o quedar como llegada tardía. Tomar el instante antes del candado dejaría pasar un aviso puntual
junto a un no reportado, que HU-07.CA-20 no admite.

Con este orden no queda nunca un aviso puntual junto a un no reportado del mismo día: si la
clasificación tomó primero el candado y creó el no reportado, el aviso toma su instante después y
es llegada tardía; si el aviso fue primero, la clasificación lo encuentra y no reporta. Son los dos
resultados que admite HU-07.CA-20. **La prueba de concurrencia que lo demostraría no se escribe en
esta entrega:** es un riesgo aceptado (especificación `no-reportados`, «Riesgos aceptados»).

**La petición lleva dos datos: la asignación y el día de la asignación que la pantalla le
ofreció.** No dice de quién es, ni la hora, ni proyecto, actividad o descripción; si algo de eso
viniera, se ignora. Quién es lo dice la sesión. Con lo nombrado el servidor hace una de seis
cosas:

- Es del consultor y **ya tiene aviso ese día:** devuelve ese aviso y no crea nada.
- Es del consultor, **el día nombrado ya no es el día de la asignación** y no tiene aviso ese día:
  no crea nada y responde que la pantalla quedó vieja y hay que volver a abrirla.
- Es del consultor y **es la que toca** en ese instante, el día nombrado: registra el aviso.
- Es del consultor, está pendiente y **no es la que toca:** no crea nada y responde cuál toca.
- Es del consultor, el día nombrado es el de hoy, no tiene aviso y **no está pendiente** (no es
  laborable, no está vigente o su horario terminó): no crea nada y responde su motivo y, si otra
  asignación está pendiente, cuál toca.
- **No es suya** o no existe: responde igual que si no existiera.

Nombrar la asignación y el día no deja elegir: solo se registra la que toca, y solo el día en
curso. Sirve para que una petición repetida —un reintento del navegador que no recibió la
respuesta— devuelva el aviso ya hecho en vez de registrar la asignación siguiente o el día
siguiente.

El aviso lo escribe esa operación de la base, después de aplicar la regla. Ninguna persona puede
insertarlo directamente en la tabla (especificación `acceso`), **y tampoco la credencial del
sistema**, que se salta las reglas pero no tiene el permiso de insertar (Datos): así no hay forma de
avisar por otra asignación, por otra persona o con otra hora, ni de que un defecto en la ejecución
recurrente o en los datos de arranque cree un aviso que evite un no reportado. **Los datos de
arranque no traen avisos:** los avisos nacen usando la aplicación.

Origen: HU-06.CA-2, HU-06.CA-10, HU-02.CA-8, RF-4, RF-7, D-55.

#### Scenario: aviso aceptado
- **DADO** un consultor con una asignación pendiente
- **CUANDO** pide registrar el aviso
- **ENTONCES** queda un aviso con el instante que tomó la operación de registro, y la respuesta trae esa hora

#### Scenario: la hora del teléfono no cuenta
- **CUANDO** la petición incluye una hora distinta
- **ENTONCES** el aviso queda con el instante que tomó la operación de registro

#### Scenario: la base no acepta una asignación ajena aunque el servidor la pida
- **DADO** un consultor de la organización A y una asignación pendiente de la organización B
- **CUANDO** la operación de registro de la base se llama con la sesión de ese consultor y nombra la asignación de B
- **ENTONCES** la base no crea ningún aviso y responde igual que si la asignación no existiera

#### Scenario: la base no acepta la asignación de un compañero aunque el servidor la pida
- **DADO** dos consultores de la misma organización, cada uno con su asignación pendiente
- **CUANDO** la operación de registro de la base se llama con la sesión del primero y nombra la asignación del segundo
- **ENTONCES** la base no crea ningún aviso y responde igual que si la asignación no existiera

#### Scenario: la base no registra sin usuario activo y sesión vigente
- **DADO** un consultor con asignación pendiente cuyo usuario está desactivado, o cuya sesión está cerrada o pasó de `sesion_dias` días, y que conserva un pase que todavía no expira
- **CUANDO** la operación de registro de la base se llama con ese pase
- **ENTONCES** la base no crea ningún aviso

#### Scenario: la credencial del sistema no inserta un aviso
- **CUANDO** la credencial del sistema intenta insertar un aviso directamente en la tabla, para cualquier asignación
- **ENTONCES** la base lo rechaza por falta de permiso y no queda ningún aviso

#### Scenario: la petición nombra otra asignación
- **DADO** un consultor con asignaciones pendientes que hoy empiezan a las 08:00 y a las 14:00
- **CUANDO** a las 07:50 su petición nombra la de las 14:00
- **ENTONCES** no se crea ningún aviso y la respuesta dice que toca la de las 08:00

#### Scenario: reintento con dos asignaciones
- **DADO** el mismo consultor, cuyo aviso de la de las 08:00 quedó registrado sin que su navegador recibiera la respuesta
- **CUANDO** el navegador repite la petición, que nombra la de las 08:00
- **ENTONCES** recibe el aviso ya registrado, y la de las 14:00 sigue sin aviso

#### Scenario: reintento después de la medianoche del cliente
- **DADO** una asignación de lunes a viernes cuyo aviso del martes quedó registrado a las 23:59 sin que el navegador recibiera la respuesta
- **CUANDO** el navegador repite la petición a las 00:01 del miércoles, nombrando la asignación y el martes
- **ENTONCES** recibe el aviso del martes y no se crea ningún aviso del miércoles

#### Scenario: la petición cruza la medianoche mientras se procesa
- **DADO** una asignación de lunes a viernes sin aviso el martes
- **CUANDO** la operación de registro toma su instante a las 23:59:59 del martes y termina de escribir a las 00:00:01 del miércoles
- **ENTONCES** queda un aviso con fecha del martes y hora de las 23:59:59, y el miércoles sigue sin aviso

#### Scenario: nombra una asignación propia que hoy no está pendiente
- **DADO** un consultor con una asignación de lunes a viernes y otra de sábado, pendiente hoy sábado
- **CUANDO** su petición nombra la de lunes a viernes y el día de hoy
- **ENTONCES** no se crea ningún aviso y la respuesta dice que hoy no es día laborable de esa asignación y que toca la de sábado

#### Scenario: la fecha del aviso es la del cliente
- **DADO** un cliente en una zona donde son las 23:50 del martes, mientras en la base ya es miércoles
- **CUANDO** se registra el aviso
- **ENTONCES** su `fecha` es la del martes

#### Scenario: no hay asignación pendiente
- **DADO** un consultor cuyo horario de hoy ya terminó
- **CUANDO** pide registrar el aviso
- **ENTONCES** no se crea nada y la respuesta dice el motivo

### Requirement: Un aviso por asignación y día

El sistema DEBE garantizar en la base que hay como máximo un aviso por asignación y día. Si la
petición se repite, no se crea otro: se devuelve el que existe, con su hora original.

Origen: HU-06.CA-3, RF-5.

#### Scenario: toque repetido
- **DADO** un consultor que ya avisó hoy a las 07:58
- **CUANDO** la petición de aviso llega otra vez
- **ENTONCES** la respuesta trae el aviso de las 07:58 y la base sigue con un solo aviso

#### Scenario: dos peticiones a la vez
- **CUANDO** llegan dos peticiones de aviso de la misma asignación al mismo tiempo
- **ENTONCES** queda un solo aviso y las dos respuestas traen la misma hora

### Requirement: Puntual o llegada tardía

El sistema DEBE clasificar el aviso al registrarlo, con la hora del aviso (el instante que toma la
operación de registro, requisito «Registrar el aviso»). Es puntual si esa hora llega hasta el instante del vencimiento del margen,
incluido ese instante; después es llegada tardía y guarda los minutos de
retraso, contados desde el inicio comprometido y sin fracción. El aviso tardío se acepta igual.

Origen: HU-06.CA-5, HU-06.CA-6, RF-9, RF-13, D-68. Desde dónde se cuentan los minutos: HU-07.CA-2.

#### Scenario: en el instante exacto
- **DADO** inicio a las 08:00 y margen de 60 minutos
- **CUANDO** el aviso se recibe a las 09:00:00
- **ENTONCES** es puntual

#### Scenario: un segundo después
- **CUANDO** el aviso se recibe a las 09:00:01
- **ENTONCES** es llegada tardía, con 60 minutos de retraso

#### Scenario: temprano
- **CUANDO** el aviso se recibe a las 07:10
- **ENTONCES** es puntual

### Requirement: El aviso después de haber sido reportado

El sistema DEBE aceptar el aviso de quien ya salió hoy en el reporte de no reportados, mientras su
horario de hoy no haya terminado. Queda como llegada tardía y el registro del reporte no se borra
ni cambia.

Origen: HU-06.CA-7, HU-07.CA-14, RF-13.

#### Scenario: reportado y después avisa
- **DADO** un consultor reportado hoy a las 09:05
- **CUANDO** avisa a las 09:40
- **ENTONCES** queda su aviso como llegada tardía con 100 minutos, y su fila de no reportado sigue igual

#### Scenario: reportado y ya terminó su horario
- **DADO** un consultor reportado hoy, con fin de horario a las 17:00
- **CUANDO** pide registrar el aviso a las 17:30
- **ENTONCES** no se crea ningún aviso: queda como no reportado ese día

### Requirement: El aviso no se edita ni se quita

El sistema DEBE impedir que un aviso se edite o se quite, por cualquier persona y por cualquier
vía. No existe operación para hacerlo y la base rechaza el intento.

Origen: HU-06.CA-13, D-49.

#### Scenario: intento directo en la base
- **CUANDO** un usuario de cualquier rol, o la credencial del sistema, intenta editar o quitar un aviso
- **ENTONCES** la base lo rechaza y el aviso queda igual

#### Scenario: no hay operación para hacerlo
- **CUANDO** el consultor dueño del aviso llama al sistema pidiendo cambiar su hora o quitarlo
- **ENTONCES** la petición responde como una operación que no existe y el aviso queda igual

### Requirement: Pantalla del consultor

El sistema DEBE mostrar al consultor, al abrir la aplicación:

- Con asignación pendiente: un único botón con el texto «Inicio de Actividades», igual para toda
  modalidad, y el cliente al que corresponde.
- Tras avisar: la confirmación con la hora del aviso, en la zona horaria del cliente.
- Sin asignación pendiente: el motivo.
- Si el aviso no llegó a registrarse: que no quedó registrado, y la forma de reintentar. Nunca una
  confirmación de un aviso que no existe: la confirmación se muestra solo con la respuesta del
  servidor.
- Nunca un mensaje que diga que fue reportado.

Origen: HU-06.CA-1, CA-2, CA-9, CA-11, CA-12, CA-14, CA-15; D-31, D-62.

De HU-06.CA-14 esta especificación fija solo que avisar no pide nada más que un toque. Que tome
menos de 5 segundos **desde que la persona abre la aplicación hasta que ve la confirmación**, con
sesión vigente —la medida que pide el criterio, no solo el toque—, se comprueba por observación en
el despliegue (H-4). La espera del candado (requisito «Registrar el aviso») entra en esa medida y
no tiene tope propio: la observación de H-4 la incluye, y no garantiza las demás veces.

#### Scenario: botón
- **DADO** un consultor con asignación pendiente
- **CUANDO** abre la aplicación
- **ENTONCES** ve un solo botón «Inicio de Actividades» y el nombre del cliente

#### Scenario: falla al registrar
- **CUANDO** toca el botón y la petición falla o no hay conexión
- **ENTONCES** ve que el aviso no quedó registrado y puede reintentar; no ve ninguna hora de confirmación

#### Scenario: la hora es la del cliente
- **DADO** un cliente en una zona horaria distinta de la del teléfono
- **CUANDO** el consultor ve la confirmación
- **ENTONCES** la hora está en la zona del cliente

#### Scenario: reportado hoy
- **DADO** un consultor que hoy salió en el reporte y sigue sin avisar
- **CUANDO** abre la aplicación
- **ENTONCES** ve exactamente lo mismo que un consultor con el aviso pendiente y sin reportar

## Riesgos aceptados

| Riesgo | Decisión | Qué lo cubre mientras tanto |
|---|---|---|
| «La primera asignación del día» con clientes en días distintos (E-7) | D-58 | La regla de arriba da siempre el mismo resultado; los datos de arranque tienen todos los clientes en la misma zona |
| Los datos de arranque no prueban lo que pasa cerca de la medianoche con zonas distintas | D-48, D-58 | Los escenarios de esta especificación que nombran zonas se prueban con reloj controlado en pruebas unitarias |
| Con el cambio de hora, un horario que cae entero en la hora que no existe (por ejemplo, de 02:30 a 02:45 en un salto de 02:00 a 03:00) queda con inicio y fin en el mismo instante. Tampoco hay escenarios para la hora que se repite ni para un fin que no existe | D-85 | Panamá, Lima y Bogotá no tienen horario de verano (comprobado el 19/11/2026), y los clientes de los datos de arranque están en una sola zona |
