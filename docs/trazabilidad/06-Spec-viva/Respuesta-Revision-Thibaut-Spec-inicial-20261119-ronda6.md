# Respuesta a la sexta ronda de revisión — especificación inicial (H-1)

> Jueves 19/11/2026. Dos corridas sobre el mismo material, lanzadas a la vez a las ~10:20:
> `Revision-Thibaut-Spec-inicial-20261119-ronda6-corrida1.md` (10 hallazgos) y `-corrida2.md`
> (10 hallazgos). Ninguna está marcada INCOMPLETO. Material: las tres especificaciones con las
> correcciones de la ronda 5 (huellas `6c4e7cfbaa3c`, `3d68482f94be` y `9263060e4c80`, iguales a
> las del clon antes de corregir), el recorte v4, la prueba local de HU-01.6 y el backlog v5.
>
> **Estado (actualizado el 19/11):** la Dirección aprobó las decisiones 25 a 35 (**D-86**) y
> aceptó el riesgo del correo cambiado en el servicio (**D-87**). Sigue pendiente solo la séptima
> ronda (punto 1 de «Pendiente de aprobación»).

## Unión de las dos corridas

Contados uno a uno: **16 hallazgos distintos.** Cuatro salieron en las dos corridas, seis solo en
la primera y seis solo en la segunda: 4 + 6 + 6 = 16. Comprobación: la primera tiene 4 + 6 = 10 y
la segunda 4 + 6 = 10. **La corrida 2 marca uno como crítico** (el 1); la corrida 1 marca ese mismo
como alto.

