# Especificación · acceso

> **Estado: aprobada por la Dirección el 19/11/2026 (D-89), tras siete rondas de revisión
> adversarial.** Ticket H-1. Las comprobaciones «por comprobar al construir» de HU-03.1 (sesión
> abierta, 23/11/2026), HU-01.1 (las dos sobre el correo, 25/11/2026) y HU-01.2 (la cookie,
> 25/11/2026) quedaron comprobadas; el resultado está en su requisito.
> Cubre las historias HU-01 (entrar con cuenta propia), HU-02 (cada rol ve y hace solo lo suyo) y
> HU-03 (ninguna organización ve a otra). Cada requisito cita el criterio del backlog del que sale
> o la decisión de la Dirección que lo origina.
> Lo que se afirma del servicio de autenticación está comprobado en la prueba local del ticket
> HU-01.6 (18/11/2026); lo que no se comprobó se dice.

## Propósito

Que solo una persona con cuenta activa use el sistema, que cada una vea y haga lo que su rol
permite, y que los datos de una organización no los vea otra.

## Alcance de esta entrega

**Entra:** entrar y cerrar sesión · vigencia de la sesión · cuenta desactivada · roles y reglas por
rol en la base y en el código · separación por organización en las dos capas.

**No entra (decisión D-73), y por eso no tiene requisitos aquí:** el enlace para fijar la
contraseña y la recuperación (HU-01.CA-8 a CA-11) · la pantalla de inicio según rol (HU-02.CA-11).
Las cuentas de esta entrega nacen con los datos de arranque, con la contraseña ya fijada.

**Operaciones que todavía no existen:** desactivar una cuenta (HU-04), cargar datos (HU-05) y
cambiar un parámetro (HU-11). Donde un requisito parte de una de ellas, esta especificación fija
la regla sobre el estado del dato; que la operación deje el dato así es de su historia.

## Datos

Tipos de PostgreSQL. Toda tabla lleva `organizacion_id` salvo `organizacion`.

**Regla para las tres especificaciones: toda columna es NOT NULL, salvo las que digan «admite nulo».**
Vale en especial para `organizacion_id` y para las columnas de una llave compuesta: con un nulo la
base no comprobaría la relación. La validación de cada migración lo verifica columna por columna.

| Tabla | Columnas | Restricciones |
|---|---|---|
| `organizacion` | `id` uuid · `nombre` text · `sesion_dias` integer · `zona_horaria` text | PK `id` · `nombre` NOT NULL y único · `sesion_dias` NOT NULL, por defecto 30, CHECK mayor que 0 · `zona_horaria` NOT NULL, sin valor por defecto, nombre de la lista estándar de zonas; la base rechaza uno que no reconoce. Da la fecha de hoy de la organización para sus parámetros (D-81, punto E-1 en la especificación `no-reportados`) |
| `usuario` | `id` uuid · `organizacion_id` uuid · `nombre` text · `correo` text · `telefono` text · `activo` boolean | PK `id`, que es el identificador de la cuenta en el servicio de autenticación · FK a `organizacion` · `correo` NOT NULL y **único en todo el sistema**, comparado sin distinguir mayúsculas · `activo` NOT NULL, por defecto verdadero · UNIQUE (`id`, `organizacion_id`), para las llaves compuestas |
| `usuario_rol` | `usuario_id` uuid · `organizacion_id` uuid · `rol` text | PK (`usuario_id`, `rol`) · FK compuesta (`usuario_id`, `organizacion_id`) a `usuario` · CHECK `rol` en `consultor`, `supervisor`, `direccion` |

Las tablas `cliente`, `asignacion` y `aviso_inicio` están en la especificación `aviso-inicio`;
`parametro` y `no_reportado`, en `no-reportados`. Sus reglas de acceso están aquí, en el requisito
«Reglas por rol en la base».

## Requisitos

### Requirement: Entrar con cuenta activa

El sistema DEBE dejar entrar solo a quien presenta el correo y la contraseña de una cuenta cuyo
usuario está activo. Las credenciales las comprueba el servicio de autenticación; el sistema no
guarda contraseñas.

Origen: HU-01.CA-1, HU-01.CA-4.

*Construido en HU-01.2 (25/11/2026):* `entrar`, en `lib/sesion/vigente.ts`. Una entrada que se
rechaza deja el navegador **sin sesión**, también cuando ya tenía una: si no se cortara, seguiría
operando como la persona anterior. Y si la base falla al comprobar el usuario, la sesión recién
creada **se retira** antes de informar: solo queda con sesión quien tiene un usuario comprobado y
activo (las dos, de la revisión del tramo 4, ronda 1). **Rechazada quiere decir rechazada por el
servicio** —responde con el estado de su API—: si lo que falla es el servicio mismo, no se corta
nada, porque una falla pasajera sacaría de su sesión a quien ya estaba dentro (revisión interna de
esa ronda). **Límite declarado:** quien lo intenta ve el mensaje único en los dos casos, porque lo
exige «Mensaje único ante credenciales incorrectas»; distinguir una indisponibilidad del servicio
en la pantalla es de HU-01.3.

#### Scenario: credenciales correctas y cuenta activa
- **DADO** un usuario activo
- **CUANDO** entra con su correo y su contraseña
- **ENTONCES** queda con sesión iniciada y llega a su pantalla

#### Scenario: cuenta desactivada
- **DADO** un usuario con `activo` en falso
- **CUANDO** entra con su correo y su contraseña correctos
- **ENTONCES** no queda con sesión y ve el mismo mensaje que ante credenciales incorrectas

#### Scenario: entrada rechazada en un navegador que ya tenía sesión
- **DADO** un navegador con la sesión de una persona abierta
- **CUANDO** se intenta entrar con las credenciales de otra y el servicio las rechaza
- **ENTONCES** el navegador queda sin sesión: la anterior no sigue sirviendo

#### Scenario: el servicio de autenticación no contesta durante una entrada
- **DADO** un navegador con la sesión de una persona abierta
- **CUANDO** se intenta entrar y el servicio de autenticación no contesta
- **ENTONCES** no se entra y la sesión que ya tenía sigue abierta: una falla pasajera no saca a
  quien estaba dentro

