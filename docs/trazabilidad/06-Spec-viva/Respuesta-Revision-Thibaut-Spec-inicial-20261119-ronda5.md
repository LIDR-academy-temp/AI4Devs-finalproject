# Respuesta a la quinta ronda de revisión — especificación inicial (H-1)

> Jueves 19/11/2026. Dos corridas sobre el mismo material, lanzadas a la vez:
> `Revision-Thibaut-Spec-inicial-20261119-ronda5-corrida1.md` (11 hallazgos) y `-corrida2.md`
> (10 hallazgos). Material: las tres especificaciones con las correcciones de la ronda 4, el
> recorte v4, la prueba local de HU-01.6 y el backlog v5. Las corridas se lanzaron **antes** de
> que la Dirección aprobara D-84 (las 21 decisiones) y D-85 (los dos riesgos).

## Unión de las dos corridas

Contados uno a uno: **18 hallazgos distintos.** Tres salieron en las dos corridas, ocho solo en la
primera y siete solo en la segunda: 3 + 8 + 7 = 18. Comprobación: la primera tiene 3 + 8 = 11 y la
segunda 3 + 7 = 10. **Tres son críticos.**

| # | Sev. | Hallazgo | C1 | C2 | Respuesta | Dónde |
|---|---|---|---|---|---|---|
| 1 | Crítico | El aviso lo escribía la credencial del sistema, que se salta las reglas de la base: en la única escritura de una persona, la separación por organización dependía solo del código | — | 1 | **Corregido.** El registro es una operación de la base que se llama **con la sesión de la persona**, deduce de ella el consultor y la organización, y exige usuario activo y sesión vigente. Escenario nuevo: la base no acepta una asignación de otra organización aunque el servidor la pida | `aviso-inicio`, «Registrar el aviso» · `acceso`, «Reglas por rol en la base» |
| 2 | Crítico | Una llamada larga hace que las siguientes salten la organización, y la detección pasa de un intervalo | 1 | — | **Límite declarado, ya aprobado (decisión 11, D-84), ahora precisado:** el plazo vale mientras procesar cada organización tarde menos que su intervalo. Se suma que la respuesta y el registro anotan cada organización saltada | `no-reportados`, «Ejecución recurrente» |
| 3 | Crítico | Un pase de una sesión cerrada o vencida podía seguir consultando la base directamente | 2 | — | **Corregido en el diseño, con una comprobación pendiente.** La regla de la base exige también sesión abierta en el servicio y dentro de `sesion_dias`. Que el pase trae el identificador de su sesión y el momento de entrada está comprobado; que la base pueda consultar si la sesión sigue abierta, no: queda «por comprobar» en HU-03.1, con su salida si no se puede. Escenario nuevo | `acceso`, «Separación por organización en la base» |
| 4 | Alto | El reporte puede tardar en existir más allá del plazo, aunque `detectado_en` lo cumpla | 3 | — | **El mismo límite del 2**, ahora dicho completo: dentro de él, la fila aparece segundos después | `no-reportados`, «Ejecución recurrente» |
| 5 | Alto | Se podía quitar el rol a quien supervisa una asignación que todavía no empieza | 4 | 5 | **Corregido.** Vale para toda asignación que no ha terminado, vigente o futura. El escenario cubre los dos casos | `aviso-inicio`, Datos y «La asignación es coherente en la base» |
| 6 | Alto | Los dos disparadores del rol no se coordinaban entre sí | 5 | — | **Corregido.** Los dos toman primero un candado sobre la fila del supervisor | `aviso-inicio`, Datos |
| 7 | Alto | Si el sistema cae entre la confirmación del correo y la marca, el correo se repite | 6 | — | **Corregido el texto.** Es el mismo caso que D-82 (se prefiere el correo repetido); ahora lo dice. El escenario de la llamada repetida exige que la marca ya esté guardada | `no-reportados`, «Correo agrupado» y «Protección de la ejecución recurrente» |
| 8 | Alto | El aviso fijaba su hora antes de tomar el candado: podía quedar puntual junto a un no reportado | — | 2 | **Corregido.** El aviso toma el candado y después su instante. Así solo caben los dos resultados que admite HU-07.CA-20. Era un efecto de la corrección de la ronda 4 | `aviso-inicio`, «Registrar el aviso» y Datos |
| 9 | Alto | «Un solo instante» contradecía que el aviso se compruebe al tomar el candado | 7 | — | **Corregido.** La condición 3 queda escrita como la excepción al instante único: si el aviso llegó mientras la llamada procesaba, gana. También era efecto de la ronda 4 | `no-reportados`, «Clasificación de no reportados» |
| 10 | Alto | Otro sitio podía mostrar la aplicación dentro de un marco e inducir el toque | 8 | 4 | **Corregido.** Ninguna página del sistema se deja mostrar dentro de un marco de otro sitio. Escenario nuevo | `acceso`, «Peticiones que vienen de otro sitio» |
| 11 | Alto | La matriz de permisos que se afirma no venía en el material | 9 | — | **Descartado.** La matriz es una batería de pruebas que nace en HU-02.4, no un documento de la especificación. Lo que exige la especificación ya está escrito: el escenario «tabla sin sus casos de consulta directa» hace fallar la batería si falta alguno | — |
| 12 | Medio | La batería no tenía de dónde sacar la lista de operaciones | — | 10 | **Corregido.** La lista sale del único lugar donde se autoriza; una operación que no pasa por ahí ya es un defecto | `acceso`, «Matriz de permisos» |
| 13 | Medio | La fecha del correo contradecía HU-07.CA-17 | 10 | — | **Corregido el texto.** Es una excepción a HU-07.CA-17 aprobada por la Dirección en D-84, después de lanzar la corrida; ahora la especificación la cita | `no-reportados`, «Contenido mínimo del correo» |
| 14 | Medio | El cambio de hora seguía sin decisión aprobada | 11 | 8 | **Descartado: ya resuelto.** Riesgo aceptado en D-85, aprobado después de lanzar las corridas | — |
| 15 | Medio | El campo del pase no documentado seguía sin decisión aprobada | — | 7 | **Descartado: ya resuelto.** Riesgo aceptado en D-85 | — |
| 16 | Alto | La recuperación «en la primera ejecución» chocaba con el filtro por intervalo | — | 3 | **Corregido.** Es la primera ejecución que procesa esa organización | `no-reportados`, «Recuperación tras una caída» |
| 17 | Alto | Nada garantizaba que `usuario.correo` sea el correo con el que la cuenta entra | — | 6 | **Corregido, con una comprobación pendiente.** La base rechaza un correo distinto del de la cuenta; que pueda leerlo queda «por comprobar» en HU-01.1, con su salida. Escenario nuevo | `acceso`, «Un correo, una cuenta, una organización» |
| 18 | Medio | La prueba de los 5 segundos no decía desde dónde se mide | — | 9 | **Corregido en la especificación:** desde abrir la aplicación hasta ver la confirmación. El recorte v4 lo dice de forma más corta; se ajusta en los tickets v5 | `aviso-inicio`, «Pantalla del consultor» |

