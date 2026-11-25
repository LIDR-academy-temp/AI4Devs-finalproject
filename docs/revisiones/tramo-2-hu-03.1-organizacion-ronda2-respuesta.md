# Respuesta a la ronda 2 — rama `tramo-2/hu-03.1-organizacion`

> Martes 24/11/2026. Responde a `tramo-2-hu-03.1-organizacion-ronda2-corrida1.md` (8 hallazgos) y
> `tramo-2-hu-03.1-organizacion-ronda2-corrida2.md` (7 hallazgos). Unidos quedan **10 hallazgos
> distintos**: 5 salieron en las dos corridas, 3 solo en la primera y 2 solo en la segunda.
> **Ninguno crítico.** Siete nacen de correcciones de la ronda 1 (1, 3, 4, 5, 6, 7 y 10); dos dicen
> que una corrección no alcanzó (2 y 9); uno ya estaba en la especificación (8). Material enviado:
> el encargo de la ronda 2, el diff de las correcciones (`dfb8530` a `b6fc858`), con la respuesta de
> la ronda 1, y los ficheros completos de la comprobación, su script, la migración, la prueba de
> acceso, la especificación `acceso` y `CLAUDE.md`.

## Resumen

| Cierre | Cuántos |
|---|---|
| Corregido (1 a 10; el 9, con la decisión D-101 de la Dirección) | 10 |
| **Total** | **10** |

## Hallazgo por hallazgo

| # | Hallazgo (corrida-número) | Cierre | Qué se hizo y por qué |
|---|---|---|---|
| 1 | Un rol de las personas puede ser miembro de otro rol que omite las reglas, y la comprobación no lo ve (c1-1) | **Corregido** | Cierto: solo se miraban los atributos de `anon` y `authenticated`. Ahora se recorre todo rol del que sean miembros, directo o en cadena (`pg_has_role(…, 'MEMBER')`, que incluye al rol mismo). La explicación nombra el rol puente y pasa por el mismo «?» que el nombre del objeto. Caso N29 de la prueba de estructura (`prueba_puente` con `BYPASSRLS`, concedido a `authenticated`), que fallaba con el código anterior |
| 2 | La atomicidad sigue sin probarse con `start` y `db reset`, que son los que aplican las migraciones (c1-2, c2-3) | **Corregido con evidencia** | Probado el 24/11/2026 con la misma migración que falla en su segundo bloque. **`db reset`:** no quedó la tabla del primer bloque ni la migración registrada. **`start` sobre una base nueva, el camino de la integración continua:** la herramienta detiene todo y borra la base y su volumen; no queda base, ni entera ni a medias, y el paso termina en rojo. La plantilla lo dice así, sin el «se supone» anterior |
| 3 | Falta el caso positivo de `not_after`: un fin fijado en el futuro (c1-3) | **Corregido** | Caso P6: con `not_after` una hora en el futuro, la función responde sí. N27 sigue siendo el negativo, con el fin ya pasado |
| 4 | «Siempre no» solo se probó con identificadores existentes; una función que dijera sí a un valor especial pasaría (c1-4) | **Corregido** | Casos N33 (identificador de ceros), N34 (nulo) y N35 (con una regla permisiva, crear una fila eligiendo el identificador de ceros se rechaza). Además, N36 compara el cuerpo, sin comentarios, con `SELECT false;`: es lo que D-100 pide hasta el tramo 3, y HU-01.1 cambia el caso junto con la función. **Comprobado rompiéndolo:** con la función que dice sí solo al identificador de ceros, fallan N33, N35 y N36; restaurada, pasan |
| 5 | Las piezas nuevas se prueban sueltas, no dentro de los scripts que deciden (c1-5, c2-6) | **Corregido** | Seis casos nuevos en `prueba-scripts-base.py` corren el `main()` de cada script, cambiándole de dónde lee y qué le responde la base: `correr-validaciones` sin argumentos falla con una migración sin validación (N9) y con una validación sin migración (N10); `comprobar-estructura` aprueba una salida sin fallas (P5) y no aprueba cero tablas (N11) ni una falla partida (N12), e informa con mensaje propio si falta su SQL (N13) |
| 6 | «Exactamente 20 filas» no ve una fila repetida, porque los nombres se guardan en un diccionario (c1-6, c2-7) | **Corregido** | La prueba guarda cada fila tal como vino, en orden y con repeticiones, y exige 20 filas con los 20 nombres. Control N29 de la prueba de validación: una validación cambiada para repetir una fila da 21 filas con 20 nombres, y la cuenta lo ve |
| 7 | La especificación sigue diciendo «Por comprobar» junto a «Comprobado», y fecha el 23/11 casos del 24/11 (c1-7, c2-4) | **Corregido** | El rótulo dice ahora «Por comprobar al construir HU-03.1 (ya comprobado: ver la nota que sigue a este párrafo)». La nota separa lo comprobado el 23/11 (P1, N1 y P2) de lo ampliado el 24/11 tras la revisión. El texto aprobado del requisito no cambió |
| 8 | La especificación dice que la comprobación prueba que la regla existe, no que esté bien escrita, y el código sí compara cómo está escrita (c1-8, c2-5) | **Corregido** | El límite declarado dice ahora lo exacto: la comprobación prueba que la regla existe y que está escrita como se pide (restrictiva, para toda orden y todo rol, con la función de organización al leer y al escribir), no que se comporte bien; eso lo prueban los escenarios con dos organizaciones. Es una precisión del límite, no un cambio de requisito; la revisa la Dirección con este pull request |
| 9 | Que H-4 repita los casos de `sesion_abierta()` en el servicio gestionado sigue sin ser exigible: D-99 pide que existan los tickets v5, no qué contienen (c2-1) | **Corregido (D-101)** | Cierto. Se propuso a la Dirección, que lo aprobó el 24/11/2026 como D-101: la puerta del tramo 8 en `CLAUDE.md` §6 no deja abrir ese pull request si el H-4 de los tickets v5 no pide repetir contra el servicio gestionado los casos de `sesion_abierta()` (P1, N1, P2, P4, P6, N23 a N27 y N32). Igual que D-99, es una puerta de la Dirección: la integración continua no la comprueba |
| 10 | `sesion_abierta()` compara `not_after` con la hora de inicio de la transacción, no con la del reloj (c2-2) | **Corregido** | Cierto: `now()` se queda fijo en el inicio de la transacción. Ahora es `clock_timestamp()`. Caso N32: el fin se fija un segundo adelante, la consulta espera un segundo y medio dentro de la misma transacción, y la función responde no; con `now()` respondía sí |

