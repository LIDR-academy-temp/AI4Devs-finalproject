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

### 1. ALTO — `sesion_abierta()` promete variar con el reloj, pero está declarada `STABLE`

- **Qué está mal:** una función sin argumentos cuyo resultado puede cambiar durante una sentencia por usar `clock_timestamp()` no cumple el contrato de `STABLE`, y el caso N32 no detecta esta incompatibilidad.
- **Evidencia:**
  - `supabase/migrations/20261123170000_organizacion.sql`, bloque 3:
    ```sql
    LANGUAGE sql
    STABLE
    ...
    AND (s.not_after IS NULL OR s.not_after > clock_timestamp())
    ```
  - `tests/base/prueba-acceso-organizacion.py`, N32:
    ```python
    "select pg_sleep(1.5);\nselect public.sesion_abierta();"
    ```
    Son dos sentencias: la función se invoca únicamente en la segunda, después de vencer la sesión.
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda2-respuesta.md`, hallazgo 10:
    > “el cambio a la hora del reloj no cambia su volatilidad declarada”
  - `openspec/specs/acceso/spec.md`, nota de HU-03.1:
    > “aunque pase durante la consulta”
- **Regla o escenario que se rompe:** el optimizador puede tratar una función `STABLE` sin argumentos como invariable dentro de una sentencia. Una consulta larga que la evalúe antes de `not_after` puede conservar el resultado verdadero después del vencimiento. N32 queda verde porque espera en una sentencia distinta antes de llamar a la función.
- **Qué lo corregiría:** alinear la volatilidad con el uso de `clock_timestamp()` y añadir un caso donde el vencimiento ocurra dentro de una sola sentencia, o limitar explícitamente la garantía al momento en que comienza cada sentencia.
- **Origen:** nace de la corrección del hallazgo 10 de la ronda 2.

### 2. ALTO — N29 no prueba que la batería rechace 21 filas; solo comprueba que consiguió producirlas

- **Qué está mal:** el supuesto control de la cuenta exacta no pasa la salida duplicada por la misma decisión que valida los casos normales.
- **Evidencia:**
  - `tests/base/prueba-validacion-organizacion.py`, decisión real:
    ```python
    elif len(nombres) != len(FILAS) or set(nombres) != FILAS:
    ```
  - En el mismo archivo, N29 ejecuta aparte:
    ```python
    ok = error is None and repetida != VALIDACION.read_text(encoding="utf-8") \
        and len(nombres) == len(FILAS) + 1 and set(nombres) == FILAS
    ```
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda2-respuesta.md`, hallazgo 6:
    > “Control N29 [...] la cuenta lo ve”
- **Regla o escenario que se rompe:** si se elimina `len(nombres) != len(FILAS)` y se vuelve a comprobar solo el conjunto de nombres, todos los casos normales continúan pasando y N29 también pasa, porque precisamente considera éxito obtener 21 filas. Por tanto, la prueba seguiría verde sin la corrección que dice proteger.
- **Qué lo corregiría:** hacer que la salida mutada de N29 atraviese la misma función de decisión y exigir que sea rechazada.
- **Origen:** nace de la corrección del hallazgo 6 de la ronda 2.

### 3. MEDIO — El caso para `NULL` acepta un resultado nulo aunque D-100 exige siempre `false`

- **Qué está mal:** N34 considera válido tanto `false` como `NULL`, debilitando “responde siempre no” a “no responde sí”.
- **Evidencia:**
  - `tests/base/prueba-acceso-organizacion.py`, N34:
    ```python
    caso("N34 con un valor nulo, es_mi_organizacion no responde sí",
         responde(r) in ("false", "nulo"), responde(r))
    ```
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda2-respuesta.md`, hallazgo 4:
    > “N34 (nulo) [...] es lo que D-100 pide”
  - `supabase/migrations/20261123170000_organizacion.sql`, bloque 4:
    > “HASTA EL TRAMO 3 RESPONDE SIEMPRE «NO»”
- **Regla o escenario que se rompe:** una regresión que haga la función `STRICT` conservaría el cuerpo `SELECT false;`, por lo que N36 seguiría aprobando, pero una entrada `NULL` produciría `NULL`. N34 también la aprobaría aunque la función ya no devolviera el booleano falso para ese caso.
- **Qué lo corregiría:** exigir exactamente `false` en N34 y proteger cualquier atributo de la función que pueda evitar la ejecución del cuerpo.
- **Origen:** nace de la corrección del hallazgo 4 de la ronda 2.

### 4. MEDIO — La afirmación sobre pertenencia “directa o en cadena” solo tiene una prueba directa

- **Qué está mal:** la respuesta declara cubierta la clausura transitiva de roles, pero N29 contiene un único salto.
- **Evidencia:**
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda2-respuesta.md`, hallazgo 1:
    > “directo o en cadena (`pg_has_role(…, 'MEMBER')`)”
  - `tests/base/prueba-comprobacion-estructura.py`, N29:
    ```python
    "create role prueba_puente bypassrls nologin; grant prueba_puente to authenticated;"
    ```
    Solo prueba `authenticated → prueba_puente`.
  - `supabase/comprobaciones/estructura.sql`, CTE `fallas`:
    ```sql
    FROM personas p JOIN pg_roles r ON pg_has_role(p.rol, r.oid, 'MEMBER')
    ```
- **Regla o escenario que se rompe:** una futura implementación que revise únicamente membresías inmediatas seguiría pasando N29. Con `authenticated → puente_a → puente_b BYPASSRLS`, la comprobación no detectaría que el rol privilegiado es alcanzable.
- **Qué lo corregiría:** añadir un negativo con al menos dos saltos y exigir que nombre al rol privilegiado final.
- **Origen:** nace de la corrección del hallazgo 1 de la ronda 2.

### 5. MEDIO — La especificación todavía marca la misma comprobación como pendiente y terminada

- **Qué está mal:** añadir “ya comprobado” entre paréntesis no elimina el estado “Por comprobar”; mantiene ambos estados incompatibles en la fuente de verdad.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, requisito «Separación por organización en la base»:
    > “**Por comprobar al construir HU-03.1 (ya comprobado: ver la nota que sigue a este párrafo):**”
  - Inmediatamente después:
    > “*Comprobado al construir HU-03.1 (23/11/2026)*”
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda2-respuesta.md`, hallazgo 7:
    > “Corregido”
- **Regla o escenario que se rompe:** contradice `CLAUDE.md` §3, que declara la especificación como fuente de verdad. Un lector o una búsqueda de pendientes seguirá encontrando HU-03.1 bajo el rótulo explícito “Por comprobar”, aunque el mismo texto diga que ya terminó.
- **Qué lo corregiría:** dejar un único estado vigente y, si se necesita conservar el antecedente, identificarlo expresamente como texto histórico.
- **Origen:** es una corrección parcial de un hallazgo ya señalado en la ronda 2.

## Sospechas no elevadas a hallazgo

- La evidencia de `supabase start` y `db reset` sobre atomicidad solo aparece como relato en la respuesta y la plantilla; no se adjunta salida, prueba reproducible ni control de que la versión siga siendo 2.109.1. No puedo afirmar que el ensayo no ocurrió, pero el material no permite verificarlo independientemente.
- `supabase/comprobaciones/estructura.sql` equipara `pg_has_role(..., 'MEMBER')` con “puede asumir con `SET ROLE`”. En versiones de PostgreSQL con opciones de membresía como `SET FALSE`, ambas nociones pueden diferir. No lo elevo a hallazgo porque el material no identifica la versión del servidor PostgreSQL ni sus opciones efectivas de membresía.