### Requirement: Mensaje único ante credenciales incorrectas

El sistema DEBE responder con el mismo mensaje, en español, cuando el correo no tiene cuenta,
cuando la contraseña es incorrecta y cuando la cuenta está desactivada.

Origen: HU-01.CA-3, D-59.

**Límite aceptado (D-77):** el mensaje es el mismo; el tiempo de respuesta no. Se aceptó como
riesgo y está en la lista de versiones futuras.

#### Scenario: el correo no tiene cuenta
- **CUANDO** alguien intenta entrar con un correo sin cuenta
- **ENTONCES** no entra y ve el mensaje único

#### Scenario: la contraseña es incorrecta
- **CUANDO** alguien intenta entrar con el correo de una cuenta y una contraseña incorrecta
- **ENTONCES** no entra y ve el mismo mensaje, letra por letra

### Requirement: Sin sesión no se ve ni se registra nada

El sistema DEBE exigir una sesión vigente en toda página y en toda operación que use una persona.
Sin sesión vigente no se muestra ningún dato, no se registra nada y se lleva a la persona a la
pantalla de entrada.

Hay dos excepciones y no hay más:

1. **La entrada:** su pantalla y la operación que recibe el correo y la contraseña y crea la
   sesión. Es lo único que una persona usa sin sesión.
2. **La operación interna de la ejecución recurrente**, que no la usa ninguna persona: la dispara
   el sistema y se protege con su propia credencial (especificación `no-reportados`, requisito
   «Protección de la ejecución recurrente»). La sesión de una persona no sirve para llamarla.

Origen: HU-01.CA-2; excepción de la Definition of Done para HU-07.3.

#### Scenario: página sin sesión
- **CUANDO** alguien sin sesión abre cualquier página
- **ENTONCES** llega a la pantalla de entrada y no ve ningún dato

#### Scenario: operación sin sesión
- **CUANDO** alguien sin sesión llama a una operación del sistema
- **ENTONCES** la operación se rechaza y no cambia nada

### Requirement: Sesión vigente

El sistema DEBE comprobar en cada petición, en el servidor y en un solo lugar del código, las tres
condiciones de una sesión vigente:

1. El servicio de autenticación la reconoce como abierta. Se le consulta en cada petición (D-76).
2. El usuario existe y está activo.
3. No pasaron más de `sesion_dias` días desde que la persona entró. La duración la controla el
   sistema, no el servicio (D-69). El momento de entrada es el que el servicio anota en el pase al
   entrar con contraseña, que se conserva cuando la sesión se renueva (prueba P5 de HU-01.6). Si el
   pase no trae ese momento, la condición no se cumple: ante la duda, la sesión vence. Si trae
   varios, vale el más antiguo, por la misma razón; y si alguno de ellos no se puede leer, tampoco
   hay momento de entrada: no se sabría cuál es el más antiguo (D-105). Un momento posterior a la
   hora de la petición tampoco da vigencia, sin tolerancia de desfase: un reloj adelantado la
   alargaría tanto como el adelanto. Un día son 24 horas: el plazo no depende de la zona horaria ni
   de los cambios de horario (D-104).

Si falla cualquiera, la sesión se cierra en el servicio y la petición se trata como sin sesión.

Origen: HU-01.CA-5, HU-01.CA-6, D-60, D-69, D-76, D-104, D-105.

**Decidido aquí:** `sesion_dias` es un valor por organización y rige en cuanto cambia. No lleva
«desde el día siguiente»: esa regla es del margen y del intervalo (RF-14).

*Construido en HU-01.2 (25/11/2026):* el único lugar es `lib/sesion/vigente.ts`, que consulta al
servicio con el pase en cada petición y obtiene quién pregunta leyendo, con ese mismo pase, su
propio usuario y el plazo de su organización (`leerMiUsuario`, en `lib/datos/separacion.ts`). Si
falla una condición, cierra en el servicio la sesión de ese navegador (alcance local); cerrar
las demás es HU-01.CA-11, fuera de esta entrega. Lo prueban `tests/unit/sesion.test.ts`, con
reloj controlado, y `tests/base/prueba-sesion.py`, con el pase real. **Límite declarado:** un
error de la base al leer el usuario no cierra la sesión; la petición falla con mensaje nuestro.
Cerrarla por una falla pasajera sacaría a todas las personas a la vez. En la entrada es al
contrario: ahí la sesión acaba de crearse y, si no se pudo comprobar el usuario, se retira
(revisión del tramo 4, ronda 1). **Segundo límite declarado:** si el servicio rechaza el corte
automático o no contesta, la cookie se queda en el navegador y ese error no sale a quien pregunta.
No queda sesión utilizable —cada petición vuelve a comprobar las tres condiciones y a intentar el
corte—, pero volvería a servir si la cuenta se reactiva dentro del plazo. Las dos capas, el código
y la regla `es_mi_organizacion` de la base, leen el momento de entrada igual para las formas que
emite el servicio (migración `20261125185000_vigencia_del_pase`). **Límite:** no son idénticas para
cualquier forma imaginable —un número con parte decimal nula, que el servicio no emite, el código
lo aceptaría y la base no—; la diferencia cae del lado seguro, porque manda la capa más estricta
(revisión interna de la ronda 1 del tramo 4).

#### Scenario: se vuelve a abrir dentro del plazo
- **DADO** que una persona entró hace menos de `sesion_dias` días y no cerró su sesión
- **CUANDO** vuelve a abrir la aplicación
- **ENTONCES** está dentro sin escribir sus credenciales

#### Scenario: pasó el plazo
- **DADO** que una persona entró hace más de `sesion_dias` días
- **CUANDO** hace cualquier petición
- **ENTONCES** se rechaza, la sesión queda cerrada y llega a la pantalla de entrada

