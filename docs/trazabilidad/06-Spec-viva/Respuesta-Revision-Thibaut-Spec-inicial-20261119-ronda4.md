# Respuesta a la cuarta ronda de revisión — especificación inicial (H-1)

> Jueves 19/11/2026. Dos corridas sobre el mismo material, lanzadas a la vez:
> `Revision-Thibaut-Spec-inicial-20261119-ronda4-corrida1.md` (9 hallazgos) y `-corrida2.md`
> (10 hallazgos, más dos sospechas que el propio revisor no pudo confirmar). Material: las tres
> especificaciones con las correcciones de la ronda 3, el recorte v4, la prueba local de HU-01.6 y
> el backlog v5.

## Unión de las dos corridas

Contados uno a uno: **17 hallazgos distintos.** Dos salieron en las dos corridas, siete solo en la
primera y ocho solo en la segunda: 2 + 7 + 8 = 17. Comprobación: la primera tiene 2 + 7 = 9 y la
segunda 2 + 8 = 10. **Ninguno es crítico** (la ronda 3 tuvo uno).

| # | Sev. | Hallazgo | C1 | C2 | Respuesta | Dónde |
|---|---|---|---|---|---|---|
| 1 | Alto | Que la regla de la base exija usuario activo no tenía ninguna prueba | 1 | — | **Corregido.** Escenario nuevo: un usuario desactivado que conserva su pase no recibe nada al consultar la base | `acceso`, «Separación por organización en la base» |
| 2 | Alto | La cookie podía declarar el dominio padre y viajar a otro subdominio | 2 | sosp. | **Corregido.** La cookie va sin dominio, solo al propio sitio; el escenario de marcas lo comprueba | `acceso`, «Peticiones que vienen de otro sitio» |
| 3 | Alto | El horario que cae entero en la hora que no existe sigue sin decisión, y faltan escenarios de la hora repetida | 3 | 9 | **Pendiente de la Dirección:** es el riesgo propuesto en la ronda 3, ahora con lo que le faltaba anotado | `aviso-inicio`, Riesgos aceptados |
| 4 | Alto | Se podía quitar el rol de supervisor después y dejar la asignación incoherente | 4 | 5 | **Corregido.** Un segundo disparador, en `usuario_rol`, rechaza quitar el rol a quien supervisa una asignación vigente. Escenario nuevo. Era un hueco de la corrección de la ronda 3 | `aviso-inicio`, Datos y «La asignación es coherente en la base» |
| 5 | Medio | Un consultor sin ninguna asignación no tenía motivo | 5 | — | **Corregido.** Sexto motivo, «no tiene ninguna asignación», que coincide con lo que el recorte dice de HU-02.3. Escenario nuevo | `aviso-inicio`, «Motivo cuando no hay botón» |
| 6 | Medio | El cierre de sesión no tenía la protección contra peticiones de otro sitio | 6 | — | **Corregido.** La regla del origen vale para entrar y para cerrar. Escenario nuevo | `acceso`, «Peticiones que vienen de otro sitio» |
| 7 | Medio | Que `sesion_dias` rija en cuanto cambia no tenía escenario | 7 | — | **Corregido.** Escenario nuevo: el valor se lee en cada petición, no se copia al entrar | `acceso`, «Sesión vigente» |
| 8 | Medio | Con el reintento de 24 horas un correo puede mezclar dos días, y la fecha no estaba entre los datos | 8 | — | **Corregido.** La fecha pasa a ser el sexto dato del correo; no es un dato de la persona | `no-reportados`, «Contenido mínimo del correo» |
| 9 | Medio | La duración de la sesión depende de un campo que la documentación del servicio no describe | 9 | — | **Corregido en parte y riesgo propuesto.** Si el pase no trae ese momento, la sesión vence: nunca queda vigente por defecto. Que una actualización del servicio cambie el campo queda como riesgo propuesto | `acceso`, «Sesión vigente» y Riesgos aceptados |
| 10 | Alto | La hora del aviso era la de la inserción y no la de recepción que pide HU-06.CA-2 | — | 1 | **Corregido.** Todo el registro ocurre en una sola operación de la base y usa el instante de su inicio: es «cuando el sistema recibe el toque». Era un efecto de la corrección de la ronda 3 | `aviso-inicio`, «Registrar el aviso», Datos y «Puntual o llegada tardía» |
| 11 | Alto | El plazo «un intervalo» no se deducía del mecanismo: el proceso de la llamada podía alargarlo | — | 2 | **Corregido.** `detectado_en` es el instante de la llamada, uno para todo lo que procesa; la regla garantiza ese instante. Que la fila aparezca tarda además lo que dure el proceso: límite declarado | `no-reportados`, «Clasificación» y «Ejecución recurrente» |
| 12 | Alto | Una petición que cruza la medianoche mientras se procesa podía dejar el aviso en el día siguiente | — | 3 | **Corregido** con lo mismo del 10: comprobación y escritura usan el mismo instante. Escenario nuevo. También era efecto de la ronda 3 | `aviso-inicio`, «Registrar el aviso» |
| 13 | Alto | La concurrencia entre aviso y clasificación podía dejar un orden que HU-07.CA-20 prohíbe | — | 4 | **Corregido el diseño; la prueba sigue diferida.** Aviso y clasificación toman el mismo candado sobre la asignación, y la clasificación comprueba el aviso después de tomarlo. Lo que no entra en esta entrega es la prueba de concurrencia (D-73) | `aviso-inicio`, «Registrar el aviso» · `no-reportados`, «Clasificación» y Riesgos |
| 14 | Medio | Las respuestas de «Registrar el aviso» no cubrían una asignación propia que hoy no está pendiente | — | 6 | **Corregido.** Sexta respuesta: no crea nada, dice su motivo y, si otra está pendiente, cuál toca. Escenario nuevo | `aviso-inicio`, «Registrar el aviso» |
| 15 | Medio | El borde exacto de las 24 horas no estaba decidido | — | 7 | **Corregido.** El tope incluye su borde: a las 24 horas exactas todavía se envía. Escenario nuevo | `no-reportados`, «Correo agrupado al supervisor» |
| 16 | Medio | Con dos asignaciones en el mismo motivo no se sabía cuál mostrar | — | 8 | **Corregido.** Se usa la misma regla de «Cuál asignación toca»: la de inicio más temprano y, ante empate, la de identificador menor. Escenario nuevo | `aviso-inicio`, «Motivo cuando no hay botón» |
| 17 | Medio | La prueba de los textos del correo solo cubría el nombre | — | 10 | **Corregido.** El escenario cubre nombre, cliente y teléfono | `no-reportados`, «Contenido mínimo del correo» |

