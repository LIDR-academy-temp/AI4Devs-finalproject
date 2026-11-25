> Detalla en esta sección los prompts principales utilizados durante la creación del proyecto, que justifiquen el uso de asistentes de código en todas las fases del ciclo de vida del desarrollo. Esperamos un máximo de 3 por sección, principalmente los de creación inicial o  los de corrección o adición de funcionalidades que consideres más relevantes.
Puedes añadir adicionalmente la conversación completa como link o archivo adjunto si así lo consideras

> **Cómo se trabajó con IA en este proyecto (entrega 1).** Herramienta: **Claude Code** (CLI y app de escritorio de Anthropic), con un agente configurado como *advisor* con instrucciones persistentes (`CLAUDE.md`) y memoria entre sesiones. Modelos: **Claude Opus** en las sesiones de septiembre de 2026 (discovery y alcance) y **Claude Opus / Fable** en la de octubre (esta entrega) — el modelo exacto por sesión no se registró en septiembre y se declara como tal. Skills y comandos: el método de la Sesión 2 del máster (PROMPT 1 → PROMPT 4) aplicado como conversación guiada, no como comando. **Los prompts de abajo son los que se lanzaron, no una versión limpia reconstruida** — incluido el que no funcionó.
>
> **Regla del proyecto:** el agente propone, la Dirección decide. Cada decisión registrada lleva su fundamento; las superadas se tachan, no se borran.
>
> **Actualización del jueves 19/11/2026.** Las secciones 1 a 7 son las de la entrega 1 y citan las decisiones de entonces (D-1 a D-17). Desde noviembre el trabajo se registra en la sección 8, pieza por pieza. **Todo lo que este archivo cita se puede comprobar en el repositorio:** el registro de decisiones (hoy D-1 a D-99) está en `docs/trazabilidad/01-Discovery/discovery-controlador-tiempo.md`, y cada paso del método —PRD, backlog, tickets, especificación— está en `docs/trazabilidad/` con sus revisiones. Las revisiones adversariales las hace un modelo de otro proveedor, distinto del que redacta; el modelo exacto de cada una está en su cabecera.

## Índice

1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)

---

## 1. Descripción general del producto

**Prompt 1:** *(09/09/2026 · Claude Code, Opus · PROMPT 1 del método — el terreno)*

```
Quiero que el proyecto final del máster sea un Controlador de Tiempo con conectores a las
herramientas de gestión que usan nuestros clientes. No es un ejercicio: es una necesidad real que
apareció en tres clientes. Antes de proponer nada, mapea el terreno que ya existe: las plantillas
RegHoras de Proveedor A y Proveedor B, el reporte mensual de horas de un cliente, y el modelo de catálogo en HTML
que diseñamos y no implementamos. Dime qué mide cada uno, dónde vive y qué campos reales tiene.
No inventes campos: léelos de los archivos.
```

*Ajuste humano:* el agente devolvió un mapa de **tres modelos conviviendo** (asistencia, imputación por porcentaje, actividad por catálogo) y detectó deuda real (dos generaciones de plantilla con la convención de nombres divergida). Se aceptó tal cual; se corrigió un alias de cliente.

**Prompt 2:** *(09/09/2026 · Opus · PROMPT 2 — las cinco preguntas del product partner escéptico)*

```
Ahora hazme las cinco preguntas del product partner escéptico, una por una, y no pases a la
siguiente hasta que yo conteste. El dolor principal es este: a veces nos enteramos por nuestros
clientes de que un recurso no asistió o no se conectó.
```

*Ajuste humano:* la primera pregunta produjo el **reencuadre que guía el producto** — *«eso no es un problema de registro, es de detección»*. De la ronda salieron 14 decisiones (D-1 … D-14) y 8 puntos abiertos, registrados con fundamento en el documento de discovery. La Dirección decidió el modelo comercial (D-14) contra la propuesta inicial del agente.

**Prompt 3:** *(10/09/2026 · Opus · PROMPT 3 — alcance: el agente propone, la Dirección recorta)*