**Cierre de la ronda:** 13 corregidos, 2 dentro de un límite declarado ya aprobado y 3
descartados: 13 + 2 + 3 = 18.

La sospecha de la corrida 1 sobre lecturas desde otros sitios (CORS) no es un hallazgo: el revisor
no tiene evidencia de que el despliegue lo habilite. Queda anotada para H-4.

## Control aplicado antes de responder

Por primera vez crucé cada corrección contra las reglas que toca antes de dar la ronda por
respondida, que es el control que propuse tras la ronda 4. Encontró un hueco: la operación de
registro, que tiene permiso para insertar, no exigía usuario activo ni sesión vigente, así que se
habría saltado la regla del crítico 3. Corregido en `aviso-inicio`, «Registrar el aviso», paso 1.

## Lectura del nivel de lo nuevo

**No es para cerrar todavía.** Hay tres críticos, y dos son defectos reales de diseño:

- El 1 viene de la decisión de la ronda 1 de que el aviso lo escriba el sistema.
- El 3 estaba desde el primer borrador.

Ninguno lo creó una corrección. Los críticos que salen ahora son más hondos y más valiosos: el 3
es un agujero de seguridad de verdad. Al mismo tiempo, cuatro hallazgos (5, 6, 8 y 9) sí vienen de
correcciones de rondas anteriores. Es el patrón que llevo cuatro rondas repitiendo, y el control
del cruce es la respuesta a eso.

**Opciones para la Dirección:**

- **A. Sexta ronda ahora, con dos corridas.** Si no trae críticos, se cierra hoy. Si los trae, se
  corrigen y se cierra con la ronda siguiente, dentro de la fecha del plan (domingo 22/11). **Es
  la que recomiendo:** en esta ronda aparecieron agujeros de seguridad reales, así que el revisor
  todavía rinde.
- B. Cerrar hoy sin sexta ronda. Las correcciones de esta ronda quedarían para la ronda de cada
  tramo (D-74) y para los cuatro tickets que se revisan uno por uno, que son justo los de la base.
  Es más rápido, pero deja sin revisar las correcciones de dos críticos.
- C. Sexta ronda sin compromiso de fecha.

## Decisiones tomadas en la especificación que la Dirección debe ver

Cinco nuevas, todas de esta ronda:

25. **El registro del aviso es una operación de la base que se llama con la sesión de la
    persona**, deduce de ella quién es y exige usuario activo y sesión vigente. Sustituye a «lo
    escribe la credencial del sistema».
26. **La regla de la base exige sesión abierta y dentro de `sesion_dias`**, no solo usuario activo.
27. **Ninguna página se muestra dentro de un marco de otro sitio.**
28. **`usuario.correo` es el correo de la cuenta en el servicio**, y la base lo comprueba.
29. **El rol de supervisor no se quita mientras supervise una asignación que no ha terminado**,
    vigente o futura (amplía la 19).

## Verificación

Antes de corregir: 32 requisitos y 121 escenarios. Delta declarado: 0 requisitos y +4 escenarios
(`acceso` +3: pase de una sesión cerrada o vencida, la pantalla dentro de un marco de otro sitio,
el correo no es el de la cuenta · `aviso-inicio` +1: la base no acepta una asignación ajena aunque
el servidor la pida). Dos escenarios se reescribieron sin cambiar el conteo: «quitar el rol a quien
supervisa» y «llamada repetida».

Conteo con `grep` después de corregir: `acceso` 13 requisitos y 48 escenarios · `aviso-inicio` 10
y 36 · `no-reportados` 9 y 41. Suma: 13 + 10 + 9 = **32 requisitos**; 48 + 36 + 41 = **125
escenarios**. Coincide con el delta: 121 + 4 = 125.

El recorte v4 no cambia. El PRD v7 tampoco: estas decisiones son de diseño, no de producto.
