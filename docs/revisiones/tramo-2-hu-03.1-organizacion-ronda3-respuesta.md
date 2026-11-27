# Respuesta a la ronda 3 — rama `tramo-2/hu-03.1-organizacion`

> Martes 24/11/2026. Responde a `tramo-2-hu-03.1-organizacion-ronda3-corrida1.md` (7 hallazgos) y
> `tramo-2-hu-03.1-organizacion-ronda3-corrida2.md` (5 hallazgos y 2 sospechas). Unidos quedan
> **8 hallazgos distintos**: 4 salieron en las dos corridas, 3 solo en la primera y 1 solo en la
> segunda; las dos sospechas de la segunda coinciden con hallazgos de la primera (6 y 7).
> **Ninguno crítico.** Los ocho nacen de correcciones de la ronda 2. Material enviado: el encargo
> de la ronda 3, el diff de `b6fc858` a `d256052` (pruebas y correcciones de la ronda 2, y D-101),
> con los informes y la respuesta de la ronda 2, y los ficheros completos de la comprobación, la
> migración, las tres pruebas con base, la plantilla y `CLAUDE.md`.

## Resumen

| Cierre | Cuántos |
|---|---|
| Corregido (2 a 8) | 7 |
| Corregido con riesgo aceptado por la Dirección (1, D-102) | 1 |
| **Total** | **8** |

## Hallazgo por hallazgo

| # | Hallazgo (corrida-número) | Cierre | Qué se hizo y por qué |
|---|---|---|---|
| 1 | `sesion_abierta()` usa la hora del reloj pero está declarada `STABLE`, y N32 no cruza el fin dentro de una misma consulta (c1-1, c2-1) | **Corregido · riesgo aceptado (D-102)** | Cierto, y nace de la corrección del hallazgo 10 de la ronda 2. La Dirección eligió entre tres opciones: la hora del inicio de cada consulta (`statement_timestamp()`), que es la que una función `STABLE` puede usar (comprobado en `pg_proc`: `statement_timestamp` y `now` son `s`, `clock_timestamp` es `v`). Se descartó declararla `VOLATILE` (fila por fila, y la forma habitual de acelerarla en la regla la vuelve a evaluar una vez por consulta) y volver a `now()` (estira la sesión a toda la transacción). Queda aceptado, y escrito en la especificación, que una consulta que empezó antes del fin conserva su respuesta hasta terminar; lo acotan la consulta siguiente y el tiempo máximo de 8 segundos que la base local trae para el rol de la API. Caso P7 (una sola consulta cruza el fin y responde sí), que fallaba con la hora del reloj; N32 dice ahora lo que prueba: dos consultas en la misma transacción |
| 2 | El control N29 de la validación solo comprueba que salen 21 filas, no que la prueba las rechace (c1-5, c2-2) | **Corregido** | La decisión de la prueba es una sola función, `decidir()`, que usan los casos y el control. N29 pasa por ella la validación con una fila repetida y exige el rechazo. **Comprobado rompiéndolo:** quitando la cuenta de filas de `decidir()`, N29 falla |
| 3 | N34 acepta un nulo, y una función `STRICT` conservaría el cuerpo `SELECT false;` (c1-4, c2-3) | **Corregido** | N34 exige exactamente «no». **Comprobado rompiéndolo:** con la función marcada `STRICT`, N34 falla con «nulo»; restaurada, pasa |
| 4 | La pertenencia «en cadena» solo se probó con un salto (c2-4) | **Corregido** | Caso N30: `authenticated` → `prueba_medio` → `prueba_final` con `BYPASSRLS`. La falla debe nombrar `prueba_final`, el rol del final; la prueba ahora puede exigir un texto de la explicación |
| 5 | La especificación sigue con el rótulo «Por comprobar» junto a «ya comprobado» (c1-6, c2-5) | **Corregido** | El rótulo dice ahora «Comprobado al construir HU-03.1 (23/11/2026; el resultado, en la nota que sigue a este párrafo). Antes de construirlo quedaba por comprobar:», y el texto que sigue queda como el antecedente que es. No cambia ningún requisito |
| 6 | `pg_has_role(…, 'MEMBER')` no es lo mismo que poder asumir el rol con `SET ROLE` (c1-3; sospecha en c2) | **Corregido** | Cierto: `BYPASSRLS` y superusuario no se heredan, solo valen asumiendo el rol. La comprobación pregunta ahora `'SET'`. Comprobado en la base local (PostgreSQL 17.6), dentro de una transacción deshecha: una pertenencia `WITH SET FALSE` da `MEMBER` cierto y `SET` falso, y la cadena de dos saltos da `SET` cierto. Caso P5 de la prueba de estructura (pertenencia sin `SET` no es falla), que fallaba con `'MEMBER'` |
| 7 | La plantilla generaliza lo visto con `start` y lo presenta como atomicidad (c1-2; sospecha en c2) | **Corregido** | La plantilla dice ahora que la atomicidad quedó confirmada solo para `migration up` y `db reset`; que `start` sobre una base **nueva** borra la base, lo que no es atomicidad sino que no queda base que usar; que `start` sobre una base existente no se probó; y que la prueba fue manual y su salida no se guardó |
| 8 | N36 dice que quita los comentarios pero solo quita las líneas que son comentario completo (c1-7) | **Corregido** | N36 quita también los comentarios al final de una sentencia y los de bloque, y normaliza los espacios. Su control P8, sin base, comprueba el normalizador con los tres tipos de comentario |

## Cruce de las correcciones contra las reglas que tocan

- **Pruebas antes del código (`CLAUDE.md` §4):** las pruebas van en su commit (`19fd70f`), antes que
  las correcciones. Contra el código anterior fallaban P5 de la prueba de estructura y P7 de la de
  acceso. Los demás casos nuevos protegen lo que ya estaba y se comprobaron rompiéndolo (N29, N34).
- **Un positivo y un negativo por pieza:** la pertenencia tiene N29/N30 (falla) y P5 (no falla); la
  hora, N27/N32 (no) y P6/P7 (sí); el normalizador de N36, su control P8.
- **Migración controlada:** `sesion_abierta()` sigue en su bloque recreable y sigue `STABLE`, que
  es lo que comprueba la fila 16 de la validación; ahora la declaración coincide con lo que la
  función hace.
- **Riesgo aceptado → versiones futuras:** D-102 está en el registro de decisiones y en la tabla de
  riesgos aceptados de la especificación `acceso`, con lo que lo cubre mientras tanto y su entrada
  en las características a considerar en versiones futuras (D-48).
- **Documentación al día (D-91):** la especificación (rótulo, nota y riesgo), la plantilla, el
  README (tabla de pruebas: 35 y 39 casos) y `prompts.md`.
- **Datos que no salen (D-95):** las cabeceras de los dos informes van con `<espacio-temporal>` y
  con las rutas relativas al repositorio.
- **Lo que cambia de comportamiento:** `sesion_abierta()` mira la hora del inicio de cada consulta;
  la comprobación de estructura ya no marca una pertenencia que no deja asumir el rol. La Dirección
  lo revisa con este pull request.