| # | Sev. | Hallazgo | C1 | C2 | Respuesta | Dónde |
|---|---|---|---|---|---|---|
| 1 | Crítico (C2) / Alto (C1) | Que la base corte el pase de una sesión cerrada depende de algo no comprobado, y la prueba citada no muestra que el pase traiga el identificador de sesión | 1 | 1 | **Ya declarado en la ronda 5** (decisión 26, «por comprobar» en HU-03.1 con su salida): no es un crítico nuevo. **Corregido lo que sí estaba mal:** la cita. El identificador está en la salida completa de la prueba (`session_id`), no en el resumen, y ahora se cita así. Y se dice qué escenarios cambian si se toma la salida | `acceso`, «Separación por organización en la base» |
| 2 | Alto | La base debía rechazar un correo distinto del de la cuenta, pero la salida lo deja solo en la carga; y si la cuenta cambia su correo en el servicio, nadie se entera | 7 | 3 | **Ya declarado en la ronda 5** (decisión 28, «por comprobar» en HU-01.1). **Corregido el texto de la salida:** si se toma, la garantía deja de estar en la base y el escenario se prueba sobre la carga. **Lo nuevo, el cambio de correo en el servicio:** límite declarado y **riesgo propuesto** | `acceso`, «Un correo, una cuenta, una organización» |
| 3 | Alto | La batería exige casos de ver y de cambiar por tabla, pero su escenario solo pide los de consulta | 10 | 7 | **Corregido.** Para cambiar, como nadie cambia ninguna tabla en esta entrega, un intento rechazado de insertar, editar y quitar con cada rol; el escenario lo exige. **Nació de una corrección:** la de la ronda 3 (hallazgo 7) cambió el requisito y no su escenario | `acceso`, «Reglas por rol en la base» y «Matriz de permisos» |
| 4 | Alto / Medio | CA-20 (aviso y clasificación a la vez) y CA-16 (dos asignaciones) quedan sin prueba, aunque la especificación afirma la garantía | 9 | 8 | **Ya declarado y aprobado:** los dos los difiere el recorte (D-73) y CA-20 está en «Riesgos aceptados». **Corregido** que `aviso-inicio` afirmaba la garantía sin decir que no tiene prueba: ahora lo dice, con la referencia | `aviso-inicio`, «Registrar el aviso» |
| 5 | Alto | El aviso toma su hora después de esperar el candado, no al recibir el toque (HU-06.CA-2), y «son milisegundos» no estaba acotado | 2 | — | **Corregido, con una decisión nueva (30 y 31).** «La hora en que el sistema recibe el toque» es el instante con candado, y la espera queda acotada: la clasificación toma cada asignación en su propia transacción, así que solo se espera lo que tarda una asignación. Si esa espera cruza la medianoche o el vencimiento, cuenta el instante con candado; tomarlo antes dejaría el aviso puntual junto al no reportado que CA-20 no admite. **Nació de una corrección:** la de la ronda 5 (hallazgo 8) afirmó la cota sin escribirla | `aviso-inicio`, «Registrar el aviso» · `no-reportados`, «Clasificación» |
| 6 | Alto | El intervalo no tiene tope: uno largo puede dejar un no reportado sin detectar nunca | 3 | — | **Ya aceptado** (D-58, RA-8 del PRD), pero la especificación no lo citaba y prometía el plazo sin condición. **Corregido:** el límite queda escrito en el requisito y en «Riesgos aceptados» | `no-reportados`, «Ejecución recurrente» y «Riesgos aceptados» |
| 7 | Alto | El plazo de un intervalo supone que el disparador llama exactamente a su minuto | 4 | — | **Corregido.** El límite declarado suma el retraso del disparador, y el registro anota con cuánto retraso llamó. El escenario «plazo» vale con el disparador a su hora | `no-reportados`, «Ejecución recurrente» |
| 8 | Alto | La comprobación de estructura no define qué es una «tabla de negocio» | 5 | — | **Corregido.** Es toda tabla de cualquier esquema, salvo una lista cerrada de esquemas ajenos (servicio, motor y extensiones, registro de migraciones) escrita en la comprobación. Una tabla en un esquema nuevo se recorre igual. Escenario nuevo | `acceso`, «Separación por organización en la base» |
| 9 | Alto | El límite por IP se da como cobertura de dos riesgos y nunca se probó | 6 | — | **Corregido el texto.** Es el límite que el servicio documenta (comprobación documental de HU-01.6: 150 peticiones cada 5 minutos por IP); la prueba local no lo cubrió. H-4 lo comprueba en el servicio gestionado: **se agrega a H-4 en los tickets v5** | `acceso`, «Riesgos aceptados» |
| 10 | Medio | No se dice en qué zona horaria «ha terminado» una asignación al quitar el rol de supervisor | 8 | — | **Corregido.** La regla ya estaba en el Vocabulario («el día» de una asignación es el de su cliente), pero el texto del disparador no la repetía: ahora la base calcula el día en la zona del cliente. Escenario nuevo para el último día. **Nació en parte de correcciones** (rondas 3 y 5) | `aviso-inicio`, Datos y «La asignación es coherente en la base» |
| 11 | Alto | HU-07.CA-7 (sin nada nuevo, no hay correo) y HU-07.CA-10 (el correo que falló sale en la siguiente) chocan | — | 2 | **Corregido, con una decisión nueva (33).** «Ningún no reportado nuevo» se lee como «ninguno sin notificar dentro del tope»: así el correo fallido sale aunque no haya nadie nuevo, y nunca sale un correo vacío. Escenario nuevo | `no-reportados`, «Correo agrupado al supervisor» |
| 12 | Alto | `detectado_en` es el instante de la llamada, pero la fila aparece después, y el tiempo hasta cada organización es acumulado | — | 4 | **Corregido.** El límite decía «mientras procesar cada organización tarde menos que su intervalo», y el tiempo que importa es el acumulado de la llamada hasta esa organización. Ahora lo dice, y el registro anota el tiempo desde el inicio de la llamada. **Nació de una corrección:** la precisión de la ronda 5 (hallazgos 2 y 4) | `no-reportados`, «Ejecución recurrente» |
| 13 | Alto | La operación de registro exige consultor propio, usuario activo y sesión vigente, pero solo se prueba la asignación de otra organización | — | 5 | **Corregido.** Dos escenarios nuevos: la asignación de un compañero de la misma organización, y el usuario desactivado o la sesión cerrada o vencida. **Nació de una corrección:** la de la ronda 5 (hallazgo 1) añadió las condiciones sin sus pruebas | `aviso-inicio`, «Registrar el aviso» |
| 14 | Alto | La credencial del sistema se salta las reglas y podía insertar un aviso falso que evita un no reportado | — | 6 | **Corregido, con una decisión nueva (32).** El permiso de insertar en `aviso_inicio` lo tiene solo el dueño de la operación de registro; la credencial del sistema no lo tiene. Los datos de arranque no traen avisos. Escenario nuevo. **Nació de una corrección:** la ronda 5 (hallazgo 1) escribió «es la única que inserta» sin hacerlo cumplir. Es el único de esta ronda que abre un camino real de falseo | `aviso-inicio`, Datos y «Registrar el aviso» · `acceso`, «Reglas por rol en la base» |
| 15 | Medio | El cambio de hora no tiene escenarios para la hora repetida ni para el fin inexistente | — | 9 | **Descartado: ya resuelto.** D-85 acepta ese riesgo y la especificación lo dice letra por letra | — |
| 16 | Medio | La prueba del contenido del correo solo intenta etiquetas de enlace | — | 10 | **Corregido, con una decisión nueva (34).** El correo se envía solo como texto sin formato: no hay dónde interpretar ninguna marca. El escenario prueba enlace, imagen y estilo. Límite declarado: algunos lectores convierten en enlace un texto que parece una dirección | `no-reportados`, «Contenido mínimo del correo» |

