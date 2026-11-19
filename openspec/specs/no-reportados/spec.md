# Especificación · no-reportados

> **Estado: aprobada por la Dirección el 19/11/2026 (D-89), tras siete rondas de revisión
> adversarial.** Ticket H-1. Queda una comprobación «por comprobar al construir», con su salida
> escrita: HU-07.3 (el disparador programado con su secreto).
> Cubre la historia HU-07 (recibir la lista de no reportados al vencer el margen). Cada requisito
> cita el criterio del backlog del que sale o la decisión de la Dirección que lo origina.
> Quién puede ver un no reportado está en la especificación `acceso`. El vocabulario de fechas
> (día de una asignación, inicio comprometido, vencimiento del margen) está en `aviso-inicio`.

## Propósito

Que el supervisor se entere, al vencer el margen, de quién sigue sin avisar, sin tener que ir a
mirar: la llamada que sigue es para saber si la persona está bien.

## Alcance de esta entrega

**Entra:** el modelo del no reportado y de los parámetros · la regla de clasificación · la
ejecución recurrente · el correo agrupado al supervisor.

**No entra, o entra solo en parte (decisión D-73):**

| Qué | Criterios | Qué pasa mientras tanto |
|---|---|---|
| Suplencia de la dirección cuando el supervisor está desactivado | HU-07.CA-12, punto E-9 | A un usuario inactivo no se le envía correo; su no reportado queda generado y sin notificar. Nadie más lo recibe |
| El correo que no salió, **en parte** | HU-07.CA-10 | Entra la regla: lo que quedó sin notificar sale en la ejecución siguiente **mientras no pasen 24 horas desde que se detectó**; pasado ese tope deja de intentarse y se cuenta en el registro de la ejecución (requisito «Correo agrupado»), con sus pruebas de regla. El tope es una decisión de esta especificación, no del backlog. No entran los escenarios de punta a punta que capturan el correo (HU-07.8), ni que «mientras tanto» el reporte se pueda consultar en pantalla (HU-10) |
| El reporte consultable en la aplicación, **en parte** | HU-07.CA-15 | Entra que el reporte quede generado en el sistema, que es lo que el criterio dice que se mide, **con el límite declarado del plazo** (requisito «Ejecución recurrente», D-86): `detectado_en` queda dentro de un intervalo si el disparador llama a su hora, y la fila aparece después, lo que tarde la llamada en llegar a esa organización. Ese retraso no se acota; se anota. Que una persona pueda consultarlo en pantalla espera a HU-10 |
| Bordes: dos asignaciones el mismo día, aviso que llega junto con la ejecución | HU-07.CA-16, CA-20 | Los datos de demostración no traen esos casos. CA-20 está además en «Riesgos aceptados»: no se prueba en esta entrega |
| El aviso después de haber sido reportado | HU-07.CA-14 | **Sí entra la regla:** la garantiza la base (requisito «El no reportado se conserva», y en `aviso-inicio` «El aviso después de haber sido reportado») y se prueba ahí. Lo que se difiere con HU-07.6 es solo la prueba de punta a punta de ese borde |
| Resumen final a la dirección | HU-07.CA-18, HU-09 | La dirección no recibe correos |
| Consulta en pantalla | HU-10 | El supervisor se entera por el correo |

**Operaciones que todavía no existen:** cambiar un parámetro (HU-11) y desactivar una cuenta
(HU-04). Esta especificación fija cómo se leen los datos; que la operación los deje así es de su
historia.

## Datos

| Tabla | Columnas | Restricciones |
|---|---|---|
| `parametro` | `id` uuid · `organizacion_id` uuid · `clave` text · `valor` integer · `vigente_desde` date | PK `id` · FK a `organizacion` · CHECK `clave` en `margen_minutos`, `intervalo_minutos` · UNIQUE (`organizacion_id`, `clave`, `vigente_desde`) · CHECK margen mayor que 0 · CHECK intervalo de 5 o más y múltiplo de 5 |
| `no_reportado` | `id` uuid · `organizacion_id` uuid · `asignacion_id` uuid · `fecha` date · `detectado_en` timestamptz · `minutos_retraso` integer · `notificado_en` timestamptz | PK `id` · FK compuesta (`asignacion_id`, `organizacion_id`) a `asignacion` · **UNIQUE (`asignacion_id`, `fecha`)** · `detectado_en` y `minutos_retraso` NOT NULL · `notificado_en` admite nulo: nulo es sin notificar; dentro de las 24 horas desde `detectado_en` se intenta en cada ejecución y después deja de intentarse · un disparador rechaza quitar la fila y rechaza cualquier cambio que no sea pasar `notificado_en` de nulo a un instante, **para cualquier identidad, incluida la credencial del sistema** |