```
Propón el alcance del MVP. Yo recorto. Regla: anticipar todas las necesidades previsibles,
construir solo las del MVP y dejar las tuberías listas para el resto. Una tubería es un punto de
extensión, no una funcionalidad a medias. Y precisa esto: el aviso de llegada NO es el registro de
actividad; son dos actos distintos, y una hora después de la hora de inicio quiero el reporte de
quienes no se reportaron.
```

*Ajuste humano:* la v1 del agente dejaba el aviso fuera del MVP y el MVP no resolvía el primer dolor (riesgo 1). La Dirección lo subió al MVP el mismo día (D-17) y el agente reescribió la propuesta como **reporte programado** en lugar de motor de alertas en tiempo real — mucho más simple. Se produjo la v2, que es la base de esta entrega.

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

**Prompt 1:** *(17/10/2026 · Claude Code, Fable · a partir de la propuesta v2 y la plantilla oficial)*

```
Con el alcance aprobado (propuesta MVP v2) y la plantilla del repositorio oficial del proyecto
final, escribe la sección 2 del README. Stack: AdonisJS + React + PostgreSQL, el mismo del proyecto
de referencia del curso, para reutilizar el harness (OpenSpec, hooks, evals). Justifica el patrón
elegido con tres razones y di qué sacrifica. Diagrama en mermaid. Las nueve capacidades del MVP
y las tuberías obligatorias (organización en todo registro, referencia externa genérica) tienen que
verse reflejadas; nada que no esté en la propuesta aprobada.
```

*Ajuste humano — el que más cambió el documento:* el stack propuesto en este prompt (AdonisJS, el del proyecto de referencia del curso) **lo cuestionó la Dirección** el mismo día: pidió decidir por lo que conviene al proyecto, no por suposiciones sobre el perfil de quien lo construye. El agente verificó entonces el stack real del sistema de talento humano de la empresa (Next.js 15 + React 19 + Supabase + pg-boss + Vitest + Playwright) y corrigió su recomendación: **el stack que el futuro mantenedor ya opera pesa más que reutilizar el del curso.** Se reescribieron la sección 2 y los tickets 1 y 3; el modelo de datos, la API y las historias no cambiaron.

**Prompt 2:** *(17/10/2026 · Fable · la pregunta de la Dirección que cambió la decisión, literal)*

```
AdonisJS + ...: ¿por qué estimas que no es mi lenguaje de origen? Me gustaría tomar la decisión
considerando lo que más conviene para el proyecto, enfoquemos en esa línea.
```

*Resultado:* el agente reconoció que la afirmación no tenía fuente, verificó el stack de la casa leyendo los `package.json` del sistema de talento, y presentó tres opciones con criterios del proyecto (quién lo mantiene, el job programado, lo que viene en el curso). Decisión: **Opción A, Next.js + Supabase + ~~pg-boss~~**, con un principio adjunto *(pg-boss quedó superado el 16/11 por D-27: el reporte lo dispara el cron de Supabase llamando a una ruta protegida, y pg-boss pasó a tubería)*: *incorporar la tecnología que beneficie cuando aparezca, sin mezcolanza; lo mejor que se pueda pagar.*

**Prompt 3:** — *no aplica en esta entrega*

### **2.2. Descripción de componentes principales:**

**Prompt 1:** *(incluido en el prompt 1 de 2.1 — una sola petición para toda la sección 2)*

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

**Prompt 1:** *(incluido en el prompt 1 de 2.1; la estructura copia la convención por capability del proyecto de referencia del curso)*

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

### **2.4. Infraestructura y despliegue**

**Prompt 1:** *(incluido en el prompt 1 de 2.1)*

*Ajuste humano:* el proveedor concreto de despliegue se dejó **sin decidir a propósito** hasta la entrega 2 (costo y soporte de jobs programados).

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

### **2.5. Seguridad**

**Prompt 1:** *(incluido en el prompt 1 de 2.1, con esta instrucción adicional del mismo día)*