#### Scenario: el plazo es un parámetro
- **DADO** una organización con `sesion_dias` en 1
- **CUANDO** una persona de esa organización hace una petición 25 horas después de entrar
- **ENTONCES** se rechaza, aunque para otra organización con 30 días seguiría vigente

#### Scenario: el plazo cambia con la sesión abierta
- **DADO** una persona que entró hace 3 días, en una organización con `sesion_dias` en 30
- **CUANDO** el valor de su organización pasa a 1 y ella hace una petición
- **ENTONCES** se rechaza: el valor se lee en cada petición, no se copia al entrar

#### Scenario: una entrada con contraseña con el momento ilegible
- **DADO** un pase con dos entradas con contraseña, una reciente y otra cuyo momento no se puede leer
- **CUANDO** la persona hace una petición
- **ENTONCES** se rechaza, la sesión queda cerrada y llega a la pantalla de entrada: sin ese momento
  no se sabe cuál es la entrada más antigua (D-105)

#### Scenario: un momento de entrada en el futuro
- **DADO** un pase cuyo momento de entrada con contraseña es posterior a la hora de la petición
- **CUANDO** la persona hace una petición
- **ENTONCES** se rechaza y la sesión queda cerrada: un momento futuro no alarga la vigencia

#### Scenario: en el instante exacto del plazo
- **DADO** una organización con `sesion_dias` en 30
- **CUANDO** una persona hace una petición exactamente 30 días después de entrar
- **ENTONCES** se acepta; un segundo después se rechaza

#### Scenario: la cuenta se desactiva con la sesión abierta
- **DADO** una persona con sesión abierta
- **CUANDO** su usuario pasa a `activo` en falso
- **ENTONCES** su siguiente petición se rechaza

### Requirement: Cerrar la sesión

El sistema DEBE permitir a la persona cerrar su sesión. Cerrada, el pase que tenía deja de servir
de inmediato.

Origen: HU-01.CA-7. Comprobado en la prueba P2 de HU-01.6: el servicio rechaza el pase de una
sesión cerrada cuando se le consulta.

*Construido en HU-01.2 (25/11/2026):* `cerrar`, en `lib/sesion/vigente.ts`. El cliente oficial, con
alcance local, **borra la sesión del navegador antes de pedir la revocación al servicio**, así que
un error suyo no significa que la persona siga dentro. Por eso, ante un error, se comprueba si
queda sesión: si no queda, está cerrada; si queda, o no se puede comprobar, se responde con mensaje
nuestro y no se afirma el cierre (revisión del tramo 4, ronda 1, corregido por su revisión
interna). El motivo que diera el servicio no sale a quien pregunta.

**Límite declarado:** cuando el cierre local se hizo pero la revocación en el servicio falló, el
pase anterior puede seguir siendo válido en el servicio hasta que caduque. Este navegador ya no lo
tiene; quien tuviera una copia podría usarlo mientras el usuario esté activo y dentro del plazo.
Revocar a la fuerza, o avisar de que la revocación quedó pendiente, es una característica futura.

#### Scenario: cierre
- **DADO** una persona con sesión abierta
- **CUANDO** la cierra
- **ENTONCES** llega a la pantalla de entrada

#### Scenario: el pase anterior ya no sirve
- **DADO** que una persona cerró su sesión
- **CUANDO** se repite una petición con el pase que tenía antes de cerrar
- **ENTONCES** se rechaza

#### Scenario: el servicio no revocó el pase, pero la sesión del navegador se cerró
- **DADO** una persona con sesión abierta
- **CUANDO** pide cerrarla, su navegador queda sin sesión y el servicio devuelve un error de la revocación
- **ENTONCES** su sesión queda cerrada y llega a la pantalla de entrada; lo que puede no haberse
  revocado es el pase en el servicio (límite declarado)

#### Scenario: el cierre falla y la sesión sigue abierta
- **DADO** una persona con sesión abierta
- **CUANDO** pide cerrarla, el cierre falla y su navegador sigue con la sesión
- **ENTONCES** no se le dice que quedó cerrada: ve un aviso nuestro para intentarlo de nuevo

### Requirement: Peticiones que vienen de otro sitio

El sistema DEBE rechazar toda operación que cambie datos, **y también las de entrada y cierre, que
cambian la sesión del navegador**, cuando la petición no viene del propio sitio del sistema, aunque el
navegador envíe la cookie de una sesión vigente. Sin esto, otro sitio podría hacer que el
navegador de una persona entre con una cuenta ajena, y lo que ella registre quedaría en esa cuenta. El origen de la
petición se compara con la dirección pública del sistema, que es un dato de configuración; no con
lo que el servidor vea detrás de un intermediario. **Una petición sin origen, con origen nulo o
desde otro subdominio se rechaza.** La operación interna de la ejecución recurrente no pasa por
esta regla: no usa cookie, usa su credencial.

**Ninguna página del sistema se deja mostrar dentro de un marco de otro sitio.** Sin esto, otro
sitio podría mostrar la pantalla del sistema escondida y hacer que la persona toque el botón
creyendo tocar otra cosa: la petición saldría del propio sitio y pasaría la regla del origen.

La cookie de sesión la escribe el sistema, y DEBE escribirla marcada para que no la lea el código
de la página, **sin dominio, de modo que el navegador solo la envíe al propio sitio y nunca a otro
subdominio**, y, en el sistema desplegado, para que solo viaje por conexión cifrada.

Origen: HU-01.CA-2 y HU-06.CA-13 (un aviso no se puede quitar: uno inducido desde otro sitio
tampoco); hallazgo 7 de la primera ronda de revisión de esta especificación.

**Comprobado al construir HU-01.2 (25/11/2026), en el código del cliente oficial
(`@supabase/ssr` 0.12.7):** por sí solo escribe la cookie sin dominio, pero **sin** la marca que
impide que la lea el código de la página y sin la de conexión cifrada. Por eso el sistema reescribe
las marcas de toda cookie antes de enviarla (`lib/sesion/cliente.ts`): que no la lea la página,
sin dominio aunque el cliente lo pida y, si la dirección pública es cifrada, solo por conexión
cifrada. Lo prueban `tests/unit/sesion.test.ts` y, con el cliente oficial y la base local,
`tests/integration/sesion.test.ts`, que necesita la base levantada y corre tanto en la máquina como
en la integración continua, en su trabajo de la base. La comprobación del origen para entrar
y cerrar está en `lib/sesion/reglas.ts`; la de las operaciones que cambian datos llega con cada
operación (HU-06.3), y la que impide mostrar las páginas en un marco de otro sitio, con las
pantallas (HU-01.3).

