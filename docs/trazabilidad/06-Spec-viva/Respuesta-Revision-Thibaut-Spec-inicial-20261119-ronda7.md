# Respuesta a la séptima ronda de revisión — especificación inicial (H-1)

> Jueves 19/11/2026. Dos corridas sobre el mismo material, lanzadas a la vez a las ~10:48:
> `Revision-Thibaut-Spec-inicial-20261119-ronda7-corrida1.md` (10 hallazgos) y `-corrida2.md`
> (6 hallazgos y 3 sospechas). Ninguna está marcada INCOMPLETO. Material: las tres especificaciones
> con las correcciones de la ronda 6, D-86 y D-87 (huellas `fa481eb7e751`, `c89ca51dc3f9` y
> `76fff9606102`), el recorte v4, la prueba local de HU-01.6 y el backlog v5.
>
> **Estado (actualizado el 19/11):** la Dirección aprobó las decisiones 36 a 39 (**D-88**). Siguen
> pendientes el cierre de la especificación con esta ronda y el PRD v8 (puntos 1 y 3 de «Pendiente
> de aprobación»).

## Unión de las dos corridas

Contados uno a uno: **13 hallazgos distintos.** Tres salieron en las dos corridas, siete solo en la
primera y tres solo en la segunda: 3 + 7 + 3 = 13. Comprobación: la primera tiene 3 + 7 = 10 y la
segunda 3 + 3 = 6. **Uno es crítico, y lo marcan las dos corridas.**

| # | Sev. | Hallazgo | C1 | C2 | Respuesta | Dónde |
|---|---|---|---|---|---|---|
| 1 | Crítico | La comprobación de estructura solo mira tablas: una vista o una función que corra con privilegios de su dueño puede leer filas de otra organización sin que nada falle | 1 | 1 | **Corregido.** La comprobación falla también ante una vista que no consulte con los permisos de quien la usa, una vista materializada, o una función con privilegios de dueño fuera de una lista cerrada (la operación de registro y, si hacen falta, funciones auxiliares de las reglas que solo responden sí o no). Escenario nuevo. **Venía del primer borrador**: no lo creó ninguna corrección | `acceso`, «Separación por organización en la base» |
| 2 | Alto | El plazo se mide con `detectado_en`, y la fila puede aparecer después | 2 | 2 | **Ya aprobado** (D-86, decisión 35). **Corregido** lo que había quedado mal: la tabla de alcance todavía decía «dentro del plazo» sin el límite | `no-reportados`, Alcance |
| 3 | Alto | `usuario.correo` se da como el correo de la cuenta, y D-87 acepta que deje de serlo; el servicio podría permitir el cambio aunque la regla diga que no | 4 | 3 | **Ya aceptado** (D-87). **Precisado:** es el correo de la cuenta *al escribirse el usuario*. **Agregado:** por comprobar en HU-01.1 si el servicio deja desactivar que la persona cambie su propio correo; si se puede, se desactiva, y la regla de D-87 deja de depender solo de que nadie lo intente | `acceso`, «Un correo, una cuenta, una organización» |
| 4 | Alto | La hora del aviso es la del candado y no la de recepción | 3 | — | **Descartado: lo decidió la Dirección** (D-86, decisión 30), con este mismo borde a la vista | — |
| 5 | Alto | Lo de la sesión cerrada en la base sigue sin comprobar; y la salida no dice cómo distinguiría la base una consulta del servidor de una directa | 5 | sospecha | **Ya declarado** (D-86, decisión 26). **Precisado** lo que trajo la sospecha de la corrida 2: la salida choca con «Identidad ante la base», porque el servidor también consulta con el pase de la persona; si se toma, esa decisión vuelve a la Dirección | `acceso`, «Separación por organización en la base» |
| 6 | Alto | La batería saca la lista de operaciones del lugar de autorización, que no conoce una operación que lo salte | 6 | — | **Corregido.** La lista sale de recorrer el código (toda ruta y acción del servidor). La batería falla si una no tiene fila o no pasa por el lugar de autorización. **Nació de una corrección:** la de la ronda 5 (hallazgo 12) | `acceso`, «Matriz de permisos» |
| 7 | Alto | Una tabla nueva que nadie agrega a la tabla de reglas por rol queda sin pruebas por rol | 7 | — | **Corregido.** Las tablas de la batería salen de la misma lista que recorre la comprobación de estructura; una tabla de negocio que falte hace fallar la batería | `acceso`, «Matriz de permisos» |
| 8 | Medio | «Una llamada repetida no duplica nada» contradice D-82, que repite el correo | 8 | — | **Corregido.** No duplica no reportados ni marcas; un correo sí puede repetirse, en el caso de D-82. **Nació en parte de una corrección:** la ronda 5 (hallazgo 7) arregló el escenario y no este texto | `no-reportados`, «Protección de la ejecución recurrente» |
| 9 | Medio | El recorte dice que las pruebas del reintento no entran, y la especificación las exige | 9 | — | **El que se contradice es el recorte v4:** su fila de HU-07.7 dice «no entran las pruebas propias del reintento», y su sección de criterios dice que entra la regla y no los escenarios de punta a punta. La especificación sigue la segunda. **Se corrige la fila en los tickets v5**; la especificación no cambia | — |
| 10 | Medio | Los 5 segundos dependen de una espera del candado sin tope | 10 | — | **Ya declarado** (HU-06.CA-14 se comprueba por observación en H-4). **Precisado:** la espera entra en esa medida, no tiene tope propio, y la observación no garantiza las demás veces | `aviso-inicio`, «Pantalla del consultor» |
| 11 | Alto | Quién inserta el aviso era contradictorio: la operación corre como su dueño, y el texto decía que ese dueño nunca actúa en el sistema en servicio | — | 4 | **Corregido.** El dueño de la operación es un rol propio que no puede conectarse a la base: solo actúa a través de la operación. El dueño de las tablas es otro, y solo lo usan migraciones y pruebas. **Nació de mi corrección de la ronda 6**: la del cruce, punto 1 | `aviso-inicio`, Datos · `acceso`, «Separación por organización en la base» |
| 12 | Alto | Un usuario sin el rol `consultor` podía tener una asignación y avisar por ella | — | 5 | **Corregido, con una decisión nueva (36).** Igual que con el supervisor: el consultor de una asignación debe tener el rol, y no se le quita mientras tenga una asignación que no ha terminado. Dos escenarios nuevos. Venía de antes | `aviso-inicio`, Datos y «La asignación es coherente en la base» |
| 13 | Medio | CA-20 no tiene prueba de concurrencia | — | 6 | **Descartado: ya declarado y aprobado** (D-73). Repetido de la ronda 6 | — |