```
En seguridad incluye lo que ya practicamos: el hook que impide que secretos, correos reales o
ficheros .env entren en un commit y deja una línea fechada en un registro — bloquear sin registrar
protege pero no demuestra. Y la validación en el borde: nunca volcar el cuerpo de una petición sobre
un registro.
```

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

### **2.6. Tests**

**Prompt 1:** *(incluido en el prompt 1 de 2.1 — plan de pruebas, sin ejecución en esta entrega)*

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

---

### 3. Modelo de Datos

**Prompt 1:** *(17/10/2026 · Fable)*

```
Escribe el modelo de datos en mermaid erDiagram con todo el detalle que permite la sintaxis
(PK, FK, tipos, restricciones). Entidades: las que salen de las nueve capacidades del MVP y de la
tabla de capacidades anticipadas de la propuesta v2 — cada tubería es un campo, una entidad o un
estado, nunca una funcionalidad. Dos cosas no se negocian: organizacion_id en toda tabla de negocio
y la referencia externa como entidad propia. La traza es append-only. Los cálculos (horas,
porcentaje por referencia) se derivan, no se capturan.
```

*Ajuste humano:* se añadió `PARAMETRO` con ámbito global → cliente → asignación para que `{1}` pueda decidirse después sin tocar el esquema (punto abierto PA-1), y se marcó `aprobador_cliente` como rol existente sin acceso.

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

---

### 4. Especificación de la API

**Prompt 1:** *(17/10/2026 · Fable)*

```
Tres endpoints en OpenAPI 3.1, los del flujo principal: aviso de llegada (idempotente por
asignación y fecha), registro de actividad (nace en borrador, horas calculadas) y reporte de no
reportados (solo supervisor y dirección, acotado a la organización). Códigos de respuesta reales,
no genéricos: 200 cuando el aviso ya existía, 409 cuando el período está bloqueado, 403 para el
rol consultor en el reporte. Un ejemplo de petición y respuesta.
```

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

---

### 5. Historias de Usuario

**Prompt 1:** *(17/10/2026 · Fable)*

```
Tres historias de usuario de las cinco must-have, con criterios de aceptación declarativos, de
negocio, sin endpoints ni nombres de campo (eso baja un nivel, a la spec ejecutable). Cada historia
dice explícitamente qué queda fuera de ella. Aplica INVEST como filtro: si una historia falla dos
criterios, no entra. La primera es el aviso de un toque con objetivo de menos de 5 segundos — eso
es restricción de diseño, no aspiración.
```

*Ajuste humano:* en HU-2 se dejaron **dos supuestos visibles** (canal: correo; `{1}` = 60 minutos, global) porque la reunión operativa que debía decidirlos no dejó registro. Un hueco declarado es una decisión; uno callado es un descuido.

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

---

### 6. Tickets de Trabajo

**Prompt 1:** *(17/10/2026 · Fable)*

```
Tres tickets: uno de backend (el job programado del reporte de no reportados), uno de frontend
(la pantalla de aviso de un toque, móvil primero) y uno de base de datos (el esquema inicial con
las dos tuberías obligatorias). Cada uno con descripción, criterios de aceptación técnicos con
casos límite concretos, tareas, definición de hecho, estimación y prioridad. El de base de datos
sigue nuestro patrón de migración controlada: cada objeto verifica su existencia antes y después
con mensaje propio, nunca el del motor, y cierra con una validación 1 a 1 de solo lectura.
```

*Ajuste humano:* en el ticket 1 se añadió el caso límite de los minutos exactos (aviso a 08:59 no aparece; a 09:01 sí, con 61 minutos) — la clase de omisión que un camino feliz no ve.

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

---

### 7. Pull Requests

**Prompt 1:** — *no aplica en la entrega 1 (sin desarrollo todavía)*

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

---

### 8. Construcción, ticket por ticket