**Cierre de la ronda:** 11 corregidos, 4 ya declarados con el texto precisado (1, 2, 4 y 6) y 1
descartado: 11 + 4 + 1 = 16.

## Control aplicado antes de responder

Crucé cada corrección contra las reglas que toca. Encontró cuatro cosas, todas corregidas:

1. **Mío, de esta ronda:** escribí que el dueño de la operación de registro «no lo usa nadie fuera
   de las migraciones», y las pruebas automatizadas necesitan crear avisos. Ahora dice: migraciones
   y pruebas, nunca el sistema en servicio.
2. **De la ronda 5:** `acceso` decía «la única identidad que omite las reglas es la credencial del
   sistema», y la operación de registro, que corre como su dueño, también las omite. Ahora nombra
   las dos.
3. **Mío, de esta ronda:** la salida del «por comprobar» de HU-03.1 no alcanzaba al escenario nuevo
   de la sesión cerrada en `aviso-inicio`. Ahora lo nombra.
4. **Mío, de esta ronda:** con una transacción por asignación, una organización que falla a mitad
   deja lo ya clasificado. Escrito qué pasa: no envía correo en esa llamada y la siguiente completa
   el resto sin duplicar.

## Lectura del nivel de lo nuevo

**No hay críticos nuevos.** El único marcado crítico (1) es una comprobación que ya estaba
declarada, con su salida, desde la ronda 5. **Pero sí hay errores nacidos de correcciones:** cinco
(3, 5, 12, 13 y 14) y uno en parte (10). Es la quinta ronda seguida en que pasa.

La diferencia con las rondas anteriores está en el nivel. Once de los dieciséis (1, 2, 3, 4, 6, 7,
9, 10, 12, 13 y 16) son de precisión o de cobertura de pruebas: textos que prometían más de lo que
garantizan o escenarios que faltaban. Dos son huecos de diseño que venían de antes (8 y 11), uno es
una interpretación de un criterio (5) y uno se descartó (15): 11 + 2 + 1 + 1 = 15. **Solo el 14
abría un camino real** (un aviso falso desde la credencial del sistema), y también nació de una
corrección: 15 + 1 = 16.

**Por la regla acordada para esta ronda, no se cierra con ella:** trae errores nacidos de
correcciones. Se corrigieron y toca cerrar con la siguiente, dentro de la fecha del plan (domingo
22/11/2026).

## Pendiente de aprobación