**Cierre de la ronda:** 6 corregidos (1, 6, 7, 8, 11 y 12), 4 ya declarados o aprobados con el
texto precisado (2, 3, 5 y 10), 1 que se corrige fuera de la especificación (9, en los tickets v5) y
2 descartados (4 y 13): 6 + 4 + 1 + 2 = 13.

**Las otras dos sospechas de la corrida 2:**

- **El límite por IP podría ser uno solo para todos.** La entrada la llama el servidor (E-3); si el
  servicio ve la dirección del servidor, alguien podría agotar el límite y bloquear la entrada de
  todos. No está demostrado, pero tampoco descartado: **queda en «Riesgos aceptados» de `acceso`
  como algo que H-4 comprueba.**
- **Lecturas desde otros sitios (CORS):** misma sospecha que en la ronda 5, sin evidencia. Va a la
  lista de H-4 en los tickets v5.

## Control aplicado antes de responder

Crucé cada corrección contra las reglas que toca. Encontró dos huecos, los dos de esta ronda y los
dos corregidos:

1. Con la lista de operaciones sacada del código, la batería habría fallado con la entrada y con la
   operación interna de la ejecución recurrente, que no pasan por el lugar de autorización. Ahora
   las nombra como las dos excepciones que ya tenía «Sin sesión no se ve ni se registra nada».
2. Con el candado del consultor sumado al del supervisor, crear una asignación toma dos candados.
   Dos cambios a la vez podían bloquearse entre sí. Ahora se toman en orden de identificador.

## Lectura del nivel de lo nuevo

- **Un crítico real** (el 1). Venía del primer borrador, no de una corrección. Es de la misma
  familia que los críticos de seguridad de la ronda 5: la barrera entre organizaciones tenía una
  puerta lateral. Se cierra con una comprobación automática, cuya eficacia se ve al construirla en
  HU-03.1.
