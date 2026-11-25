# Revisión adversarial

- Fecha: 2026-11-24 00:48 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-temporal>/encargo-tramo2-ronda2.md` · huella `a35dbfc35f36` · 2148 caracteres
- Archivo: `<espacio-temporal>/diff-tramo2-ronda2-dfb8530-b6fc858.diff` · huella `f64656f31884` · 86603 caracteres
- Archivo: `supabase/comprobaciones/estructura.sql` · huella `157be0fe0820` · 8317 caracteres
- Archivo: `scripts/base/comprobar-estructura.py` · huella `4154ab7f034b` · 3782 caracteres
- Archivo: `supabase/migrations/20261123170000_organizacion.sql` · huella `bb81994b7990` · 11564 caracteres
- Archivo: `tests/base/prueba-acceso-organizacion.py` · huella `963218c628b6` · 15760 caracteres
- Archivo: `openspec/specs/acceso/spec.md` · huella `cbad49a869eb` · 34490 caracteres
- Archivo: `CLAUDE.md` · huella `d7758fe3accb` · 10289 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. ALTO — La repetición de `sesion_abierta()` en el servicio gestionado sigue sin ser un criterio exigible

- **Qué está mal:** la corrección reemplaza una garantía falsa sobre H-4 por la promesa de que unos tickets futuros incorporarán la prueba, pero ningún material adjunto la exige actualmente.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, requisito **«Separación por organización en la base»**: «El ticket H-4 del recorte v4 no pide repetir estos casos [...] se agregan a su criterio con los tickets v5 (D-99)».
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda1-respuesta.md`, hallazgo 4: afirma que queda «anotado en el seguimiento diario como contenido de los tickets v5», pero ese seguimiento o los tickets v5 no están entre los cambios.
  - `CLAUDE.md`, §6, **«Puerta del tramo 8 (D-99)»**: D-99 solo exige que los tickets v5 y el PRD v9 existan antes del tramo 8; no exige que contengan estos casos de `sesion_abierta()`.
- **Regla o escenario que se rompe:** el hallazgo 4 de la ronda anterior no queda cerrado mediante una obligación verificable. Los tickets v5 podrían publicarse sin P4/N23–N27, H-4 podría cerrarse cumpliendo sus criterios y la función `SECURITY DEFINER` podría no funcionar igual contra `auth.sessions` en el servicio gestionado sin que ninguna puerta lo detectara.

### 2. ALTO — `sesion_abierta()` puede aceptar una sesión después de `not_after` en una transacción larga

- **Qué está mal:** la función compara `not_after` con `now()`, cuyo valor queda fijado al inicio de la transacción, no con el tiempo efectivo en que se comprueba la sesión.
- **Evidencia:**
  - `supabase/migrations/20261123170000_organizacion.sql`, función `public.sesion_abierta()`:
    ```sql
    AND (s.not_after IS NULL OR s.not_after > now())
    ```
  - La misma función está declarada `STABLE`.
  - `tests/base/prueba-acceso-organizacion.py`, caso N27: fija `not_after = now() - interval '1 minute'` antes de consultar, por lo que solo prueba un vencimiento ya ocurrido al comenzar la transacción.
  - `openspec/specs/acceso/spec.md`, nota de HU-03.1: promete que responde no cuando ha «pasado el fin que el servicio le fije a la sesión».
- **Regla o escenario que se rompe:** una transacción comienza a las 12:00 con `not_after` a las 12:01, queda bloqueada o espera y ejecuta la operación a las 12:02. `now()` continúa siendo 12:00 y la función responde verdadero, aunque el fin ya pasó. N27 queda verde porque no cubre el cruce del límite durante la transacción.

### 3. MEDIO — La atomicidad continúa sin estar comprobada para el mecanismo que aplica las migraciones en la CI

- **Qué está mal:** la evidencia usa `supabase migration up`, mientras el flujo adjunto levanta la base mediante `supabase start`; la propia plantilla admite que la equivalencia se supone.
- **Evidencia:**
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda1-respuesta.md`, hallazgo 13: «que `start` y `db reset` apliquen igual se supone, no se probó».
  - `openspec/plantillas/migracion-controlada.sql`, límites: repite literalmente ese supuesto.
  - `.github/workflows/ci.yml`, paso **«Base local con las migraciones aplicadas»**: ejecuta `bash scripts/base/levantar-base.sh`; el encargo y la respuesta identifican ese flujo con `supabase start`.
  - La respuesta clasifica el hallazgo como **«Corregido con evidencia»**.
- **Regla o escenario que se rompe:** si `start` aplica los bloques con una ruta o configuración transaccional diferente, una falla posterior puede dejar creada o reemplazada `es_zona_horaria` antes de abortar en `organizacion`. La prueba con `migration up` no demuestra la atomicidad del camino realmente usado por la CI, de modo que el hallazgo 13 permanece abierto para ese camino.

### 4. MEDIO — La especificación todavía declara HU-03.1 pendiente y comprobada a la vez

- **Qué está mal:** se actualizó la cabecera, pero permaneció dentro del requisito el marcador explícito «Por comprobar al construir HU-03.1».
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, cabecera: «La de HU-03.1 [...] quedó comprobada el 23/11/2026».
  - Mismo archivo, requisito **«Separación por organización en la base»**: conserva el párrafo que empieza con **«Por comprobar al construir HU-03.1»**.
  - Inmediatamente después aparece la nota **«Comprobado al construir HU-03.1»**.
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda1-respuesta.md`, hallazgo 12: afirma que la contradicción fue corregida actualizando la cabecera.
- **Regla o escenario que se rompe:** la especificación, declarada fuente de verdad por `CLAUDE.md` §3, ofrece dos estados incompatibles. Un lector puede tratar la comprobación como aún pendiente aunque la cabecera y la nota la den por cerrada. La corrección del hallazgo 12 fue parcial.