Toda organización tiene desde su creación un margen de 60 y un intervalo de 5: **un disparador de
`organizacion` los crea al insertarla**, con `vigente_desde` en la fecha de hoy de la organización.
Así no depende de que la carga se acuerde de crearlos.

`fecha` es el día de la asignación. Las columnas del motivo son de HU-08 y nacen con ella. La
regla general de las tres especificaciones aplica aquí: toda columna es NOT NULL salvo las que
dicen «admite nulo».

## Requisitos

### Requirement: Parámetro vigente

El sistema DEBE usar, para cada organización, el valor de margen y de intervalo cuya fecha
`vigente_desde` es la más reciente que no pasa de la fecha de hoy de la organización. Un valor con
`vigente_desde` de mañana no afecta a ninguna ejecución de hoy. Si a una organización le falta el
margen o el intervalo vigente, la ejecución no la clasifica y lo dice con un mensaje propio: no
usa un valor supuesto.

Origen: HU-07.CA-13, RF-14, D-81.

**Fecha de hoy de la organización (punto E-1, D-81).** Es la fecha en la zona horaria propia de
la organización (`organizacion.zona_horaria`, especificación `acceso`), no la del servidor, que
corre en UTC y para una organización de América cambia de día por la tarde. Una asignación cuyo
cliente esté en otra zona puede ver el cambio unas horas antes o después de su propia medianoche:
es el riesgo ya aceptado en D-48 y D-58.

#### Scenario: cambio que rige mañana
- **DADO** una organización con margen 60 desde hace un mes y margen 30 con `vigente_desde` de mañana
- **CUANDO** corren las ejecuciones de hoy
- **ENTONCES** usan 60

#### Scenario: al día siguiente
- **CUANDO** corren las ejecuciones del día siguiente
- **ENTONCES** usan 30

#### Scenario: cada organización con lo suyo
- **DADO** dos organizaciones con márgenes distintos
- **CUANDO** corre una ejecución
- **ENTONCES** cada una se clasifica con su margen

#### Scenario: la fecha es la de la organización, no la del servidor
- **DADO** una organización con zona `America/Panama`, margen 60 vigente y margen 30 con `vigente_desde` de mañana en esa zona
- **CUANDO** corre una ejecución a las 19:30 de hoy en Panamá, cuando en UTC ya es mañana
- **ENTONCES** usa 60

#### Scenario: organización nueva
- **CUANDO** se crea una organización
- **ENTONCES** tiene desde ese momento un margen vigente de 60 y un intervalo vigente de 5

#### Scenario: organización sin parámetro vigente
- **DADO** una organización a la que, por un error de datos, le falta el margen o el intervalo vigente
- **CUANDO** corre una ejecución
- **ENTONCES** esa organización no se clasifica, las demás sí, y la respuesta y el registro de la ejecución dicen, con un mensaje propio, qué organización se saltó y qué parámetro le falta

### Requirement: Clasificación de no reportados

El sistema DEBE crear, en cada ejecución y para cada asignación, un no reportado cuando en el
instante de la ejecución se cumplen todas estas condiciones, evaluadas en el día de la asignación:

1. El día está dentro de la vigencia de la asignación y es uno de sus días laborables.
2. El instante de la ejecución es **posterior** al vencimiento del margen. En el instante exacto
   del vencimiento todavía no (D-68).
3. No hay aviso de esa asignación para ese día.
4. No hay ya un no reportado de esa asignación para ese día.

**Qué día se evalúa.** Solo el día en curso de la asignación.

**Riesgo aceptado (D-79):** una asignación cuyo margen vence pasada su medianoche —inicio a las
23:30 con margen de 60 minutos— no se reporta, porque cuando vence ya es otro día. No hay turnos
nocturnos en esta entrega. La solución definitiva calculará con la fecha y hora completas del
inicio y del vencimiento, sin depender del día; está en la lista de versiones futuras.

**El instante de la ejecución es el de la llamada:** uno solo para todas las organizaciones y
asignaciones que esa llamada procesa, aunque terminar le tome más. Con él se evalúan las
condiciones, se cuentan los minutos y se escribe `detectado_en`.

