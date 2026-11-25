# Revisión adversarial

- Fecha: 2026-11-24 07:55 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-temporal>/encargo-tramo2-ronda3.md` · huella `280e02598c99` · 2699 caracteres
- Archivo: `<espacio-temporal>/diff-tramo2-ronda3-b6fc858-d256052.diff` · huella `cc1e7532da91` · 69627 caracteres
- Archivo: `supabase/comprobaciones/estructura.sql` · huella `1c647c39595c` · 8835 caracteres
- Archivo: `supabase/migrations/20261123170000_organizacion.sql` · huella `b6c74776a398` · 11724 caracteres
- Archivo: `tests/base/prueba-acceso-organizacion.py` · huella `1370ec98761a` · 18399 caracteres
- Archivo: `tests/base/prueba-scripts-base.py` · huella `f80ea539492f` · 7734 caracteres
- Archivo: `tests/base/prueba-validacion-organizacion.py` · huella `29a7a0cfbe74` · 10467 caracteres
- Archivo: `openspec/plantillas/migracion-controlada.sql` · huella `0545d7a79771` · 9183 caracteres
- Archivo: `CLAUDE.md` · huella `2ed1555e6df4` · 10489 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. ALTO — `sesion_abierta()` usa un reloj volátil pero sigue declarada `STABLE`, por lo que no garantiza que una sesión vencida durante una misma sentencia deje de aceptarse

- **Qué está mal:** `clock_timestamp()` puede cambiar dentro de una sentencia, mientras `STABLE` promete un resultado estable durante ella y permite al planificador reutilizarlo.
- **Evidencia:**
  - `supabase/migrations/20261123170000_organizacion.sql`, función `public.sesion_abierta()`:
    ```sql
    LANGUAGE sql
    STABLE
    ...
    AND (s.not_after IS NULL OR s.not_after > clock_timestamp())
    ```
  - `tests/base/prueba-acceso-organizacion.py`, N32:
    ```sql
    select pg_sleep(1.5);
    select public.sesion_abierta();
    ```
    Son dos sentencias, no una consulta que atraviese el vencimiento.
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda2-respuesta.md`, cruce final:
    > “el cambio a la hora del reloj no cambia su volatilidad declarada”
  - `openspec/specs/acceso/spec.md`, nota de HU-03.1:
    > “aunque pase durante la consulta”
- **Regla o escenario que se rompe:** una sentencia larga que evalúe `sesion_abierta()` antes y después de `not_after` puede conservar el primer `true`. Por ejemplo, una operación sobre muchas filas iniciada antes del vencimiento puede continuar autorizada después. N32 seguiría verde porque espera en una sentencia y consulta en la siguiente.
- **Qué lo corregiría:** alinear la volatilidad declarada con el reloj utilizado y añadir un caso que cruce `not_after` dentro de una única sentencia.
- **Origen:** nace de la corrección del hallazgo 10 de la ronda 2.

### 2. MEDIO — La evidencia de `supabase start` se generalizó más allá del único caso probado y se presenta incorrectamente como atomicidad

- **Qué está mal:** la respuesta limita la prueba a `start` sobre una base nueva, pero la plantilla afirma sin esa condición que `start` borra la base; además, borrar una base tras fallar no demuestra que la migración haya sido atómica.
- **Evidencia:**
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda2-respuesta.md`, hallazgo 2:
    > “`start` sobre una base nueva, el camino de la integración continua”
  - `openspec/plantillas/migracion-controlada.sql`, apartado de atomicidad:
    > “`supabase start` [...] detiene todo y borra la base; no queda base, ni entera ni a medias”
  - En el mismo apartado:
    > “la migración COMPLETA solo lo es si quien la aplica la envuelve en una transacción”
- **Regla o escenario que se rompe:** al ejecutar `supabase start` sobre una base local existente con una migración pendiente que falla, la plantilla induce a esperar el mismo borrado o una aplicación atómica, aunque la evidencia declarada solo cubrió una base nueva. El resultado para una base existente sigue sin estar demostrado.
- **Qué lo corregiría:** limitar expresamente la afirmación al arranque de una base nueva y distinguir eliminación compensatoria de atomicidad transaccional; cualquier garantía sobre bases existentes necesita evidencia separada.
- **Origen:** la corrección del hallazgo 2 de la ronda 2 dice más de lo probado.

### 3. MEDIO — `pg_has_role(..., 'MEMBER')` no demuestra exactamente que el rol privilegiado pueda asumirse mediante `SET ROLE`

- **Qué está mal:** la consulta equipara pertenencia con capacidad efectiva de asumir el rol, por lo que puede rechazar membresías que no permiten `SET ROLE`.
- **Evidencia:**
  - `supabase/comprobaciones/estructura.sql`, CTE `fallas`:
    ```sql
    FROM personas p
    JOIN pg_roles r ON pg_has_role(p.rol, r.oid, 'MEMBER')
    WHERE r.rolbypassrls OR r.rolsuper
    ```
  - Comentario inmediatamente anterior:
    > “que pueda asumir con SET ROLE”
  - `tests/base/prueba-comprobacion-estructura.py`, N29:
    ```sql
    create role prueba_puente bypassrls nologin;
    grant prueba_puente to authenticated;
    ```
    Solo cubre una concesión directa y asumible por defecto.
- **Regla o escenario que se rompe:** una membresía concedida sin capacidad de `SET ROLE` —o la pertenencia de un rol no superusuario a uno superusuario, que no lo convierte automáticamente en superusuario asumible— puede producir `rol-de-personas-omite-reglas` aunque el rol no pueda omitir RLS. La CI rechazaría una estructura que no presenta el riesgo descrito.
- **Qué lo corregiría:** comprobar la capacidad efectiva de asumir el rol según la versión del servidor, o declarar explícitamente que se rechaza toda membresía como política conservadora. Hace falta también un caso de membresía no asumible.
- **Origen:** nace de la corrección del hallazgo 1 de la ronda 2.

### 4. MEDIO — N34 acepta `NULL` aunque D-100 exige que la función responda siempre «no»

- **Qué está mal:** el supuesto caso para el argumento nulo considera válidos tanto `false` como `NULL`.
- **Evidencia:**
  - `tests/base/prueba-acceso-organizacion.py`, N34:
    ```python
    caso("N34 con un valor nulo, es_mi_organizacion no responde sí",
         responde(r) in ("false", "nulo"), responde(r))
    ```
  - `supabase/migrations/20261123170000_organizacion.sql`, descripción de D-100:
    > “HASTA EL TRAMO 3 RESPONDE SIEMPRE «NO»”
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda2-respuesta.md`, hallazgo 4, presenta N34 como cobertura de “cualquier UUID” y de D-100.
- **Regla o escenario que se rompe:** si la función se marcara `STRICT`, conservaría el cuerpo `SELECT false;` pero respondería `NULL` ante un argumento nulo. N34 y la comparación de `prosrc` de N36 aceptarían por separado ese comportamiento, aunque “siempre no” ya no sería cierto.
- **Qué lo corregiría:** exigir específicamente `false` para el argumento nulo y proteger también los atributos de la función que pueden impedir ejecutar su cuerpo.
- **Origen:** nace de la corrección del hallazgo 4 de la ronda 2.