### 5. MEDIO — La especificación contradice al código sobre si la comprobación valida el contenido de la regla

- **Qué está mal:** la especificación declara como límite que solo se comprueba la existencia de la regla, pero el SQL y su propia cabecera comparan exactamente `USING` y `WITH CHECK`.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, límite del requisito **«Separación por organización en la base»**: «la comprobación de estructura prueba que la regla existe, no que esté bien escrita».
  - `supabase/comprobaciones/estructura.sql`, CTE `regla_buena`: exige `polcmd = '*'`, `polroles = '{0}'`, que sea restrictiva y compara ambos `pg_get_expr(...)` con `public.es_mi_organizacion(...)`.
  - Cabecera del mismo SQL: «Prueba que la regla existe y que está escrita como se pide».
  - `tests/base/prueba-validacion-organizacion.py`, casos N21–N24: mutan orden, rol, `USING` y `WITH CHECK`.
- **Regla o escenario que se rompe:** un cambio que deje de verificar la expresión podría considerarse permitido por el «límite declarado», aunque incumpliría la implementación, `CLAUDE.md` §5 y las pruebas. A la inversa, el comportamiento actual hace más de lo que la fuente de verdad dice que garantiza.

### 6. MEDIO — Las pruebas nuevas ejercitan los auxiliares aislados, pero no demuestran que los scripts decisores los utilicen

- **Qué está mal:** `prueba-scripts-base.py` llama directamente a `analizar()`, `sin_pareja()` y `leer_sql()`, por lo que puede quedar verde aunque se elimine su conexión con `main()` en los scripts de CI.
- **Evidencia:**
  - `tests/base/prueba-scripts-base.py`, P1–N5: invoca `comprobar.analizar(...)` directamente.
  - Mismo archivo, P3/N6/N7: invoca `validaciones.sin_pareja(...)` directamente.
  - Mismo archivo, P4/N8: invoca `leer_sql(...)` directamente.
  - `scripts/base/comprobar-estructura.py`, `main()`: la decisión real depende de `analizar(psql_ok(leer_sql(COMPROBACION)))`.
  - `scripts/base/correr-validaciones.py`, `main()`: la correspondencia solo se aplica dentro de la rama `if argumentos ... else`.
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda1-respuesta.md`, hallazgos 2, 8, 9 y 10: presenta esos casos como prueba de que los scripts y la CI rechazan los estados.
- **Regla o escenario que se rompe:** si `main()` vuelve a leer con `Path.read_text`, deja de llamar a `sin_pareja` o ignora los errores de `analizar`, los 12 casos unitarios siguen pasando. Como el repositorio normal tiene archivos emparejados y una salida SQL válida, los pasos posteriores de la CI tampoco ejercitan los caminos negativos; la batería pasaría aunque la corrección efectiva hubiera desaparecido.

### 7. MEDIO — La prueba no demuestra que la validación produzca exactamente 20 filas

- **Qué está mal:** la comprobación añadida compara el conjunto de nombres, no la cantidad de filas crudas, por lo que una fila duplicada no cuenta como sobrante.
- **Evidencia:**
  - `tests/base/prueba-validacion-organizacion.py`, declaración `FILAS`: usa un `set` con los 20 nombres.
  - Mismo archivo, `main()`:
    ```python
    elif set(filas) != FILAS:
    ```
  - En el mismo bloque, `filas` se trata como mapeo mediante `filas.items()`, lo que no conserva dos entradas independientes con la misma clave.
  - El comentario afirma: «Las 20 filas que la validación debe dar, ni una más ni una menos».
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda1-respuesta.md`, hallazgo 5: afirma que «La prueba exige exactamente las 20 filas».
- **Regla o escenario que se rompe:** una regresión puede emitir las 20 filas esperadas más un duplicado de cualquiera de ellas. El conjunto de nombres continúa siendo `FILAS` y la prueba puede aprobar 21 filas, contradiciendo tanto el comentario como el cierre declarado del hallazgo 5.