## Un error propio, y su control

Al probar `start`, el agente corrió `levantar-base.sh` desde otra carpeta, y la herramienta levantó
un proyecto vacío con el nombre de esa carpeta. Se detuvo sin consecuencias, pero mostró un defecto
real: el script dependía de la carpeta desde donde se llama. Ahora corre siempre desde la raíz del
repositorio, comprueba que está `supabase/config.toml` y, si no, lo dice con mensaje propio. Se
probó llamándolo desde otra carpeta, con la base ya arriba: no aparece ningún otro proyecto.

## Cruce de las correcciones contra las reglas que tocan

- **Pruebas antes del código (`CLAUDE.md` §4):** las pruebas nuevas van en su commit, antes que las
  correcciones. Contra el código anterior fallaban N29 de la prueba de estructura y N32 de la de
  acceso. Los demás casos nuevos pasaban, porque protegen lo que ya estaba: la conexión de los
  scripts (N9 a N13, P5), el cuerpo de la función (N33 a N36) y la cuenta de filas.
- **Comprobar el tratamiento:** la función se rompió a propósito con el valor especial y las pruebas
  lo vieron; la base se rehízo con `supabase db reset`. P6 es el control de N27 y N32, y el control
  N29 de la validación prueba la propia cuenta de la prueba.
- **Migración controlada:** `sesion_abierta()` sigue en su bloque recreable; el cambio a la hora
  del reloj no cambia su volatilidad declarada (fila 16 de la validación).
- **Documentación al día (D-91):** el README (tabla de pruebas), la especificación (rótulo, nota y
  límite), la plantilla (atomicidad), la cabecera de la validación y `prompts.md`.
- **Datos que no salen (D-95):** las cabeceras de los dos informes van con `<espacio-temporal>` y
  con las rutas relativas al repositorio.
- **Lo que cambia de comportamiento:** `sesion_abierta()` compara con la hora del reloj; un rol de
  las personas que pueda asumir otro con `BYPASSRLS` o superusuario hace fallar la comprobación.
  La Dirección lo revisa con este pull request.