**Cierre de la ronda:** 14 corregidos, 1 corregido en el diseño con la prueba diferida (13), 1
corregido en parte con riesgo propuesto (9) y 1 pendiente de la Dirección (3): 14 + 1 + 1 + 1 = 17.

La segunda sospecha de la corrida 2 (que las reglas de `usuario` puedan llamarse a sí mismas) no
es un hallazgo: el propio revisor dice que no puede confirmarla sin el SQL. Queda anotada para
HU-03.1, que se revisa por ticket (D-74).

## Lectura del nivel de lo nuevo

**Baja, pero no lo bastante para cerrar sin mirar.** No hay críticos, y la mayoría son bordes y
pruebas que faltaban (1, 5, 6, 7, 14, 15, 16, 17). Pero tres hallazgos (4, 10 y 12) vuelven a ser
huecos que dejaron las correcciones de la ronda anterior. Es la tercera vez que pasa en esta
especificación: el patrón es real y es mío.

**Opciones para la Dirección:**

- **A. Quinta ronda hoy, con dos corridas, y cerrar con ella** si no trae críticos ni errores de
  diseño nacidos de una corrección. Son unos 15 minutos de revisor. Es la que recomiendo:
  respeta «toda corrección se revisa» y cabe en el plan de cerrar hoy.
- B. Cerrar ahora. Las correcciones de esta ronda quedarían sin revisar hasta la ronda de cada
  tramo (D-74). Es más rápido, pero repite justo el patrón de arriba.
- C. Quinta ronda sin compromiso de cierre. Es la más segura, pero puede pasarse del domingo 22/11.

## Decisiones tomadas en la especificación que la Dirección debe ver

A las trece que siguen abiertas de las rondas 1 a 3 se suman ocho:

17. **Un solo instante para todo el registro del aviso:** el inicio de la operación en la base.
    Precisa la 12 de la ronda 3.
18. **Aviso y clasificación toman el mismo candado** sobre la asignación.
19. **No se puede quitar el rol de supervisor** a quien supervisa una asignación vigente.
20. **Sexto motivo, «no tiene ninguna asignación»,** y selección fija cuando varias asignaciones
    dan el mismo motivo.
21. **La fecha va en el correo** como sexto dato.
22. **El tope de 24 horas incluye su borde.**
23. **`detectado_en` es el instante de la llamada.**
24. **Si el pase no trae el momento de entrada, la sesión vence.**

Riesgos que solo la Dirección puede aceptar: el **cambio de hora** (hallazgo 3) y el **campo del
pase que el servicio no documenta** (hallazgo 9).

## Verificación

Antes de corregir: 32 requisitos y 112 escenarios. Delta declarado: 0 requisitos y +9 escenarios
(`acceso` +3: usuario desactivado con pase vigente, cierre desde otro sitio, el plazo cambia con la
sesión abierta · `aviso-inicio` +5: quitar el rol a quien supervisa, sin ninguna asignación, ya
avisó en dos asignaciones, la petición cruza la medianoche mientras se procesa, nombra una
asignación propia que hoy no está pendiente · `no-reportados` +1: en el borde exacto del tope).
Cuatro escenarios se reescribieron sin cambiar el conteo: «marcas de la cookie», «plazo», «los
seis datos» y «textos con marcas de formato».

Conteo con `grep` después de corregir: `acceso` 13 requisitos y 45 escenarios · `aviso-inicio` 10
y 35 · `no-reportados` 9 y 41. Suma: 13 + 10 + 9 = **32 requisitos**; 45 + 35 + 41 = **121
escenarios**. Coincide con el delta: 112 + 9 = 121.

El recorte v4 no cambia: sus frases sobre el aviso, el correo y H-4 siguen siendo ciertas con estas
correcciones.