**1. Séptima ronda con dos corridas, y cierre con ella** (la regla acordada). Es la que recomiendo.
Opcional antes de lanzarla: adelantar las dos comprobaciones que hoy quedan para HU-03.1 y
HU-01.1 —que la base pueda consultar si la sesión sigue abierta, y leer el correo de la cuenta—.
Las dos corridas marcaron esos «por comprobar» como lo más grave. Se resuelven en la instancia local
del servicio y piden Docker abierto. Si salen bien, desaparecen de la especificación antes de
aprobarla.

**2. Las decisiones 25 a 29** (de la ronda 5, siguen pendientes):

25. El registro del aviso es una operación de la base que se llama con la sesión de la persona.
26. La regla de la base exige sesión abierta y dentro de `sesion_dias`.
27. Ninguna página se muestra dentro de un marco de otro sitio.
28. `usuario.correo` es el correo de la cuenta en el servicio, y la base lo comprueba.
29. El rol de supervisor no se quita mientras supervise una asignación que no ha terminado.

**3. Las decisiones nuevas de esta ronda, 30 a 35:**

30. **«La hora en que el sistema recibe el toque» (HU-06.CA-2) es el instante en que la operación
    ya tiene el candado.** Si la espera cruza la medianoche o el vencimiento, cuenta ese instante.
31. **La clasificación toma cada asignación en su propia transacción**, para que la espera del
    candado sea solo la de una asignación.
32. **La credencial del sistema no tiene permiso de insertar avisos**, y los datos de arranque no
    traen avisos: los avisos nacen usando la aplicación.
33. **«Ningún no reportado nuevo» (HU-07.CA-7) se lee como «ninguno sin notificar dentro del
    tope».**
34. **El correo al supervisor se envía solo como texto sin formato.** Es lo único de esta ronda que
    el usuario ve: el correo llega sin formato.
35. **El límite del plazo (decisión 11, D-84) se amplía:** a un intervalo se suman el retraso del
    disparador y el tiempo acumulado de la llamada hasta cada organización. Ninguno de los dos se
    acota; los dos quedan en el registro de la ejecución.

**4. Un riesgo propuesto:** si una cuenta cambia su correo en el propio servicio, `usuario.correo`
queda viejo y el reporte del supervisor iría a la dirección anterior. El sistema no ofrece cambiar
el correo. Si se acepta, va también a la lista de versiones futuras.

## Lo que se arrastra a los tickets v5 (colchón)

- H-4 comprueba el límite por IP del servicio gestionado (hallazgo 9).
- **El recorte v4 dice todavía, en HU-06.3, que «el aviso lo escribe en la base el sistema».**
  Quedó así desde antes de la decisión 25 de la ronda 5. No lo marcó el revisor; lo vi al verificar.
  Se corrige en los tickets v5, no en el v4, que es entregable.

## Verificación

Antes de corregir: 32 requisitos y 125 escenarios (contados con `grep`). Delta declarado: 0
requisitos y +6 escenarios:

- `acceso` +1: tabla en un esquema nuevo.
- `aviso-inicio` +4: el último día lo marca el cliente · la base no acepta la asignación de un
  compañero aunque el servidor la pida · la base no registra sin usuario activo y sesión vigente ·
  la credencial del sistema no inserta un aviso.
- `no-reportados` +1: el correo que falló sale aunque no haya nada nuevo.

Tres escenarios se reescribieron sin cambiar el conteo: «tabla sin sus casos de consulta directa»,
«plazo» y «textos con marcas de formato».

Conteo con `grep` después de corregir, y otra vez después del cruce: `acceso` 13 requisitos y 49
escenarios · `aviso-inicio` 10 y 40 · `no-reportados` 9 y 42. Suma: 13 + 10 + 9 = **32
requisitos**; 49 + 40 + 42 = **131 escenarios**. Coincide con el delta: 125 + 6 = 131.

Todas las correcciones se hicieron con la herramienta de edición. La especificación sigue sin
commit en el clon. El recorte v4 y el PRD v7 no cambian.