#### Scenario: petición desde otro sitio
- **DADO** una persona con sesión vigente
- **CUANDO** otro sitio hace que su navegador envíe una petición de aviso
- **ENTONCES** se rechaza y no se crea nada

#### Scenario: petición desde el propio sitio
- **CUANDO** la misma petición sale de la pantalla del sistema
- **ENTONCES** se acepta

#### Scenario: petición sin origen
- **CUANDO** llega una petición que cambia datos sin origen declarado, o con origen nulo
- **ENTONCES** se rechaza y no se crea nada

#### Scenario: entrada desde otro sitio
- **CUANDO** otro sitio hace que el navegador de una persona envíe un correo y una contraseña a la operación de entrada
- **ENTONCES** se rechaza y el navegador no queda con ninguna sesión nueva

#### Scenario: la pantalla dentro de un marco de otro sitio
- **CUANDO** otro sitio intenta mostrar cualquier página del sistema dentro de un marco
- **ENTONCES** la respuesta del sistema le indica al navegador que no la muestre, y el navegador no la muestra

#### Scenario: cierre desde otro sitio
- **DADO** una persona con sesión vigente
- **CUANDO** otro sitio hace que su navegador envíe una petición de cierre de sesión
- **ENTONCES** se rechaza y la sesión sigue abierta

#### Scenario: marcas de la cookie
- **CUANDO** una persona entra
- **ENTONCES** la cookie de sesión que recibe está marcada para que el código de la página no la lea, y no declara dominio

#### Scenario: marca de conexión cifrada en el sistema desplegado
- **CUANDO** una persona entra en el sistema desplegado
- **ENTONCES** la cookie de sesión está marcada para viajar solo por conexión cifrada; si llega sin esa marca, la comprobación del despliegue (H-4) falla y H-4 no se cierra

Este último no se puede probar en local, donde no hay cifrado: se comprueba en el despliegue
(H-4), junto con las pruebas del servicio de autenticación que allí se repiten. La marca sale del
esquema de la dirección pública leída como URL, no de comparar su texto: los esquemas no
distinguen mayúsculas, y una dirección escrita `HTTPS://…` es tan cifrada como `https://…`. Si la
dirección pública no se puede leer como URL, la cookie sale marcada como cifrada —el lado seguro—,
y con esa configuración el sistema rechaza igual toda entrada y todo cierre (revisión del tramo 4,
ronda 1).

### Requirement: Un correo, una cuenta, una organización

El sistema DEBE garantizar en la base que un correo pertenece a un solo usuario en todo el sistema
y que cada usuario pertenece a una sola organización. **`usuario.correo` es, al escribirse el
usuario, el correo con el que esa cuenta entra en el servicio de autenticación:** la base rechaza
un usuario cuyo correo no coincida con el de su cuenta en el servicio, comparado sin distinguir
mayúsculas. Que siga coincidiendo después es el límite declarado de abajo (D-87).

**Comprobado al construir HU-01.1 (25/11/2026, en la base local): la base sí puede leer el correo
de la cuenta**, con el rol de las migraciones; las personas, la credencial del sistema y `anon` no
pueden leer las cuentas del servicio. La comprobación corre al escribir el usuario con los
permisos de quien escribe, así que en esta entrega solo escriben usuarios los datos de arranque;
cualquier otro rol que lo intente recibe un rechazo con mensaje nuestro. *Antes de construirlo
quedaba por comprobar*, con su salida: si la base no podía leerlo, la comprobación pasaba a la
carga de los datos de arranque y se corregía esta especificación antes de escribir el código. No
hizo falta.

**Nadie cambia por sí solo el correo de su cuenta (D-103).** Si una persona pasa a usar otro correo
—por ejemplo, el del cliente en vez del de la empresa consultora—, se crea un usuario nuevo con ese
correo, que empieza su propia historia; los registros del usuario anterior quedan tal cual. El
servicio no tiene una opción de configuración que lo impida, así que lo impide la base: un
disparador en las cuentas del servicio rechaza, con mensaje nuestro, la solicitud de cambio que
hace la persona con su pase. *Antes de construirlo quedaba por comprobar* si el servicio dejaba
desactivarlo. **Comprobado en la base local el 25/11/2026:** no hay esa opción, y el disparador
rechaza la solicitud de la persona y deja el correo como estaba; tampoco deja confirmar una
solicitud que ya estuviera pendiente, y no estorba a la renovación de la sesión
(`tests/base/prueba-usuario.py`, casos N9, N24 y P13). En el servicio gestionado, H-4 repite por la
API los casos N9 y P13 y la corrección en dos pasos de abajo (P3 y P10), porque el disparador
depende de cómo anota el servicio una solicitud de cambio. N24 es solo local: necesita un
superusuario para fabricar una solicitud pendiente, y supone que el servicio confirma pasando el
correo pedido al correo de la cuenta (revisión del tramo 3, ronda 1 y revisión interna).

**La corrección excepcional de un error de captura (D-87) se hace en dos pasos, y la hacen los
administradores técnicos:** con la credencial del sistema cambian el correo de la cuenta en el
servicio, y con el rol de las migraciones —el único que puede leer las cuentas— reescriben el
usuario (caso P10). Mientras el usuario no se reescriba, la base no deja escribirlo (caso N25). Si
la cuenta tiene una solicitud de cambio pendiente hacia ese mismo correo, primero la limpian: el
bloqueo la trataría como la confirmación de la persona.