Desde aquí el prompt de cada pieza es su ticket: el agente recibe el ticket, las reglas de `CLAUDE.md` y la especificación de la capacidad. Se anota lo que el agente decidió por su cuenta y lo que ajustó la Dirección. El texto de cada ticket se cita tal como está en `docs/trazabilidad/05-Tickets/Tickets-MVP-Controlador-de-Tiempo-20261118-v4.md`.

**HU-01.6 · Qué admite el servicio de autenticación (18/11/2026)**

```text
Ticket HU-01.6: Comprobar qué admite el servicio de autenticación: sesión de 30 días, enlace de
72 horas, cierre de las demás sesiones, si los valores pueden variar por organización y qué
límites pone a los intentos de entrada y a las peticiones de enlace (PA-B10).
```

*Por qué va primero:* si el servicio no admitía esos valores, cambiaban la especificación y otros tres tickets. Por eso se hizo antes de escribir la especificación (H-1).

*Decisiones del agente:* hacerlo en dos partes. Primero, lo que dice la documentación del servicio (`docs/trazabilidad/06-Spec-viva/HU-01.6-comprobacion-documental-20261118-v1.md`). Después, siete pruebas contra el servicio levantado en local, con un guion propio (`docs/trazabilidad/06-Spec-viva/HU-01.6-prueba-local.py`), corridas dos veces con el mismo resultado (`docs/trazabilidad/06-Spec-viva/HU-01.6-prueba-local-20261118-v1.md`).

*Lo que se torció:* la primera corrida del guion leía el rechazo de un enlace como aceptación. Se cazó y se corrigió antes de dar resultados, y el documento lo declara.

*Ajuste humano:* la Dirección decidió con cada resultado. La duración de la sesión la controla el sistema y no el servicio (D-69); el enlace dura 24 horas y no 72 (D-70); la sesión se valida contra el servicio en cada petición, porque así una sesión cerrada se rechaza de inmediato (D-76, que cierra D-71). Se aceptaron dos riesgos con lo que los cubre mientras tanto: el límite de intentos por dirección y no por cuenta (D-72), y que el tiempo de respuesta de la entrada delate si un correo tiene cuenta (D-77).

*Límite declarado:* se probó la instancia local, no la gestionada. Lo que toca a la entrega se repite en el despliegue (H-4).

**H-2 · Integración continua (18/11/2026)**

```text
Ticket H-2: integración continua —estilo, tipos y pruebas— en verde en el repositorio.
Origen: restricción R-4 del PRD. No hay código de aplicación todavía.
```

*Decisiones del agente:* base de Next.js 15 generada con la herramienta oficial y recortada (sin fuentes descargadas de la red, para que compilar no dependa de un tercero; sin las imágenes de ejemplo) · dos trabajos separados, uno para las pruebas de los guardarraíles y otro para la aplicación · las dependencias se instalan tal como dice el fichero de bloqueo · de los scripts de instalación de terceros solo se autoriza uno, el del compilador que usan las pruebas.

*Límite declarado:* todavía no hay pruebas de la aplicación, así que ese paso termina en verde sin correr ninguna. Las primeras llegan con el primer ticket que tenga reglas. Se comprobó a mano que el paso de estilo sí rechaza código incorrecto.

*Lo que se torció:* la primera corrida en el repositorio (19/11) falló en el trabajo de los guardarraíles antes de correr ninguna prueba: el ejecutor ya no ofrece Python 3.9, la versión con que se habían probado en local. Se pidió Python 3.12 y la segunda corrida quedó en verde en los dos trabajos.

*Ajuste humano:* la Dirección autorizó cada subida (D-78: el agente hace los commits en local; cada subida la autoriza la Dirección).

**H-1 · Especificación inicial (18 y 19/11/2026)**

```text
Ticket H-1: Especificación inicial de las capacidades de las seis historias detalladas: acceso,
aviso de inicio, reporte de no reportados y su consulta; resuelve los puntos de la sección 8.
```

*Decisiones del agente:* tres capacidades en `openspec/specs/` (`acceso`, `aviso-inicio` y `no-reportados`), con cada criterio de aceptación del recorte citado en algún requisito, cruce comprobado con un guion. El primer borrador tenía 30 requisitos y 84 escenarios.