### 5. MEDIO — N29 no prueba que la batería rechace una validación con filas duplicadas

- **Qué está mal:** el supuesto control solo verifica que el SQL modificado devuelve 21 filas; no pasa ese resultado por la condición de rechazo usada para los casos reales.
- **Evidencia:**
  - `tests/base/prueba-validacion-organizacion.py`, N29:
    ```python
    _, nombres, error = correr("", repetida)
    ok = error is None ... \
        and len(nombres) == len(FILAS) + 1 and set(nombres) == FILAS
    ```
  - La decisión que debería proteger está en otro bloque:
    ```python
    elif len(nombres) != len(FILAS) or set(nombres) != FILAS:
        ok = False
    ```
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda2-respuesta.md`, hallazgo 6:
    > “Control N29 [...] y la cuenta lo ve”
- **Regla o escenario que se rompe:** si se eliminara o debilitara la rama que rechaza cantidades distintas de 20, todos los casos normales continuarían recibiendo 20 filas y N29 también pasaría, porque su propio éxito consiste en observar 21 filas, no en comprobar que la batería las rechaza.
- **Qué lo corregiría:** hacer que la validación duplicada atraviese la misma función de decisión utilizada por los casos normales y exigir un resultado de fallo.
- **Origen:** la corrección del hallazgo 6 de la ronda 2 no queda protegida por su control declarado.

### 6. MEDIO — La especificación continúa marcando la misma comprobación como pendiente y terminada simultáneamente

- **Qué está mal:** añadir “ya comprobado” entre paréntesis no elimina el marcador incompatible “Por comprobar”.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, requisito «Separación por organización en la base»:
    > “**Por comprobar al construir HU-03.1 (ya comprobado: ver la nota que sigue a este párrafo):**”
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda2-respuesta.md`, hallazgo 7:
    > “Corregido”
  - `CLAUDE.md` §3 declara que la especificación es la fuente de verdad.
- **Regla o escenario que se rompe:** un lector todavía encuentra dos estados presentes e incompatibles para HU-03.1. Una herramienta o revisión que busque marcadores “Por comprobar” seguirá clasificando el requisito como pendiente, aunque la nota diga lo contrario.
- **Qué lo corregiría:** convertir el marcador en antecedente histórico inequívoco o dejar únicamente el estado completado.
- **Origen:** la corrección del hallazgo 7 de la ronda 2 sigue siendo parcial.

### 7. MEDIO — N36 no compara realmente el cuerpo “sin comentarios”; solo elimina comentarios `--` que ocupan una línea completa

- **Qué está mal:** los comentarios al final de una sentencia y los comentarios de bloque permanecen en la cadena comparada.
- **Evidencia:**
  - `tests/base/prueba-acceso-organizacion.py`, N36:
    ```python
    sentencia = " ".join(
        linea.strip() for linea in cuerpo.splitlines()
        if linea.strip() and not linea.strip().startswith("--")
    )
    caso(..., sentencia == "SELECT false;", ...)
    ```
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda2-respuesta.md`, hallazgo 4:
    > “N36 compara el cuerpo, sin comentarios, con `SELECT false;`”
- **Regla o escenario que se rompe:** un cambio semánticamente neutro a `SELECT false; -- D-100` o la adición de `/* D-100 */` hace fallar N36 aunque la función siga respondiendo exactamente lo exigido. La prueba impone una forma textual no declarada por D-100 y contradice la afirmación de que ignora comentarios.
- **Qué lo corregiría:** no afirmar que se eliminan todos los comentarios mientras solo se filtran líneas completas, o normalizarlos de manera completa antes de comparar.
- **Origen:** nace de la corrección del hallazgo 4 de la ronda 2.