**Límite declarado:** la comprobación del correo vale cuando se escribe el usuario. Si quien corrige
la cuenta no reescribe el usuario, la base no se entera: el correo del usuario quedaría viejo y el
reporte del supervisor iría a la dirección anterior. **Riesgo aceptado (D-87, acotado por D-103 a la
credencial del sistema).**

Origen: HU-01.CA-12, D-66, D-103.

#### Scenario: correo repetido en otra organización
- **DADO** un usuario con un correo en la organización A
- **CUANDO** se intenta crear en la organización B un usuario con el mismo correo, con cualquier combinación de mayúsculas
- **ENTONCES** la base lo rechaza

#### Scenario: el correo no es el de la cuenta
- **DADO** una cuenta del servicio de autenticación que entra con el correo A
- **CUANDO** se intenta crear su usuario con el correo B
- **ENTONCES** la base lo rechaza

#### Scenario: la persona pide cambiar su correo
- **DADO** una persona con sesión
- **CUANDO** pide al servicio de autenticación cambiar el correo de su cuenta
- **ENTONCES** la solicitud se rechaza, y el correo de la cuenta y el de su usuario quedan como estaban

#### Scenario: quien trabaja para dos empresas
- **DADO** una persona con dos usuarios, cada uno con el correo de su empresa
- **CUANDO** entra con uno
- **ENTONCES** ve solo la organización de ese usuario

### Requirement: Roles

El sistema DEBE reconocer tres roles —consultor, supervisor y dirección— y permitir que una persona
tenga más de uno. Quién supervisa a quién lo dice la asignación, no el rol. **Un supervisor o una
dirección con asignación propia (HU-02.CA-10) lleva también el rol `consultor`:** la base no deja
crear una asignación cuyo consultor no tenga ese rol (decisión 36, especificación `aviso-inicio`).

Origen: D-56, HU-02.CA-10.

#### Scenario: una persona con dos roles
- **DADO** un usuario con los roles `supervisor` y `consultor`
- **CUANDO** usa el sistema
- **ENTONCES** sobre su propia asignación actúa como consultor y sobre sus supervisados como supervisor

#### Scenario: rol que no existe
- **CUANDO** se intenta guardar un rol distinto de los tres
- **ENTONCES** la base lo rechaza

### Requirement: Separación por organización en la base

El sistema DEBE tener en toda tabla de negocio la organización y una regla de la base que deje ver
y cambiar solo las filas de la organización del usuario que consulta, sea cual sea su rol. La
regla DEBE exigir además que el usuario esté activo **y que la sesión del pase siga vigente: que
el servicio la tenga abierta y que no hayan pasado más de `sesion_dias` días desde la entrada**.
Son las mismas condiciones de «Sesión vigente», puestas también en la base, porque un pase se
puede usar para consultar la base directamente sin pasar por el servidor.

**Comprobado al construir HU-03.1 (23/11/2026; el resultado, en la nota que sigue a este párrafo). Antes de construirlo quedaba por comprobar:** que la base pueda consultar si la sesión que nombra el pase
sigue abierta en el servicio. Que el pase trae el identificador de su sesión y el momento de
entrada está comprobado en la prueba local de HU-01.6: el momento de entrada en el resultado P5 del
resumen, y el identificador de sesión en la salida completa de esa prueba
(`HU-01.6-prueba-local-resultado-20261118.txt`, campo `session_id`), que el resumen no nombra. Si
la base no puede consultarlo, la salida es que la base no acepte consultas directas desde fuera
del servidor, y esta especificación se corrige antes de escribir el código. Esa salida choca con la
decisión «Identidad ante la base»: el servidor también consulta con el pase de la persona, así que
habría que decidir cómo distingue la base una consulta del servidor de una directa —por ejemplo,
que la base no se exponga fuera del servidor—, y esa decisión vuelve a la Dirección. Además, los escenarios de
consulta directa de este requisito y de «Reglas por rol en la base» pasan a pedir que la base
rechace toda consulta que no venga del servidor, y la sesión cerrada la corta «Sesión vigente».
Lo mismo vale para la parte de sesión cerrada del escenario «la base no registra sin usuario
activo y sesión vigente» (especificación `aviso-inicio`).

*Comprobado al construir HU-03.1 (23/11/2026), en la base local: la base sí puede consultarlo, y
la salida alternativa no hace falta. La función `sesion_abierta()` responde sí con la sesión
abierta y no con el pase de una sesión ya cerrada que todavía no expira
(`tests/base/prueba-acceso-organizacion.py`, casos P1, N1 y P2). Ampliado el 24/11/2026, tras la
revisión adversarial del tramo: tampoco responde sí con la sesión de otra cuenta, sin identificador
de sesión, con un pase que dice otro rol ni pasado el fin que el servicio le fije a la sesión, aunque
pase entre dos consultas de la misma transacción; y sí con un fin futuro (casos P4, P6 y N23 a N27 y
N32). La hora que mira es la del inicio de cada consulta: una consulta que empezó antes del fin
conserva su respuesta hasta terminar (riesgo aceptado, D-102; caso P7). El ticket H-4 del
recorte v4 no pide repetir estos casos en el servicio gestionado: se agregan a su criterio con los
tickets v5 (D-99), y sin eso no se abre el pull request del tramo 8 (D-101). La regla se apoya en `es_mi_organizacion`, que hasta el tramo 3 respondía siempre
«no» (D-100). Desde HU-01.1 (25/11/2026) responde «sí» solo para la organización de un usuario
activo, con la sesión del pase abierta y sin pasar `sesion_dias` desde que entró con contraseña
(`tests/base/prueba-usuario.py`, casos P4 a P6 y N10 a N20); a una cuenta sin usuario le sigue
respondiendo «no» (`tests/base/prueba-acceso-organizacion.py`, casos N28 a N31, N33 a N35 y P5).*

La regla por organización DEBE ser restrictiva: se suma como condición obligatoria a cualquier
otra, de modo que ninguna regla por rol pueda dejar ver más allá de la organización.