Los minutos de retraso se cuentan desde el inicio comprometido hasta el instante de la ejecución,
sin fracción. La regla vive en un solo lugar del código y recibe el instante como dato, para
poder probarla con reloj controlado.

Clasificar una asignación y registrar su aviso (especificación `aviso-inicio`) **toman el mismo
candado sobre la asignación**. **Cada asignación se clasifica en su propia transacción:** el candado
dura lo que tarda esa asignación, no lo que tarda la organización, y así el aviso que espera ese
candado solo espera eso. Si el proceso de una organización falla a mitad, lo ya clasificado queda,
esa organización no envía correo en esa llamada, y la siguiente completa el resto sin duplicar,
por la unicidad del no reportado. **La condición 3 es la excepción al instante único:** se comprueba
con lo que hay en la base al tomar el candado, no en el instante de la llamada. Si el consultor
avisó mientras la llamada procesaba otras asignaciones, su aviso gana y no se reporta: es uno de
los dos resultados que admite HU-07.CA-20 (llegada tardía sin reporte). Las demás condiciones y
los minutos usan el instante de la llamada.

Origen: HU-07.CA-1, CA-2, CA-3, CA-4, CA-9; RF-9, D-35, D-68.

Ejemplo de todos los escenarios: inicio a las 08:00, margen de 60 minutos, intervalo de 5.

#### Scenario: sin aviso
- **CUANDO** corre la ejecución de las 09:05 y el consultor no ha avisado
- **ENTONCES** se crea su no reportado con 65 minutos de retraso

#### Scenario: en el instante del vencimiento
- **CUANDO** corre la ejecución de las 09:00 y el consultor no ha avisado
- **ENTONCES** no se crea nada todavía

#### Scenario: avisó dentro del margen
- **DADO** un aviso a las 08:59
- **CUANDO** corre la ejecución de las 09:05
- **ENTONCES** no se crea no reportado

#### Scenario: avisó después del margen y antes de la ejecución
- **DADO** un aviso a las 09:02
- **CUANDO** corre la ejecución de las 09:05
- **ENTONCES** no se crea no reportado; el aviso es llegada tardía con 62 minutos

#### Scenario: día no laborable
- **DADO** una asignación de lunes a viernes
- **CUANDO** corre una ejecución en sábado, en la zona horaria del cliente
- **ENTONCES** no se crea no reportado

#### Scenario: asignación no vigente
- **DADO** una asignación que empieza mañana, o que terminó ayer
- **CUANDO** corre una ejecución hoy
- **ENTONCES** no se crea no reportado

### Requirement: Un no reportado por asignación y día

El sistema DEBE garantizar en la base que hay como máximo un no reportado por asignación y día.
Una persona ya reportada hoy por una asignación no vuelve a clasificarse por ella ese día.

Origen: HU-07.CA-6, RF-10.

#### Scenario: ejecuciones siguientes
- **DADO** un no reportado creado a las 09:05
- **CUANDO** corren las ejecuciones de las 09:10 y las 09:15
- **ENTONCES** sigue habiendo una sola fila, con su hora y sus minutos originales

#### Scenario: intento de duplicar en la base
- **CUANDO** se intenta insertar otro no reportado de la misma asignación y fecha
- **ENTONCES** la base lo rechaza

### Requirement: Ejecución recurrente

El sistema DEBE correr la clasificación de forma recurrente, sin que nadie la pida:

- Un disparador programado llama cada 5 minutos a una operación interna del sistema.
- En cada llamada se procesa cada organización cuyo intervalo corresponde. Se toman los minutos
  transcurridos desde las 00:00 del 01/01/1970 en tiempo universal hasta el instante de la
  llamada, bajados al múltiplo de 5; la organización se procesa si ese número es múltiplo de su
  intervalo. La referencia es una sola y no depende de la hora del día ni de ninguna zona, de modo
  que vale igual para un intervalo de 15 que para uno de 90.
- Las organizaciones se procesan una por una, cada una con sus parámetros. Si el proceso de una
  falla, las demás se procesan igual, y la respuesta dice cuál falló y por qué.
- Con el sistema en servicio y el disparador llamando a su hora, `detectado_en` —el instante de la
  llamada que lo detecta— queda como máximo un intervalo después del vencimiento del margen.

