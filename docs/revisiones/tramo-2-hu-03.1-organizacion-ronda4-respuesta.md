# Respuesta a la ronda 4 — rama `tramo-2/hu-03.1-organizacion`

> Martes 24/11/2026. Responde a `tramo-2-hu-03.1-organizacion-ronda4.md`: una corrida, corta, solo
> sobre las correcciones de la ronda 3 (diff de `d256052` a `705f95b`). **6 hallazgos, todos MEDIO,
> ninguno alto ni crítico**, y una sospecha. Todos nacen de correcciones de la ronda 3. Cuatro son
> texto que quedó atrás o que decía más de lo hecho (1, 5, 6 y, en parte, 4). La Dirección decidió
> corregirlos y **cerrar la revisión sin ronda 5**: lo nuevo bajó de nivel y es de redacción.

## Resumen

| Cierre | Cuántos |
|---|---|
| Corregido (1, 2, 3, 5 y 6) | 5 |
| Límite declarado (4) | 1 |
| **Total** | **6** |
| Sospecha: cerrada como límite ya declarado | 1 |

## Hallazgo por hallazgo

| # | Hallazgo | Cierre | Qué se hizo y prueba |
|---|---|---|---|
| 1 | `prompts.md` todavía dice, en la ronda 2, que `start` probó la atomicidad | **Corregido** | La entrada de la ronda 2 es un registro y no se reescribe; la de la ronda 3 anota ahora que aquello era de más: `start` sobre una base nueva borra la base, y la atomicidad quedó confirmada solo con `migration up` y `db reset` |
| 2 | La cota de 8 segundos de D-102 no tiene comprobación ejecutable | **Corregido** | Casos P9 (uno por rol, `authenticator` y `authenticated`): leen `statement_timeout` del rol y fallan si falta, es cero o pasa de 8 segundos. Control N37 de la lectura. **Comprobado rompiéndolo:** con `authenticated` a 30 segundos, P9 falla; restaurado a 8, pasa. La tabla de riesgos de la especificación cita P9 |
| 3 | P7 depende de que la consulta empiece menos de un segundo después de fijar el fin | **Corregido** | El fin se fija 3 segundos adelante y la consulta espera 4: la consulta tiene 3 segundos para empezar, y aun así cruza el fin |
| 4 | El normalizador de N36 no entiende comentarios de bloque anidados | **Límite declarado** | Cierto. Con un comentario anidado, N36 daría un rojo falso, el lado seguro: nunca deja pasar un cuerpo distinto de `SELECT false;`. Un analizador para un caso que hoy no existe no compensa; HU-01.1 (tramo 3) cambia el cuerpo y este caso. El límite queda escrito junto al normalizador |
| 5 | La descripción al inicio de la prueba de acceso todavía dice «Por comprobar» | **Corregido** | Dice ahora que ya está comprobado, con el rótulo vigente de la especificación, y menciona D-102 |
| 6 | La respuesta de la ronda 3 llama a P8 un control «sin base», y corre dentro de una prueba que la necesita | **Corregido** | Cierto: P8 no consulta la base, pero no corre sin ella. El comentario del código lo dice así. La respuesta de la ronda 3 es un registro y no se reescribe: queda corregida aquí |

**Sospecha (la evidencia de atomicidad de `migration up` y `db reset` es una prueba manual cuya
salida no se guardó):** la plantilla ya lo declara así desde la ronda 3, y pide repetir la prueba
al cambiar de versión de la herramienta. Se cierra como límite ya declarado.

## El control nuevo, aplicado por primera vez

La Dirección aprobó el 24/11/2026 un control para el agente antes de responder cada ronda: cruce de
cada corrección contra las reglas que toca, búsqueda del texto viejo en todo el repositorio, y cada
«corregido» con su commit o caso. Aplicado a estas correcciones:

- **Búsqueda del texto viejo** (`grep` en todo el repositorio, fuera de `.git`): «Por comprobar al
  construir HU-03.1», `clock_timestamp`, «hora del reloj», «sin base», «durante la consulta»,
  `'MEMBER'`, «es miembro de», «quedó probada» y las cuentas viejas de casos. Lo que queda es
  legítimo: los registros históricos (entradas anteriores de `prompts.md`, revisiones de la
  especificación), la preparación de N32, el comentario que explica por qué no se usa
  `clock_timestamp`, la prueba de los scripts y el paso de la integración continua, que sí corren
  sin base, y la regla de dueño, que con `'MEMBER'` es la lectura más estricta.
- **Cruce contra las reglas:** un positivo y un negativo por pieza (P9 con su control N37); el
  README cuenta 42 casos en la prueba de acceso; la especificación cita P9 en la cobertura de D-102.
- **Cada «corregido» con su prueba:** las filas 2 y 3 señalan sus casos; las 1, 5 y 6 son de
  redacción y señalan el archivo.

## En local, después de las correcciones

Scripts 18/18 · validación 20/20 filas · estructura sin fallas · pruebas 35/35, 31/31 y 42/42 ·
verificador sin referencias rotas · hook de datos sin hallazgos.