**Qué es una tabla de negocio:** toda tabla de cualquier esquema de la base, salvo los esquemas del
servicio de autenticación, los del propio motor y de sus extensiones, y el del registro de
migraciones. Esos esquemas ajenos forman una lista cerrada, escrita en la propia comprobación. No
hace falta que nadie declare una tabla como de negocio: una tabla en un esquema nuevo, que no está
en la lista, se recorre igual.

Una comprobación de estructura DEBE recorrer todas las tablas de negocio y fallar si alguna:

- no tiene `organizacion_id`, o lo admite nulo. **La única excepción es `organizacion`**, que no
  lleva esa columna porque es la organización misma: para ella la comprobación exige que su regla
  compare `id` con la organización del usuario. Cualquier otra tabla sin la columna hace fallar la
  comprobación;
- no tiene las reglas de la base activadas **y forzadas también para el dueño de la tabla**;
- no tiene su regla restrictiva por organización;
- o si el rol con el que consultan las personas es dueño de alguna tabla de negocio o puede
  omitir las reglas.

La comprobación también DEBE fallar si en esos mismos esquemas hay **un objeto que lea filas sin
pasar por las reglas**: una vista que no consulte con los permisos de quien la usa, una vista
materializada, o una función que corra con los privilegios de su dueño y no esté en una lista
cerrada escrita en la comprobación. En la lista solo pueden estar la operación de registro del
aviso y, si las reglas de la base las necesitan, funciones auxiliares que solo responden sí o no
sobre quien consulta (por ejemplo, si su sesión sigue abierta) y no devuelven filas. Agregar una
función a la lista es un cambio que se revisa en su ticket (D-74).

Corre en la integración continua en cada cambio. En el sistema en servicio, las únicas que omiten
las reglas para leer o escribir filas de negocio son la credencial del sistema y la operación de
registro del aviso, que corre con los privilegios de su dueño y por eso exige ella misma estas condiciones (especificación `aviso-inicio`, «Registrar el
aviso»).

Origen: HU-03.CA-1, HU-03.CA-2, HU-03.CA-3.

**Límite declarado:** la comprobación de estructura prueba que la regla existe y que está escrita
como se pide (restrictiva, para toda orden y todo rol, con la función de organización al leer y al
escribir), no que se comporte bien. Que no deje pasar datos lo prueban los escenarios con dos
organizaciones.

#### Scenario: consulta directa a la base
- **DADO** dos organizaciones con datos
- **CUANDO** un usuario de la organización A consulta directamente cualquier tabla de negocio
- **ENTONCES** recibe solo filas de la organización A

#### Scenario: usuario desactivado con pase vigente
- **DADO** un usuario con `activo` en falso que conserva un pase emitido antes de desactivarlo
- **CUANDO** consulta directamente cualquier tabla de negocio de su organización
- **ENTONCES** no recibe ninguna fila y no puede cambiar ninguna

#### Scenario: pase de una sesión cerrada o vencida
- **DADO** una persona que cerró su sesión, o cuya entrada pasó de `sesion_dias` días, y conserva un pase que todavía no expira
- **CUANDO** consulta directamente cualquier tabla de negocio con ese pase
- **ENTONCES** no recibe ninguna fila y no puede cambiar ninguna

#### Scenario: la dirección tampoco cruza
- **DADO** un usuario con rol dirección en la organización A
- **CUANDO** intenta leer o cambiar una fila de la organización B por su identificador
- **ENTONCES** no recibe la fila y no cambia nada

#### Scenario: tabla nueva sin regla
- **CUANDO** una migración crea una tabla de negocio sin `organizacion_id` o sin regla
- **ENTONCES** la comprobación de estructura falla y nombra la tabla

#### Scenario: tabla en un esquema nuevo
- **CUANDO** una migración crea un esquema que no está en la lista cerrada de esquemas ajenos, con una tabla sin `organizacion_id`
- **ENTONCES** la comprobación de estructura falla y nombra la tabla

#### Scenario: vista o función que se salta las reglas
- **CUANDO** una migración crea una vista que no consulta con los permisos de quien la usa, una vista materializada, o una función que corre con los privilegios de su dueño y no está en la lista cerrada
- **ENTONCES** la comprobación de estructura falla y nombra el objeto

### Requirement: Separación por organización en el código

El sistema DEBE filtrar por la organización del usuario en toda consulta del código, en un solo
lugar, y responder ante un dato de otra organización igual que si no existiera.

Origen: HU-03.CA-1, HU-03.CA-3, HU-03.CA-4, D-59.

*Construido en HU-03.2 (25/11/2026):* el único lugar es `lib/datos/separacion.ts`, y lo prueba
`tests/unit/separacion.test.ts`, que además falla si un archivo de código del repositorio llama a
`.from(...)` o a `.rpc(...)` por fuera de ese módulo. Es una búsqueda en el texto: no ve una consulta
por `fetch` directo a la API de la base, ni un `from` sacado del cliente o llamado con `.call`
(límite declarado en el módulo). Las operaciones que se llaman como función, como el registro del
aviso, entran a este módulo con su ticket (HU-06.3). **Límite declarado:** se prueba con un cliente falso; con la base
real y dos organizaciones lo prueba HU-03.3. La identidad de quien pregunta la entrega «Sesión
vigente» (HU-01.2), que la obtiene con `leerMiUsuario`: la única lectura del módulo que no sale
filtrada por organización, porque es la que la produce; la regla restrictiva de la base sigue
cortando.

#### Scenario: dato ajeno por su identificador
- **CUANDO** un usuario pide por su identificador un dato de otra organización
- **ENTONCES** la respuesta es la misma, en código y en mensaje, que la de un identificador que no existe

#### Scenario: dato propio
- **CUANDO** un usuario pide un dato de su organización que su rol le permite ver
- **ENTONCES** lo recibe

### Requirement: Reglas por rol en la base

El sistema DEBE limitar en la base, además de por organización, qué filas ve y cambia cada usuario:

