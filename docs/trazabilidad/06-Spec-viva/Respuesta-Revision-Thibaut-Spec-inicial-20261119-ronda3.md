# Respuesta a la tercera ronda de revisión — especificación inicial (H-1)

> Jueves 19/11/2026. Dos corridas sobre el mismo material, lanzadas a la vez a las 09:18:
> `Revision-Thibaut-Spec-inicial-20261119-ronda3-corrida1.md` (9 hallazgos) y `-corrida2.md`
> (11 hallazgos). Material: las tres especificaciones (ya con D-81 y D-82), el recorte v3, la
> prueba local de HU-01.6 y el backlog v5.

## Unión de las dos corridas

Contados uno a uno: **15 hallazgos distintos.** Cinco salieron en las dos corridas, cuatro solo
en la primera y seis solo en la segunda: 5 + 4 + 6 = 15. Comprobación: la primera tiene 5 + 4 = 9
y la segunda 5 + 6 = 11.

Ninguno toca D-81 (zona horaria de la organización) ni D-82 (correo repetido).

| # | Sev. | Hallazgo | C1 | C2 | Respuesta | Dónde |
|---|---|---|---|---|---|---|
| 1 | Crítico | La vía de la credencial del sistema, que lee datos de personas de todas las organizaciones, no tiene prueba de que el correo no las mezcle | — | 1 | **Corregido.** La separación en esa vía la pone el código: cada organización se procesa por separado y toda lectura lleva su filtro, en un solo lugar. Escenario nuevo con dos organizaciones | `no-reportados`, «Correo agrupado al supervisor» |
| 2 | Alto | La hora del aviso era a la vez la de llegada al servidor y la de inserción en la base | 3 | 2 | **Corregido.** Hay una sola hora: la de la base al registrar, que pone el disparador; la fecha y la clasificación se calculan con esa misma | `aviso-inicio`, Datos, «Registrar el aviso» y «Puntual o llegada tardía» |
| 3 | Alto | Un reintento que cruza la medianoche del cliente podía crear el aviso del día siguiente | 2 | 3 | **Corregido.** La petición nombra también el día que la pantalla ofreció; si ya no es el día en curso, devuelve el aviso de ese día o dice que la pantalla quedó vieja. Escenario nuevo | `aviso-inicio`, «Registrar el aviso» · recorte v4 |
| 4 | Alto | La marca de conexión cifrada de la cookie solo se anotaba en H-4; no hacía fallar nada | 5 | 4 | **Corregido.** Escenario nuevo: sin esa marca, H-4 no se cierra | `acceso`, «Peticiones que vienen de otro sitio» · recorte v4 |
| 5 | Alto | La comprobación de estructura exigía `organizacion_id` a todas las tablas, también a `organizacion` | 6 | 8 | **Corregido.** `organizacion` es la única excepción, nombrada, y su regla compara `id` con la organización del usuario | `acceso`, «Separación por organización en la base» |
| 6 | Medio | Nada garantizaba que una organización naciera con margen e intervalo | 7 | 9 | **Corregido.** Un disparador los crea al insertar la organización. Si aun así faltan, la ejecución salta esa organización y lo dice con un mensaje propio. Dos escenarios nuevos, uno positivo y uno negativo | `no-reportados`, Datos y «Parámetro vigente» |
| 7 | Alto | Las reglas por rol de `usuario`, `usuario_rol`, `cliente`, `parametro` y `organizacion` no tenían pruebas dentro de la organización | 1 | — | **Corregido.** Cada fila de la tabla de reglas por rol tiene su caso permitido y su caso rechazado en la batería. Dos escenarios nuevos: uno con los datos de los compañeros y otro que hace fallar la batería si a una tabla le faltan sus casos | `acceso`, «Reglas por rol en la base» y «Matriz de permisos» |
| 8 | Alto | El tope de 24 horas contradecía que «lo que no salió sale en la siguiente» | 4 | — | **Corregido el texto.** El alcance y la columna `notificado_en` dicen ahora que el reintento vale dentro de las 24 horas y que el tope es decisión de esta especificación, no del backlog | `no-reportados`, Alcance y Datos · recorte v4 |
| 9 | Medio | La especificación reduce HU-07.CA-15 a «generado» y omite «consultable» | 8 | — | **Descartado.** El propio criterio termina diciendo «se mide que el reporte exista en el sistema». Que se pueda consultar ya está declarado «en parte», a la espera de HU-10. Es el hallazgo 7 de la ronda 2, que se repite | — |
| 10 | Medio | Con el cambio de hora, un horario que cae entero en la hora que no existe queda sin duración | 9 | — | **Riesgo propuesto, pendiente de la Dirección.** Panamá, Lima y Bogotá no tienen horario de verano (comprobado con la base de zonas el 19/11) y los clientes de los datos de arranque están en una sola zona | `aviso-inicio`, Riesgos aceptados |
| 11 | Alto | La entrada no tenía protección contra peticiones de otro sitio | — | 5 | **Corregido.** La regla del origen vale también para la operación de entrada. Escenario nuevo | `acceso`, «Peticiones que vienen de otro sitio» |
| 12 | Alto | El supervisor de una asignación podía no tener el rol de supervisor | — | 6 | **Corregido.** Un disparador lo rechaza. Va en un requisito nuevo, «La asignación es coherente en la base» | `aviso-inicio`, Datos y requisito nuevo |
| 13 | Alto | El recorte difiere el aviso posterior y la concurrencia, pero la especificación los exige | — | 7 | **Corregido en parte, el resto ya estaba declarado.** La regla del aviso posterior sí entra: la garantiza la base y se prueba en HU-06.3 y HU-07.1; lo diferido es solo su prueba de punta a punta (alcance y recorte v4). La concurrencia (HU-07.CA-20) ya estaba en «Riesgos aceptados» | `no-reportados`, Alcance · recorte v4 |
| 14 | Medio | La excepción sin sesión nombraba la pantalla de entrada, no la operación que crea la sesión | — | 10 | **Corregido.** La excepción es «la entrada: su pantalla y su operación» | `acceso`, «Sin sesión no se ve ni se registra nada» |
| 15 | Medio | `dias_laborables` admitía una lista vacía o con días repetidos | — | 11 | **Corregido.** CHECK de al menos un día y ninguno repetido, con escenario en el requisito nuevo | `aviso-inicio`, Datos y requisito nuevo |