*Cómo se refutó:* siete rondas de revisión adversarial, de la 3 en adelante con dos corridas independientes sobre el mismo material. Hallazgos distintos por ronda: 17, 10, 15, 17, 18, 16 y 13. Cada uno se cerró de una de tres formas —se corrige, se acepta como riesgo o se descarta—, con su razón. Las rondas y sus respuestas están en `docs/trazabilidad/06-Spec-viva/`. Dos ejemplos de lo que encontraron:
- En el primer borrador, un consultor podía escribir su aviso directamente en la base con la hora que quisiera. Desde la ronda 1 el aviso ya no lo escribe el consultor, y desde la ronda 5 lo registra una operación de la base que se llama con la sesión de la persona (decisión 25 de D-86).
- En la ronda 7, la comprobación de estructura no miraba vistas ni funciones con privilegios: una puerta lateral en la separación entre organizaciones, que venía del primer borrador (decisión 37 de D-88).

*Lo que se torció:* las correcciones del agente abrieron huecos nuevos en casi todas las rondas; por ejemplo, un reintento después de la medianoche podía registrar el aviso del día siguiente. Desde la ronda 5 se aplica un control: antes de responder, cada corrección se cruza contra las reglas que toca. Encontró huecos en las rondas 5, 6 y 7, que se corrigieron antes de entregar la respuesta.

*Ajuste humano:* la Dirección decidió las preguntas abiertas: zona horaria propia de la organización (D-81) y qué hacer con un correo que se puede repetir (D-82). También aprobó, una por una, las decisiones que la especificación tomó sin venir del backlog (D-84, D-86 y D-88; en la 36 eligió la opción A: quien supervisa y tiene asignación propia lleva los dos roles) y aceptó cuatro riesgos (D-79, D-85 y D-87). Fijó además la regla de cierre: si una ronda trae errores nacidos de correcciones, se corrige y se cierra con la siguiente. Con ella se cerró en la ronda 7 (D-89): **32 requisitos y 134 escenarios**.

**Trazabilidad en el repositorio (19/11/2026, D-90 y D-91)**

```text
Por favor actualicemos gh, documentos desactualizados crean confusión.
Debemos cuidar la integridad referencial (trazabilidad) en todo lo que subimos.
```

*Qué lo motivó:* al revisar qué faltaba para la entrega final, el agente encontró que el README seguía describiendo el MVP anterior a la especificación, con una numeración de tickets que ya no existía, y que `prompts.md` citaba decisiones que solo vivían fuera del repositorio. Además, dos reglas de `CLAUDE.md` estaban escritas y no se habían cumplido en H-2 ni en H-1: el pull request con su revisión guardada, y el README puesto al día en el mismo cambio.

*Decisiones del agente:* subir la cadena completa a `docs/trazabilidad/`, todas las versiones y sus revisiones, con un índice de origen y huella. Las carpetas conservan su nombre original, para que las citas que los documentos se hacen entre sí resuelvan tal como fueron escritas. El registro de decisiones se sube derivado sin nombres. Las cuatro revisiones del harness que traían ejemplos de ataque inventados se neutralizaron, porque el hook las detuvo, como debía.

*El control:* `scripts/verificar-referencias.py`, en la integración continua, comprueba que en los documentos vivos cada ruta, enlace, decisión, requisito, criterio y ticket citado exista, que cada copia coincida con su huella y su origen, y que ninguna copia ya subida cambie frente a la rama base. Sus pruebas tienen un caso positivo y uno negativo por regla, y un negativo por cada familia de identificador. Uno de los negativos falló la primera vez: el error estaba en el montaje de la prueba, no en el verificador.

*La revisión adversarial del propio cambio* (dos corridas, `docs/revisiones/`) encontró que la primera versión del verificador prometía más de lo que comprobaba: no miraba los criterios `HU-xx.CA-n`, ni los enlaces, ni el origen del índice. Además, cambiar a la vez una copia y su huella pasaba en verde. Se corrigió antes de abrir el pull request; la respuesta a cada hallazgo está junto a la revisión.