| Tabla | Ve | Cambia |
|---|---|---|
| `usuario` | La propia · las de los consultores que supervisa · todas las de su organización si es dirección | Nadie, en esta entrega |
| `usuario_rol` | Las propias · todas las de su organización si es dirección | Nadie |
| `cliente` | Los de las asignaciones que puede ver · todos los de su organización si es dirección | Nadie |
| `asignacion` | Las que tiene como consultor · las que supervisa · todas las de su organización si es dirección | Nadie |
| `aviso_inicio` | Los de las asignaciones que puede ver | Nadie lo inserta directamente, tampoco el consultor dueño: lo crea la operación de registro de la base, llamada con su sesión, después de aplicar la regla (especificación `aviso-inicio`). Nadie edita ni quita |
| `parametro` | Los de su organización, si es dirección | Nadie |
| `no_reportado` | Los de las asignaciones que supervisa · todos los de su organización si es dirección. **El consultor no los ve, tampoco los suyos** | Nadie; los crea el sistema |
| `organizacion` | La propia | Nadie |

*Construido en HU-01.2 (25/11/2026):* las filas «la propia» de `usuario` y de `organizacion`, que
valen igual para todo rol y que «Sesión vigente» necesita: las personas pueden leer esas dos
tablas, y nada más que eso, y solo su propio usuario y su propia organización (migración
`20261125164000_sesion`, `tests/base/prueba-sesion.py`). El resto de esta tabla lo pone HU-02.1.

«Nadie» quiere decir ninguna persona con su sesión. La ejecución recurrente y los datos de
arranque usan una credencial del sistema, que no pasa por estas reglas y vive solo en el servidor.
**Esa credencial tampoco puede insertar avisos:** la base no le da el permiso (especificación
`aviso-inicio`, Datos). **El registro del aviso no la usa:** es una operación de la base que se llama con la sesión de la
persona, y que deduce el consultor y la organización de esa sesión (especificación `aviso-inicio`).

**Cada fila de esta tabla tiene sus casos de consulta directa a la base** en la matriz de
permisos: **para ver**, por cada situación, uno que la regla deja pasar y uno que rechaza; **para
cambiar**, como en esta entrega nadie cambia ninguna tabla, un intento rechazado de insertar, uno de
editar y uno de quitar, con cada rol. La separación entre organizaciones no basta: una regla por rol demasiado amplia deja ver
datos dentro de la misma organización sin que ninguna prueba entre organizaciones falle.

Origen: HU-02.CA-1, CA-2, CA-3, CA-4, CA-5, CA-6, CA-7, CA-8, CA-10; D-62 para el consultor y el
reporte.

#### Scenario: un consultor frente a otro
- **DADO** dos consultores de la misma organización, cada uno con su aviso de hoy
- **CUANDO** uno consulta directamente la tabla de avisos
- **ENTONCES** recibe solo el suyo

#### Scenario: un supervisor frente a los supervisados de otro
- **DADO** dos supervisores de la misma organización
- **CUANDO** uno consulta avisos, asignaciones y no reportados
- **ENTONCES** recibe solo los de las asignaciones que él supervisa

#### Scenario: la dirección ve su organización
- **CUANDO** un usuario con rol dirección consulta avisos, asignaciones y no reportados
- **ENTONCES** recibe todos los de su organización y ninguno de otra

#### Scenario: el consultor y el reporte
- **DADO** un consultor que hoy fue reportado
- **CUANDO** consulta directamente la tabla de no reportados
- **ENTONCES** no recibe ninguna fila

#### Scenario: ninguna persona escribe un aviso directo en la base
- **CUANDO** un usuario de cualquier rol, incluido el consultor dueño de la asignación, intenta insertar un aviso directamente en la base con su sesión
- **ENTONCES** la base lo rechaza

#### Scenario: supervisor con asignación propia
- **DADO** un supervisor que además es consultor de una asignación
- **CUANDO** consulta los avisos
- **ENTONCES** ve el de su asignación y los de sus supervisados, y ninguno más

#### Scenario: un consultor y los datos de sus compañeros
- **DADO** dos consultores de la misma organización
- **CUANDO** uno consulta directamente las tablas `usuario`, `usuario_rol` y `parametro`, e intenta cambiar una fila de `usuario`, `asignacion` o `parametro`
- **ENTONCES** de `usuario` y `usuario_rol` recibe solo las suyas, de `parametro` ninguna, y la base rechaza todo cambio

### Requirement: Autorización en el código

El sistema DEBE decidir en un solo lugar del código qué puede cada rol, con dos respuestas distintas:

- **Dato que la persona no puede ver** —de otra organización, de otro consultor, de los
  supervisados de otro—: responde igual que si no existiera (D-67).
- **Operación que su rol no permite:** responde con un mensaje en español que dice que no tiene
  permiso, y no deja ningún cambio.

Origen: HU-02.CA-2, CA-5, CA-7, CA-8, CA-9; D-67.

**Límite declarado:** en esta entrega la única operación de escritura es registrar el aviso. Cargar
datos, desactivar y cambiar un parámetro no existen; la regla queda escrita y se prueba cuando
cada operación se construya.

#### Scenario: dato ajeno dentro de la organización
- **CUANDO** un consultor pide por su identificador el aviso de otro consultor de su organización
- **ENTONCES** la respuesta es la misma que la de un identificador que no existe

#### Scenario: operación no permitida
- **CUANDO** un supervisor sin asignación propia intenta registrar un aviso
- **ENTONCES** ve el mensaje de falta de permiso y no se crea nada

#### Scenario: nadie avisa por otro
- **DADO** un supervisor, o una dirección, y un consultor al que supervisa
- **CUANDO** pide registrar un aviso
- **ENTONCES** el aviso nunca queda a nombre del consultor: la petición no dice de quién es, y el sistema solo registra el de quien la hace

#### Scenario: operación permitida
- **CUANDO** un consultor registra el aviso de su asignación pendiente
- **ENTONCES** se acepta

### Requirement: Matriz de permisos