**Límite declarado del plazo (decisión 11, aprobada en D-84; ampliado por la decisión 35, aprobada en D-86).** El
plazo de un intervalo lo cumple `detectado_en` **solo si el disparador llama a su hora**. A él se
suman dos tiempos que el sistema no acota:

1. **El retraso del disparador:** si llama tarde, `detectado_en` se corre lo mismo.
2. **Lo que tarda la llamada en llegar a esa organización:** la fila aparece en la base después
   de `detectado_en`, lo que tarden en procesarse, una por una, las organizaciones anteriores de
   esa llamada y la propia. Ese tiempo es acumulado, no el de cada organización por separado.

Si una llamada tarda más que un intervalo, además, la siguiente salta las organizaciones que esa
todavía procesa (requisito «Protección de la ejecución recurrente», punto 5) y la detección se
retrasa más. Esta entrega tiene dos organizaciones y pocas decenas de asignaciones, y no se fija
un tope de tiempo. **Para que no pase en silencio:** la respuesta y el registro de la ejecución
anotan con cuánto retraso llamó el disparador respecto de su minuto, cuánto tardó cada organización
y cuánto había pasado desde el inicio de la llamada al terminarla, y cada vez que una llamada salta
una organización porque otra la está procesando.

**Intervalo sin tope (riesgo aceptado en D-58, RA-8 del PRD).** El intervalo no tiene máximo. Con
uno largo, una organización puede no procesarse entre el vencimiento del margen y el fin del día de
la asignación; como solo se evalúa el día en curso, ese no reportado no se crea nunca. Lo cubre
mientras tanto que en esta entrega el intervalo es 5 y no existe la operación para cambiarlo
(HU-11).

Origen: HU-07.CA-1, HU-07.CA-15, RNF-3, D-51; excepción de la Definition of Done para HU-07.3.

#### Scenario: plazo
- **CUANDO** vence el margen de una asignación sin aviso, el sistema está en servicio y el disparador llama a su hora
- **ENTONCES** `detectado_en` es el instante de la llamada que lo detectó, y la diferencia con el vencimiento no pasa de un intervalo aunque el proceso de esa llamada tarde

#### Scenario: dos organizaciones con parámetros distintos
- **DADO** una organización con intervalo 5 y otra con intervalo 15
- **CUANDO** corre la llamada de las 09:05
- **ENTONCES** se procesa la primera y no la segunda; en la de las 09:15 se procesan las dos

#### Scenario: intervalo mayor que una hora
- **DADO** una organización con intervalo 90
- **CUANDO** corren las llamadas de un día completo
- **ENTONCES** se procesa 16 veces, cada 90 minutos exactos, sin importar a qué hora empezó el día

#### Scenario: una organización falla
- **DADO** dos organizaciones, y el proceso de la primera falla
- **CUANDO** corre la llamada
- **ENTONCES** la segunda queda procesada y la respuesta nombra a la que falló

### Requirement: Protección de la ejecución recurrente

El sistema DEBE proteger la operación interna así (punto E-6):

1. **Credencial propia.** Solo se ejecuta si la llamada trae un secreto del sistema, que no es la
   credencial de ninguna persona. La comparación no depende de cuántos caracteres coinciden.
2. **Dónde vive.** En las variables del servidor y en el almacén de secretos del disparador. Nunca
   en el repositorio ni en el navegador.
3. **Cómo se cambia.** Reemplazándolo en los dos lugares; no hace falta tocar el código.
4. **Qué alcance tiene.** Solo dispara la clasificación y el correo. Para armar el correo el
   sistema lee datos de personas; **la respuesta de la operación no devuelve ninguno**: trae
   conteos por organización.
5. **Ejecuciones repetidas o simultáneas.** Una organización no se procesa dos veces a la vez: si
   una ejecución la está procesando, la otra la salta y lo dice. Una llamada repetida no duplica
   ningún no reportado ni ninguna marca, por la unicidad del no reportado y por la marca de
   notificado. **Un correo sí puede repetirse:** el caso de D-82, cuando el servicio de correo lo
   aceptó y la marca no llegó a guardarse (requisito «Correo agrupado al supervisor»).

Origen: excepción de la Definition of Done para HU-07.3; punto E-6.

**Por comprobar al construir HU-07.3:** que el disparador programado del servicio de base de datos
puede llamar a la operación con un secreto guardado en su almacén. No se ha probado. Si no puede,
se usa otro disparador y esta especificación se corrige antes de escribir el código.

