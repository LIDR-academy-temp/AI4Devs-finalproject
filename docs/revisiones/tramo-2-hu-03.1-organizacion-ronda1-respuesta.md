# Respuesta a la ronda 1 — rama `tramo-2/hu-03.1-organizacion`

> Martes 24/11/2026. Responde a `tramo-2-hu-03.1-organizacion-ronda1-corrida1.md` (9 hallazgos) y
> `tramo-2-hu-03.1-organizacion-ronda1-corrida2.md` (11 hallazgos y 2 sospechas). Unidos quedan
> **13 hallazgos distintos y 2 sospechas**: 7 salieron en las dos corridas, 2 solo en la primera y
> 4 solo en la segunda. **Ninguno crítico.** Material enviado: el encargo, el diff de la rama frente a
> la rama de la entrega (hasta `dfb8530`), la especificación `acceso`, `CLAUDE.md`, la plantilla de
> migraciones y el recorte v4 de tickets. **Límite:** el registro de decisiones no entró; D-100 se
> le dio al revisor como decisión tomada.

## Resumen

| Cierre | Cuántos |
|---|---|
| Corregido (1 a 12) | 12 |
| Corregido con evidencia, con su límite declarado (13) | 1 |
| Sospechas: una comprobada sin cambio (S1) y una corregida (S2) | 2 |
| **Total** | **13 + 2 sospechas** |

## Hallazgo por hallazgo

| # | Hallazgo (corrida-número) | Cierre | Qué se hizo y por qué |
|---|---|---|---|
| 1 | La comprobación de estructura no vigila `TRIGGER` ni `REFERENCES`, aunque `CLAUDE.md` §5 dice que falla si están (c1-1, c2-1) | **Corregido** | Cierto: `CLAUDE.md` prometía más de lo que el código hacía. Motivo nuevo `rol-de-personas-con-trigger-o-references`; el límite que lo excluía sale de la cabecera. Casos N24 (`TRIGGER` a `authenticated`) y N25 (`REFERENCES` a `anon`) |
| 2 | Una migración nueva puede entrar sin su validación y la integración continua queda en verde (c1-2, c2-3) | **Corregido** | `correr-validaciones.py` compara, antes de correr nada, los nombres de `supabase/migrations/` con los de `supabase/validaciones/`: falla con una migración sin validación y con una validación sin migración. Casos P3, N6 y N7 de la prueba nueva `tests/base/prueba-scripts-base.py`, que la integración continua corre primero |
| 3 | Nada prueba que `es_mi_organizacion` responda siempre «no»: sin regla permisiva la base ya niega todo, así que las pruebas pasarían aunque respondiera «sí» (c1-3, c2-2) | **Corregido** | El hallazgo más serio de la ronda, y es cierto. Ahora se prueba la función directamente, con sesión (N28) y sin ella (N29). Además, con una regla permisiva que deja todo, la restrictiva no deja ver (N30) ni crear (N31). P5 es el control: sin la restrictiva, el mismo camino sí ve filas, así que el cero de N30 lo pone la regla y no la preparación. **Comprobado rompiéndolo:** con la función cambiada a «sí» en la base local, fallan N28 a N31; restaurada, pasan |
| 4 | La nota de la especificación dice que H-4 repite la prueba de `sesion_abierta()` en el servicio gestionado, y el ticket H-4 no lo pide (c1-4) | **Corregido** | Cierto: la nota afirmaba algo que ningún ticket obliga. La nota ahora dice que H-4 (recorte v4) no lo pide y que se agrega a su criterio con los tickets v5 (D-99), que ya tienen que estar antes del tramo 8. Queda anotado en el seguimiento diario como contenido de los tickets v5 |
| 5 | La prueba de la validación no tiene un desvío para cada fila, ni comprueba que estén las 20 (c1-5, c2-7) | **Corregido** | La prueba exige exactamente las 20 filas: una fila que desaparece hace fallar todos los casos. 14 desvíos nuevos (N15 a N28), de modo que cada una de las 20 filas tiene al menos el suyo, incluidos la tabla que falta, la llave primaria sobre otra columna, las reglas sin activar, la regla solo para leer o solo para un rol, `USING` y `WITH CHECK` cambiados por separado, y `TRIGGER` y `REFERENCES`. Pasan con la validación tal como estaba: lo que faltaba era la prueba, no la validación |
| 6 | Ninguna prueba protege la condición de que la sesión sea de la misma cuenta (c1-6, c2-5) | **Corregido** | Una segunda cuenta con su sesión abierta. Por SQL, con lo que dice el pase: P4 (control: el mismo camino responde «sí»), N23 (sesión abierta de otra cuenta), N24 (sin identificador de sesión), N25 (pase que dice otro rol) y N26 (sin sesión, rol `anon`: no puede preguntar). **Comprobado rompiéndolo:** sin la condición de la cuenta, falla N23. N25 hizo ver que la función no miraba el rol del pase: ahora exige `authenticated` (ver S2) |
| 7 | `CLAUDE.md` §5 dice que toda tabla lleva `organizacion_id`, y `organizacion` no lo lleva (c1-7) | **Corregido** | La regla nombra la excepción que ya pedía la especificación: `organizacion` no lleva `organizacion_id` y su regla compara su `id` |
| 8 | La comprobación da verde aunque haya recorrido cero tablas (c1-8, c2-6) | **Corregido** | El RESUMEN trae los números en campos separados, y `analizar()` rechaza cero tablas: desde este tramo existe `organizacion`, así que cero quiere decir que no miró donde debía. Caso N2 de `prueba-scripts-base.py` |
| 9 | Si falta un fichero SQL, el script termina con un error de Python, no con un mensaje propio (c1-9, c2-11) | **Corregido** | `leer_sql()` en `scripts/base/base_local.py`, con mensaje propio si el fichero falta o no se puede leer; lo usan los dos scripts. La prueba de acceso captura también que `supabase status` no responda a tiempo. Casos P4 y N8 de `prueba-scripts-base.py` |
| 10 | Un nombre con tabulador parte la fila FALLA y el script la ignora (c2-4) | **Corregido** | En las dos puntas. La comprobación escribe «?» en lugar de un tabulador o un salto de línea en el nombre, y `analizar()` es estricta: toda línea tiene que ser FALLA o RESUMEN con sus 5 campos; cualquier otra cosa es un error, no se ignora. Casos N28 de la prueba de estructura (tabla real con tabulador en el nombre) y N3 y N4 de `prueba-scripts-base.py`. La prueba de estructura lee ahora su salida con ese mismo `analizar()`: lo que se prueba es lo que la integración continua acepta |
| 11 | Hay ramas de la comprobación sin caso: tabla foránea y superusuario (c2-8) | **Corregido** | N26 (tabla foránea, aunque tenga `organizacion_id`) y N27 (`anon` superusuario), fabricados con el superusuario de la base local, como N18 y N19 |
| 12 | La cabecera de la especificación sigue contando HU-03.1 entre las comprobaciones pendientes (c2-9) | **Corregido** | La cabecera dice ahora tres pendientes y que la de HU-03.1 quedó comprobada el 23/11/2026. Es una nota de estado: no cambia ningún requisito ni escenario. La revisa la Dirección con este pull request |
| 13 | No está confirmado que la herramienta aplique cada migración en una sola transacción (c2-10) | **Corregido con evidencia** | Se probó el 24/11/2026 en la base local, con una migración aparte en una copia desechable del proyecto: su primer bloque crea una tabla y el segundo falla a propósito. `supabase migration up` (2.109.1) la rechazó, no dejó la tabla ni la registró. Queda escrito en los límites de la plantilla. **Límite:** se probó con `migration up`; que `start` y `db reset` apliquen igual se supone, no se probó |
| S1 | Falta `supabase/seed.sql`, que la configuración nombra (c2, sospecha) | **Comprobada, sin cambio** | `supabase db reset` lo informa con un aviso (`no files matched pattern`) y sigue; las migraciones se aplican enteras. El fichero llega con H-3, que ya está en `[previstas]` de `scripts/referencias.txt`. La integración continua lo confirma con `supabase start` en una base nueva |
| S2 | `sesion_abierta()` trata como abierta toda sesión que tenga su fila, aunque el servicio le haya fijado un fin ya pasado (c2, sospecha) | **Corregido** | Cierto en lo posible: `auth.sessions` tiene `not_after`. La función exige ahora que no haya pasado (`not_after` nulo o futuro) y que el pase sea de rol `authenticated`. Es lo que la especificación ya llama «que el servicio la tenga abierta»; la condición de `sesion_dias` llega con HU-01.1 en el tramo 3. Caso N27, que fallaba con la función anterior |