El sistema DEBE tener una batería de pruebas con una fila por operación y una columna por
**situación**, y en cada celda un caso permitido o uno rechazado según corresponda. Las columnas no
son los tres roles a secas, porque el permiso depende también de la relación con el dato: sin
sesión · consultor sobre lo suyo · consultor sobre lo de otro · supervisor sobre un supervisado ·
supervisor sobre el supervisado de otro · supervisor o dirección sobre su asignación propia ·
supervisor o dirección sin asignación propia · dirección sobre su organización · cualquiera sobre
otra organización. **De dónde salen las operaciones:** de recorrer el código —toda ruta y toda
acción del servidor que la aplicación expone—, no del lugar de autorización (requisito
«Autorización en el código»), que no conocería una operación que lo salte. La batería falla si una
de ellas no tiene fila en la matriz o no pasa por ese lugar. Las dos excepciones de «Sin sesión no
se ve ni se registra nada» —la entrada y la operación interna de la ejecución recurrente— tienen su
fila, pero no pasan por ese lugar: se protegen como dice ese requisito, y la batería las conoce por
nombre. **De dónde salen las tablas:** de la
misma lista de tablas de negocio que recorre la comprobación de estructura, no de la tabla escrita
en «Reglas por rol en la base»; una tabla de negocio que falte en esa tabla hace fallar la batería.
Toda operación nueva agrega su fila, y toda tabla nueva sus casos, en el mismo cambio que la crea.

Origen: HU-02.CA-1 a CA-8; Definition of Done de los tickets de tipo Endpoint/API y Migración/DB.

#### Scenario: operación sin fila
- **CUANDO** existe una ruta o acción del servidor sin fila en la matriz, o que no pasa por el lugar de autorización
- **ENTONCES** la batería falla y nombra la operación

#### Scenario: celda rechazada que pasa
- **CUANDO** un rol consigue ejecutar una operación que la matriz marca como rechazada
- **ENTONCES** la batería falla

#### Scenario: tabla sin sus casos de consulta directa
- **CUANDO** una tabla de negocio —de las que recorre la comprobación de estructura, esté o no en el requisito «Reglas por rol en la base»— no tiene en la batería su caso permitido y su caso rechazado de ver por consulta directa, o sus intentos rechazados de insertar, editar y quitar con cada rol
- **ENTONCES** la batería falla y nombra la tabla y el caso que falta

## Decisiones de diseño

| Punto | Decisión | Fundamento |
|---|---|---|
| E-3 · ¿capa propia de acceso? | **No hay capa propia para entrar:** la entrada llama al servicio de autenticación desde el servidor. Lo propio es el requisito «Sesión vigente», que vive en el servidor y forma parte de HU-01.2. No nace ticket nuevo | El servicio ya resuelve credenciales, cierre y renovación (pruebas P1, P2 y P5). Cuando se construya la recuperación (HU-01.4 y HU-01.5) sí hará falta un paso propio: el servicio envía el correo de recuperación a una cuenta bloqueada (prueba P4) |
| Desactivación | El estado activo lo comprueba el sistema —en «Sesión vigente» y en las reglas de la base—, no el bloqueo del servicio | El bloqueo del servicio no corta el pase ya emitido (prueba P4) |
| Sesión por cookie | La sesión viaja en una cookie que gestiona el cliente oficial del servicio para el servidor; no hay pase en cabecera | El único cliente es la aplicación web |
| Identidad ante la base | Cada petición consulta la base con el pase de la persona que la hace, a través del cliente oficial del servicio. El sistema no mantiene conexiones propias a las que les ponga la identidad a mano | Así no hay identidad que pueda quedar heredada de una petición a otra |

## Riesgos aceptados

| Riesgo | Decisión | Qué lo cubre mientras tanto |
|---|---|---|
| El servicio limita los intentos de entrada por dirección IP y no por cuenta (E-4) | D-72 | El límite por IP que el servicio declara en su documentación (comprobación documental de HU-01.6). **No se ha probado:** la prueba local no lo cubrió. H-4 lo comprueba en el servicio gestionado, y comprueba también **qué dirección ve el servicio**: la entrada la llama el servidor (E-3), y si el servicio ve la del servidor, el límite es uno solo para todos y alguien podría agotarlo y bloquear la entrada de todos |
| El tiempo de respuesta de la entrada delata si un correo tiene cuenta (E-8) | D-77 | El mismo límite por IP, con la misma salvedad: documentado, no probado; H-4 lo comprueba |
| Lo comprobado del servicio lo fue en una instancia local, no en la gestionada | HU-01.6 | El despliegue (H-4) repite contra el servicio gestionado las pruebas P1, P2 y P5 de HU-01.6 |
| Si la credencial del sistema cambia el correo de una cuenta en el servicio y no reescribe el usuario, `usuario.correo` queda viejo y la base no lo detecta | D-87, acotado por D-103 | Los correos no se cambian: solo un error de captura, excepcional y una sola vez, y lo corrige la credencial del sistema. La persona no puede cambiar el suyo: la base rechaza la solicitud (D-103; `tests/base/prueba-usuario.py`, caso N9). El sistema no ofrece cambiar el correo, y la base comprueba la coincidencia cada vez que se escribe el usuario |
| El momento de entrada que usa «Sesión vigente» es un campo del pase que la documentación del servicio no describe; una actualización del servicio podría cambiarlo | D-85 | La prueba P5 lo comprobó en local y H-4 la repite en el servicio gestionado; si el campo falta, la sesión se trata como vencida, nunca como vigente |
| `sesion_abierta()` mira la hora del inicio de cada consulta: una consulta que empezó antes del fin fijado de la sesión conserva su respuesta hasta terminar | D-102 | La siguiente consulta ya mira la hora nueva (casos N32 y P7 de `tests/base/prueba-acceso-organizacion.py`), y una consulta por la API no dura más de 8 segundos: es el tiempo máximo que la base local trae configurado para `authenticator`, el rol con que entra la API, y para `authenticated` (lo comprueba en cada corrida el caso P9, en la base local; en el servicio gestionado no se ha comprobado). Entra en las características a considerar en versiones futuras (D-48): comprobar ese tiempo máximo en el servicio gestionado, o dejarlo fijado por una migración |