*Ajuste humano:* un pull request por tramo (D-90). La Dirección aprobó el control y pidió subir la cadena completa.

*La segunda ronda* la pidió la Dirección antes de unir el pull request, porque las correcciones de la primera no habían pasado por el revisor:

```text
Lo primero: la segunda ronda de Thibaut sobre el PR antes de que yo lo una.
```

*Lo que se torció:* casi todo lo que encontró nació de las correcciones de la primera ronda: el verificador reconocía los criterios completos pero no las abreviaturas («HU-03.CA-1 a CA-3»), y tres documentos seguían diciendo «D-1 a D-91». Lo más serio lo halló el agente al comprobar el commit de las rutas neutralizadas contra el propio verificador: reescribía 28 copias y la integración continua no lo vio, porque la rama se subió nueva; y la regla de inmutabilidad trataba como copia fija al registro de decisiones, así que la siguiente decisión habría puesto la integración continua en rojo. Además, dos decisiones nuevas (D-92 y D-94) contradecían al PRD v8, y lo que D-94 decía que cubría el riesgo era un supuesto.

*Ajuste humano:* la Dirección aprobó las correcciones y cuatro decisiones (D-96 a D-99): D-94 sin cobertura mientras tanto, dicho así; aceptar que las rutas de la primera versión sigan en el historial y unir con *squash*; el nombre del autor también en los metadatos del commit; y los tickets v5 con el PRD v9 antes del tramo 8, no en el colchón.

**HU-03.1 · Organización en la base y comprobación de estructura (20 y 23/11/2026, tramo 2)**

```text
Ticket HU-03.1: Organización en toda tabla de negocio y regla de la base que la filtra para
cualquier rol. Entrega además la comprobación de estructura: recorre todas las tablas de negocio
que existan, falla si alguna no tiene organización o no tiene regla, y corre en cada cambio desde
este ticket.
```

*Lo primero, antes de escribir:* la especificación dejaba una comprobación «por comprobar al construir HU-03.1»: si la base puede saber que la sesión del pase sigue abierta. El agente la probó en una base desechable antes de diseñar nada, porque el resultado decidía el diseño: sí puede. La salida alternativa, que volvía a la Dirección, no hizo falta.

*Decisiones del agente:* la comprobación de estructura en SQL de solo lectura, con dos listas cerradas escritas en ella (esquemas ajenos y funciones con privilegios del dueño); las pruebas de la base en Python contra la base local, cada caso dentro de una transacción que se deshace; un solo script para levantar la base, el mismo en la máquina y en la integración continua. Los servicios de archivos y de tiempo real de la plataforma se cuentan como «propio motor» en la lista de esquemas ajenos: la especificación no los nombra y el proyecto no los usa.

*Lo que se torció:* al correr las pruebas apareció un hueco que nadie había visto: la plataforma da a los roles de las personas el permiso de vaciar toda tabla nueva (`TRUNCATE`), y vaciar no pasa por las reglas. La migración lo quita, la comprobación de estructura lo detiene en toda tabla futura y `CLAUDE.md` lo dice en la sección 5. También: esta versión de la plataforma ya no da permiso de leer por defecto, así que la API rechazaba la consulta antes de llegar a la regla. Para probar la regla en sí, las pruebas dan el permiso dentro de una transacción que se deshace, como lo dará HU-02.1.

*Ajuste humano:* la regla de `organizacion` necesita la organización de quien consulta, y la tabla de usuarios nace en el tramo 3. La Dirección eligió, entre tres opciones, escribir la regla desde ya sobre una función que hasta el tramo 3 responde siempre «no» (D-100): segura por defecto y sin mover tickets de tramo.