## Cruce de las correcciones contra las reglas que tocan

- **Pruebas antes del código (`CLAUDE.md` §4):** las pruebas nuevas van en un commit propio, antes que las correcciones. Contra el código anterior fallaban N25 y N27 de la prueba de acceso y las dos pruebas que usan `analizar()` y `leer_sql()`, que todavía no existían. Los desvíos nuevos de la validación pasaban, porque la validación ya los detectaba: lo que faltaba era la prueba.
- **Comprobar el tratamiento, no solo el resultado:** el cero de N30 tiene su control (P5), y el «sí» de P4 es el control de N23 a N27. Las dos funciones se rompieron a propósito en la base local para ver fallar las pruebas nuevas; la base se rehízo después con `supabase db reset`.
- **Mensajes propios:** los caminos de error nuevos (fichero que falta, salida mal formada, cero tablas, migración sin validación) llevan nuestro texto. El aviso del seed es de la herramienta y no es un error.
- **Migración controlada:** `sesion_abierta()` sigue en su bloque recreable, con su confirmación; la validación (fila 16) no cambia, porque no compara el cuerpo.
- **Documentación al día (D-91):** el README (tabla de pruebas y orden de la integración continua), `CLAUDE.md` §5, la especificación (cabecera y nota), la plantilla (límite de la transacción), la cabecera de la validación y `prompts.md` dicen lo mismo que el código.
- **Datos que no salen (D-95):** las cabeceras de los dos informes van con `<espacio-temporal>` y con las rutas relativas al repositorio. Las cuentas de prueba usan `example.com`.
- **Lo que cambia de comportamiento:** `sesion_abierta()` ahora exige además el rol del pase y que la sesión no haya pasado su fin. La Dirección lo revisa con este pull request.