- **Dos errores nacidos de correcciones** (6 y 11) y uno en parte (8). El 11 es mío, de la ronda 6.
  Son menos que en la sexta (cinco y uno en parte), y ninguno abre un camino de falseo como el de
  la sexta.
- El resto son textos que prometían más de lo que garantizan, o cosas ya decididas.

**Por la regla acordada, la especificación se cierra con esta ronda.** Lo que no pasa por Thibaut
son las correcciones de hoy, incluida la del crítico.

## Pendiente de aprobación

**1. Cerrar la especificación con esta ronda.**

- **A. Cerrar ahora, como dice la regla.** Es la que recomiendo. Las correcciones de esta ronda
  caen en HU-03.1 y HU-02.4, que están entre los cuatro tickets que se revisan uno por uno (salvedad
  de D-74). Ahí se ve si la comprobación de estructura atrapa vistas y funciones.
- B. Octava ronda antes de cerrar. La fecha lo permite (domingo 22/11). El patrón de siete rondas
  dice que traerá algo más; la pregunta es si vale más que construir.

**2. Decisiones nuevas de esta ronda, 36 a 39:**

36. **El consultor de una asignación debe tener el rol `consultor`**, y no se le quita mientras
    tenga una asignación que no ha terminado. Es lo mismo que la 29 para el supervisor.
    **Aprobada por la Dirección el 19/11 (opción A):** un supervisor o una dirección con
    asignación propia lleva los dos roles. Se descartó la opción B (cualquier rol basta), más fiel
    a la letra de HU-02.CA-10 pero que deducía el rol de consultor de tener una asignación. Queda
    escrito también en `acceso`, «Roles».
37. **La comprobación de estructura cubre también vistas, vistas materializadas y funciones** con
    privilegios de su dueño. Solo pasan las de una lista cerrada, y agregar una se revisa en su
    ticket.
38. **La batería de permisos saca las operaciones del código y las tablas de la base**, no de
    listas escritas a mano.
39. **El dueño de la operación de registro es un rol propio que no puede conectarse a la base.**
    Precisa la 32.

**3. Al cerrar** (si se elige A): registrar el cierre y las decisiones 36 a 39 en el discovery,
cambiar el encabezado de estado de los tres `spec.md` y hacer el commit local. Antes de subir, una
cosa: el PRD v7 no tiene D-86 ni D-87, y D-87 debe entrar en su lista de versiones futuras. **Propongo
subir un PRD v8** con D-86 en adelante (incluida la decisión de cierre), en lugar del v7 que
fija D-83. La subida, como siempre, con tu
autorización.

## Lo que se arrastra a los tickets v5 (colchón)

- H-4: qué dirección IP ve el servicio de autenticación (sospecha de la corrida 2) y lecturas desde
  otros sitios (CORS).
- Recorte, fila HU-07.7: decir que lo que no entra son los escenarios de punta a punta del
  reintento, no sus pruebas de regla (hallazgo 9).
- H-3: los datos de arranque deben dar el rol `consultor` a todo consultor de una asignación
  (decisión 36).
- Siguen de la ronda 6: H-4 comprueba el límite por IP; HU-06.3 todavía dice que el aviso lo
  escribe el sistema.

## Verificación

Antes de corregir: 32 requisitos y 131 escenarios (contados con `grep`). Delta declarado: 0
requisitos y +3 escenarios:

- `acceso` +1: vista o función que se salta las reglas.
- `aviso-inicio` +2: consultor sin el rol · quitar el rol a quien tiene una asignación.
- `no-reportados`: sin cambio.

Dos escenarios se reescribieron sin cambiar el conteo: «operación sin fila» y «tabla sin sus casos
de consulta directa».

Conteo con `grep` después de corregir, y otra vez después del cruce: `acceso` 13 requisitos y 50
escenarios · `aviso-inicio` 10 y 42 · `no-reportados` 9 y 42. Suma: 13 + 10 + 9 = **32
requisitos**; 50 + 42 + 42 = **134 escenarios**. Coincide con el delta: 131 + 3 = 134.

Todas las correcciones se hicieron con la herramienta de edición. La especificación sigue sin
commit en el clon. El recorte v4 y el PRD v7 no cambian.