*Revisión adversarial, ronda 1 (24/11/2026, dos corridas):* 13 hallazgos distintos, ninguno crítico (`docs/revisiones/tramo-2-hu-03.1-organizacion-ronda1-respuesta.md`). El más instructivo: sin regla permisiva la base ya no deja ver nada, así que las pruebas de la regla habrían pasado aunque `es_mi_organizacion` respondiera «sí»; ahora se prueba la función directamente, y con una regla permisiva que deja todo se ve que es la restrictiva la que corta, con su control. Además: la comprobación de estructura vigila `TRIGGER` y `REFERENCES` como decía `CLAUDE.md`, lee su salida de forma estricta y rechaza haber recorrido cero tablas; cada migración exige su validación; `sesion_abierta()` dice no con la sesión de otra cuenta, con otro rol y pasado el fin de la sesión. Antes de responder, el agente comprobó en la base local que la herramienta deshace entera una migración que falla a medias, y rompió a propósito las dos funciones para ver que las pruebas nuevas lo detectan.

*Ronda 2 (24/11/2026, dos corridas):* 10 hallazgos distintos, ninguno crítico, y casi todos nacidos de las correcciones de la ronda 1 (`docs/revisiones/tramo-2-hu-03.1-organizacion-ronda2-respuesta.md`): un rol de las personas podía asumir otro que omite las reglas; la sesión se comparaba con la hora de inicio de la transacción y no con la del reloj; «siempre no» solo se había probado con identificadores existentes; la prueba de «exactamente 20 filas» no veía una repetida; y las piezas nuevas se probaban sueltas, no dentro de los scripts que deciden. La atomicidad quedó probada también con `db reset` y `start`. Al probar `start`, el agente levantó la base desde la carpeta equivocada y la herramienta creó un proyecto vacío con otro nombre: `levantar-base.sh` ahora corre siempre desde la raíz del repositorio.

*Ronda 3 (24/11/2026, dos corridas):* 8 hallazgos distintos, ninguno crítico, todos nacidos de las correcciones de la ronda 2 (`docs/revisiones/tramo-2-hu-03.1-organizacion-ronda3-respuesta.md`). El de más peso: la hora del reloj, puesta en la ronda 2, contradecía que `sesion_abierta()` esté declarada STABLE, y la prueba que la defendía no cruzaba el fin dentro de una misma consulta. La Dirección eligió entre tres opciones la hora del inicio de cada consulta y aceptó el riesgo que deja (D-102). Además: los roles se miran por lo que se puede asumir (`'SET'`), no por pertenencia; el control de la cuenta de filas pasa por la misma decisión que los casos; «siempre no» exige `false` y no nulo; y la plantilla dice de `start` solo lo probado. *Corrige lo dicho arriba en la ronda 2:* `start` no probó la atomicidad; sobre una base nueva borra la base, que es otra cosa, y la atomicidad quedó confirmada solo con `migration up` y `db reset`. Antes de responder, el agente rompió a propósito la cuenta de filas y marcó la función STRICT, para ver que las pruebas nuevas lo detectan.

*Ronda 4 (24/11/2026, una corrida, corta):* 6 hallazgos, todos MEDIO, ninguno alto ni crítico (`docs/revisiones/tramo-2-hu-03.1-organizacion-ronda4-respuesta.md`). Cuatro eran texto que quedó atrás o que decía más de lo hecho; los otros dos, que la cota de D-102 no tenía prueba y que P7 tenía un margen de un segundo. *Ajuste humano:* la Dirección aprobó un control para el agente antes de responder cada ronda (cruce contra las reglas, búsqueda del texto viejo en todo el repositorio y cada «corregido» con su prueba) y cerró la revisión sin ronda 5.

---

> **El prompt que no funcionó (se registra a propósito).** El 17/10/2026 el agente intentó obtener tres decisiones de la Dirección con un cuadro de opciones (stack, visibilidad del repositorio, resultado de la reunión del 16/09). El cuadro se cerró dos veces sin respuesta porque llegaron mensajes del usuario mientras estaba abierto. Se procedió con las recomendaciones del agente como **supuestos declarados** en el README, revisables sección por sección. Lección: con el reloj puesto, preguntar en texto plano y seguir; no bloquear el trabajo en un diálogo.