#### Scenario: sin credencial
- **CUANDO** llega una llamada sin el secreto, o con uno incorrecto
- **ENTONCES** se rechaza, no se clasifica nada y no se envía ningún correo

#### Scenario: con la sesión de una persona
- **CUANDO** una persona con sesión, de cualquier rol, llama a la operación sin el secreto
- **ENTONCES** se rechaza

#### Scenario: llamada repetida
- **DADO** que el servicio de correo aceptó y confirmó los mensajes de la primera llamada, y sus no reportados ya quedaron marcados con `notificado_en`
- **CUANDO** la misma llamada llega otra vez
- **ENTONCES** hay los mismos no reportados y los mismos correos que con una sola

#### Scenario: dos a la vez
- **CUANDO** dos llamadas procesan la misma organización al mismo tiempo
- **ENTONCES** solo una la procesa y la otra informa que la saltó

### Requirement: Recuperación tras una caída

El sistema DEBE, cuando vuelve después de haber estado fuera de servicio, reportar en la primera
ejecución que procese cada organización —la primera llamada que coincide con su intervalo— lo que
quedó pendiente de ese día: la clasificación mira el día en curso de cada
asignación completo, no solo el último intervalo.

Origen: HU-07.CA-11, RNF-4, RA-6.

**Límite que el backlog ya acepta:** puede aparecer quien no pudo avisar porque la aplicación no
estaba disponible, y puede repetirse un correo.

#### Scenario: caída durante el vencimiento
- **DADO** que el sistema no corrió ninguna ejecución entre las 08:55 y las 10:30
- **CUANDO** corre la de las 10:30 y el consultor no ha avisado
- **ENTONCES** se crea su no reportado, con 150 minutos de retraso

#### Scenario: lo de ayer no se recupera
- **DADO** que el sistema estuvo caído todo el día de ayer
- **CUANDO** corre la primera ejecución de hoy
- **ENTONCES** no se crea ningún no reportado con fecha de ayer

### Requirement: Correo agrupado al supervisor

El sistema DEBE, al terminar la clasificación de una organización, enviar a cada supervisor **un
solo correo** con los no reportados de las asignaciones que él supervisa que estén sin notificar y
se hayan detectado en las últimas 24 horas.

**Decidido aquí:** el tope de 24 horas. Sin tope, un no reportado que nunca pudo notificarse
saldría semanas después; con el día en curso como tope, uno rechazado cerca de la medianoche no
saldría nunca. **El tope incluye su borde:** un no reportado detectado exactamente 24 horas antes
del instante de la ejecución todavía se envía; uno detectado antes de ese instante, no. Los que
pasan el tope sin notificar no se envían y se cuentan aparte en el registro de la ejecución.

- Si un supervisor no tiene ninguno, no recibe correo.

**Decidido aquí: «ningún no reportado nuevo» de HU-07.CA-7 se lee como «ninguno sin notificar
dentro del tope».** Así no chocan CA-7 y CA-10: un correo que falló sale en la ejecución siguiente
aunque esa no clasifique a nadie nuevo (CA-10), y nunca sale un correo vacío ni uno con no
reportados ya notificados, que es lo que CA-7 protege.

- El correo trae solo a sus supervisados, y solo de su organización. Como la ejecución usa la
  credencial del sistema, que no pasa por las reglas de la base, **la separación aquí la pone el
  código**: cada organización se procesa por separado, y toda lectura de esa vía lleva el filtro
  de la organización que se está procesando, en un solo lugar.
- Cuando el servicio de correo acepta el mensaje, esos no reportados quedan marcados con
  `notificado_en`. Si no lo acepta, quedan sin marcar y entran en el correo de la ejecución
  siguiente.
- A un usuario inactivo no se le envía correo.
- La dirección no recibe este correo.
- El proceso no sabe por dónde viaja el reporte: usa un canal de salida con una sola
  implementación, el correo.

Origen: HU-07.CA-5, CA-6, CA-7, CA-8; HU-03.CA-4; RF-10, D-47, D-82.

**Correo aceptado sin confirmación (punto E-5, D-82).** Si el servicio de correo acepta el mensaje
y su confirmación no llega al sistema, **o llega pero el sistema cae antes de guardar la marca**,
los no reportados quedan sin marcar y el correo sale otra vez en la ejecución siguiente: se
prefiere un correo repetido a un silencio. Es una excepción a
HU-07.CA-6, que solo admitía la repetición tras una caída (HU-07.CA-11).