**Cierre de la ronda:** 12 corregidos, 1 corregido en parte con el resto ya declarado, 1
descartado y 1 riesgo propuesto: 12 + 1 + 1 + 1 = 15.

## Lectura del nivel de lo nuevo

**Todavía no se puede cerrar.** Hay un crítico nuevo, el 1: no es un error de diseño sino un hueco
de prueba en la vía más delicada, pero la regla del proyecto lo trata como crítico. Hay además tres
reglas de diseño que faltaban (3, 6 y 12), y una vez más una corrección anterior dejó un hueco: el
3 nace de la petición que nombra la asignación (ronda 2) y el 2 del aviso escrito por el
disparador (ronda 1).

Lo bueno: nada de lo nuevo es de redacción pura, ninguno repite un error de diseño de las rondas
anteriores y las decisiones de hoy (D-81 y D-82) salieron limpias. Las correcciones son baratas y
no tocan tickets, tallas ni tramos.

**Recomendación:** una cuarta ronda, con dos corridas unidas, sobre el texto corregido. Si lo que
traiga ya es de redacción, o evasión deliberada y no error, se cierra y se aprueba el domingo
22/11 como estaba previsto. La decisión es de la Dirección.

## Decisiones tomadas en la especificación que la Dirección debe ver

A las once de las rondas 1 y 2 se suman cinco:

12. **La hora del aviso es la de la base al registrarlo** (hallazgo 2). Precisa D-55: «la hora
    del sistema».
13. **La petición de aviso nombra la asignación y el día** (hallazgo 3).
14. **El supervisor de una asignación debe tener el rol `supervisor`** (hallazgo 12).
15. **Los parámetros iniciales los crea un disparador**, y una organización sin parámetro vigente
    se salta con su mensaje, sin usar un valor supuesto (hallazgo 6).
16. **La entrada también pasa por la regla del origen** (hallazgo 11).

Y un riesgo que solo la Dirección puede aceptar: el **cambio de hora** (hallazgo 10).

## Verificación

Antes de corregir: 31 requisitos y 102 escenarios. Delta declarado: +1 requisito («La asignación
es coherente en la base») y +10 escenarios (`acceso` +4: entrada desde otro sitio, marca de
conexión cifrada, datos de los compañeros, tabla sin sus casos · `aviso-inicio` +3: reintento
después de la medianoche, supervisor sin el rol, días laborables · `no-reportados` +3:
organización nueva, organización sin parámetro, dos organizaciones).

Conteo con `grep` después de corregir: `acceso` 13 requisitos y 42 escenarios · `aviso-inicio` 10
y 30 · `no-reportados` 9 y 40. Suma: 13 + 10 + 9 = **32 requisitos**; 42 + 30 + 40 = **112
escenarios**. Coincide con el delta: 31 + 1 = 32 y 102 + 10 = 112.

El recorte pasó a la versión 4 (`05-Tickets/Recorte-Entrega-20261119-v4.md`), con las mismas 35
filas de tabla que la v3 y seis líneas cambiadas. Tickets, tallas y tramos no cambian.