#### Scenario: varios supervisados en una ejecución
- **DADO** tres supervisados del mismo supervisor sin aviso
- **CUANDO** corre la ejecución que los clasifica
- **ENTONCES** el supervisor recibe un correo con los tres

#### Scenario: nada nuevo
- **DADO** un supervisor cuyos no reportados de hoy ya están notificados
- **CUANDO** corre la ejecución siguiente
- **ENTONCES** no recibe ningún correo

#### Scenario: solo los suyos
- **DADO** dos supervisores de la misma organización, cada uno con un supervisado sin aviso
- **CUANDO** corre la ejecución
- **ENTONCES** cada uno recibe un correo con su supervisado y no con el del otro

#### Scenario: dos organizaciones en la misma ejecución
- **DADO** dos organizaciones, cada una con un supervisor y un supervisado sin aviso, con clientes, nombres y teléfonos distintos
- **CUANDO** corre una ejecución que procesa las dos
- **ENTONCES** cada supervisor recibe un correo con su supervisado y ningún nombre, cliente ni teléfono de la otra organización

#### Scenario: el servicio de correo rechaza
- **CUANDO** el servicio de correo no acepta el mensaje
- **ENTONCES** los no reportados quedan creados y con `notificado_en` nulo

#### Scenario: aceptado, pero la confirmación se pierde
- **DADO** que el servicio de correo aceptó el mensaje de un supervisor y su confirmación no llegó al sistema
- **CUANDO** corre la ejecución siguiente
- **ENTONCES** esos no reportados siguen con `notificado_en` nulo y salen otra vez en el correo de ese supervisor

#### Scenario: el correo que falló sale aunque no haya nada nuevo
- **DADO** un no reportado cuyo correo fue rechazado, y ningún otro supervisado del mismo supervisor sin aviso
- **CUANDO** corre la ejecución siguiente y no clasifica a nadie nuevo
- **ENTONCES** el supervisor recibe un correo con ese no reportado

#### Scenario: rechazado cerca de la medianoche
- **DADO** un no reportado cuyo correo fue rechazado en la ejecución de las 23:55 en la zona del cliente
- **CUANDO** corre la ejecución de las 00:00 del día siguiente
- **ENTONCES** ese no reportado sale en el correo de esa ejecución

#### Scenario: pasó el tope
- **DADO** un no reportado sin notificar detectado hace más de 24 horas
- **CUANDO** corre una ejecución
- **ENTONCES** no se envía, y el registro de la ejecución lo cuenta como vencido sin notificar

#### Scenario: en el borde exacto del tope
- **DADO** un no reportado sin notificar detectado a las 09:05 del martes
- **CUANDO** corre la ejecución de las 09:05 del miércoles
- **ENTONCES** todavía sale en el correo

#### Scenario: supervisor inactivo
- **DADO** un supervisor con `activo` en falso
- **CUANDO** su supervisado es clasificado
- **ENTONCES** no se le envía correo y el no reportado queda sin notificar

### Requirement: Contenido mínimo del correo

El sistema DEBE incluir de cada no reportado solo estos seis datos: fecha, nombre, cliente, hora
comprometida en la zona horaria del cliente, minutos de retraso y teléfono de contacto. No lleva
documento de identidad, datos de salud ni ningún otro dato de la persona. Los textos que vienen de
los datos —nombre, cliente, teléfono— se escriben en el correo como texto: nada de lo que
contengan se interpreta como formato ni como enlace.

**Decidido aquí: el correo se envía solo como texto sin formato**, sin ninguna parte con formato.
Así ninguna marca de los datos —enlace, imagen, estilo o cualquier otra— puede cargar contenido
remoto ni cambiar cómo se ve el correo: no hay dónde interpretarla. **Límite declarado:** algunos
lectores de correo convierten en enlace un texto que parece una dirección web o un teléfono; eso lo
hace el lector, no el sistema.

Origen: HU-07.CA-2, HU-07.CA-17, RNF-6.

**Excepción a HU-07.CA-17, aprobada por la Dirección (D-84):** la fecha se suma a los cinco datos
de HU-07.CA-2 porque, con el reintento de 24 horas, un correo puede traer no reportados de dos días
distintos. La fecha no es un dato de la persona.

#### Scenario: los seis datos
- **CUANDO** se arma el correo de un no reportado
- **ENTONCES** trae los seis datos, con la fecha y la hora en la zona del cliente

#### Scenario: nada más
- **CUANDO** se arma el correo
- **ENTONCES** no contiene el correo electrónico del consultor ni ningún otro campo del usuario

#### Scenario: textos con marcas de formato
- **DADO** un consultor cuyo nombre, el alias de su cliente y su teléfono guardados contienen etiquetas de enlace, de imagen y de estilo
- **CUANDO** se arma el correo
- **ENTONCES** el correo no tiene ninguna parte con formato, y las etiquetas aparecen tal cual, como texto

### Requirement: El no reportado se conserva

El sistema DEBE conservar el no reportado aunque la persona avise después. No se borra, y sus
datos —asignación, fecha, `detectado_en` y `minutos_retraso`— no cambian nunca. Lo único que
cambia en la fila es `notificado_en`, una sola vez, de nulo al instante en que el servicio de
correo aceptó el mensaje, y lo cambia el sistema.

Origen: HU-07.CA-14, RF-13. El escenario está en `aviso-inicio`, requisito «El aviso después de
haber sido reportado».

#### Scenario: aviso posterior
- **DADO** un no reportado de hoy
- **CUANDO** el consultor avisa después
- **ENTONCES** la fila conserva su asignación, su fecha, su `detectado_en` y sus `minutos_retraso`

#### Scenario: ninguna persona lo quita
- **CUANDO** un usuario de cualquier rol intenta editar o quitar un no reportado
- **ENTONCES** la base lo rechaza y la fila queda igual

#### Scenario: tampoco el sistema
- **CUANDO** la credencial del sistema intenta quitar un no reportado, cambiar sus minutos o su `detectado_en`, o cambiar un `notificado_en` que ya tiene valor
- **ENTONCES** la base lo rechaza y la fila queda igual

#### Scenario: la marca de notificado
- **CUANDO** la credencial del sistema pasa `notificado_en` de nulo a un instante
- **ENTONCES** se acepta

## Decisiones de diseño

| Punto | Decisión | Fundamento |
|---|---|---|
| E-1 · fecha de los parámetros | Zona horaria propia de la organización, en «Parámetro vigente». **Decidido por la Dirección: D-81** | Sin una fecha única, dos ejecuciones cercanas a la medianoche podrían usar valores distintos; la del servidor cambia de día por la tarde |
| E-2 · fecha de la consulta | No aplica en esta entrega: la consulta (HU-10) está diferida. Queda para su especificación | D-73 |
| E-5 · correo aceptado sin confirmación | Se repite, en «Correo agrupado al supervisor». **Decidido por la Dirección: D-82** | Un silencio deja a una persona sin la llamada |
| E-6 · credencial de la ejecución | Requisito «Protección de la ejecución recurrente» | Excepción escrita de la Definition of Done |
| E-9 · quién suple al supervisor desactivado | No aplica en esta entrega: la suplencia (HU-07.7) está diferida. Se decide cuando se construya | D-73 |
| Registro de la ejecución | La respuesta de la operación y el registro del servidor llevan, por organización, cuántos no reportados nuevos hubo, cuántos correos salieron, cuántos fallaron y cuántos no reportados pasaron de 24 horas sin notificar. Sin datos de personas | Permite ver un correo que no salió, mientras no exista el reintento garantizado |

## Riesgos aceptados

| Riesgo | Decisión | Qué lo cubre mientras tanto |
|---|---|---|
| Fecha de los parámetros frente a clientes en otra zona (E-1) | D-48, D-58 | Una sola regla de fecha por organización: el resultado es siempre el mismo |
| El margen que vence pasada la medianoche no se reporta | D-79 | Los datos de esta entrega no tienen turnos nocturnos |
| El intervalo no tiene tope: uno largo puede dejar sin detectar el no reportado de un día (requisito «Ejecución recurrente») | D-58 (RA-8) | El intervalo de esta entrega es 5 y no existe la operación para cambiarlo (HU-11) |
| Que el correo se entregue o se lea no lo garantiza el producto | RA-3 | La comprobación a mano del despliegue (H-4) |
| Aviso que llega junto con la ejecución (HU-07.CA-20): la prueba de concurrencia no se escribe en esta entrega | D-73 | La regla sí está: aviso y clasificación toman el mismo candado sobre la asignación, y la clasificación comprueba el aviso después de tomarlo. Lo que falta es la prueba que lo demuestre |
