# Revisión adversarial

- Fecha: 2026-11-24 00:47 EST
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

### 1. ALTO — La comprobación no detecta que `anon` o `authenticated` puedan asumir otro rol con `BYPASSRLS`

- **Qué está mal:** solo se comprueban los atributos `rolbypassrls` y `rolsuper` directamente en `anon` y `authenticated`, no los roles que pueden asumir por pertenencia.
- **Evidencia:**
  - `supabase/comprobaciones/estructura.sql`, CTE `personas`: solo contiene `authenticated` y `anon`.
  - Mismo archivo, CTE `fallas`:
    ```sql
    FROM pg_roles r JOIN personas p ON p.rol = r.rolname
    WHERE r.rolbypassrls OR r.rolsuper
    ```
    No recorre `pg_auth_members` ni los roles alcanzables mediante `SET ROLE`.
  - `tests/base/prueba-comprobacion-estructura.py`, N27: modifica directamente `anon` con `ALTER ROLE anon SUPERUSER`; no prueba pertenencia a otro rol privilegiado.
- **Regla que se rompe y fallo observable:** contradice `openspec/specs/acceso/spec.md`, requisito «Separación por organización en la base», que exige fallar si el rol de las personas “puede omitir las reglas”. Una migración podría crear un rol `puente BYPASSRLS`, concederle acceso a tablas y conceder ese rol a `authenticated`; la comprobación no nombraría el problema aunque `authenticated` pudiera asumirlo y saltarse RLS.
- **Qué lo corregiría:** comprobar también la clausura de roles que `anon` y `authenticated` pueden asumir, con un negativo específico de pertenencia a un rol `BYPASSRLS`. Este hueco queda expuesto por la corrección del hallazgo 11.

### 2. ALTO — La evidencia de atomicidad sigue sin cubrir las herramientas que realmente aplican las migraciones

- **Qué está mal:** se declara cerrado el hallazgo 13 aunque solo se probó `supabase migration up`, mientras `start` y `db reset` siguen explícitamente basados en una suposición.
- **Evidencia:**
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda1-respuesta.md`, hallazgo 13:
    > “que `start` y `db reset` apliquen igual se supone, no se probó”
  - `openspec/plantillas/migracion-controlada.sql`, apartado de atomicidad, repite literalmente ese límite.
  - `.github/workflows/ci.yml`, paso «Base local con las migraciones aplicadas»: ejecuta `bash scripts/base/levantar-base.sh`, que según el propio material usa `supabase start`, no el camino probado.
- **Regla que se rompe y fallo observable:** la plantilla exigía confirmar la atomicidad “para la herramienta que se use”. Si `start` o `db reset` aplican los bloques de otra manera, una falla después de crear funciones o la tabla puede dejar una base parcial aunque la prueba aislada con `migration up` haya sido atómica.
- **Qué lo corregiría:** probar el mismo fallo intermedio mediante `start` y `db reset`, o dejar de presentar el hallazgo como cerrado para esos caminos.

### 3. ALTO — La nueva condición de `not_after` carece de un caso controlado donde sea futuro y la sesión deba aceptarse

- **Qué está mal:** se prueba `not_after` nulo implícitamente y pasado explícitamente, pero no una sesión con `not_after` no nulo y futuro.
- **Evidencia:**
  - `supabase/migrations/20261123170000_organizacion.sql`, función `sesion_abierta()`:
    ```sql
    AND (s.not_after IS NULL OR s.not_after > now())
    ```
  - `tests/base/prueba-acceso-organizacion.py`, P4: usa la sesión creada por defecto, pero no fija ni comprueba el valor de `not_after`.
  - Mismo archivo, N27: solo fuerza `not_after = now() - interval '1 minute'`.
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda1-respuesta.md`, S2, presenta la condición como corregida.
- **Regla que se rompe y fallo observable:** incumple `CLAUDE.md` §4, que exige un caso aceptado y uno rechazado por pieza. Una regresión que aceptara únicamente `s.not_after IS NULL` pasaría en una configuración local donde las sesiones normales lo tengan nulo, pero rechazaría toda sesión legítima a la que el servicio hubiese fijado un fin futuro.
- **Qué lo corregiría:** fijar dentro de una transacción un `not_after` futuro y exigir `true`, además del negativo pasado. Este hallazgo nace de la corrección S2.

### 4. ALTO — Las pruebas aún no demuestran que `es_mi_organizacion()` responda siempre falso para cualquier UUID

- **Qué está mal:** todos los casos usan UUID generados normalmente; ninguno cubre un UUID centinela ni `NULL`, por lo que una función parcialmente verdadera puede pasar la batería.
- **Evidencia:**
  - `supabase/migrations/20261123170000_organizacion.sql`, D-100:
    > “HASTA EL TRAMO 3 RESPONDE SIEMPRE «NO»”
  - `tests/base/prueba-acceso-organizacion.py`, N28 y N29: llaman la función únicamente con `org_id`.
  - N30 usa filas existentes con UUID normales; N31 omite `id`, por lo que recibe uno de `gen_random_uuid()`.
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda1-respuesta.md`, hallazgo 3, afirma que N28–N31 prueban D-100.
- **Regla que se rompe y fallo observable:** una implementación como:
  ```sql
  SELECT organizacion = '00000000-0000-0000-0000-000000000000'::uuid;
  ```
  dejaría pasar N28–N31 y P5, pero ya no respondería siempre falso. Con una política permisiva futura, una inserción que declare explícitamente ese `id` superaría la política restrictiva.
- **Qué lo corregiría:** añadir valores especiales y una inserción con `id` explícito, o validar de manera fiable que el cuerpo del tramo 2 es incondicionalmente falso. La corrección del hallazgo 3 solo detecta regresiones globales como `SELECT true`.

### 5. MEDIO — La prueba de correspondencia migración-validación no demuestra que el ejecutable aplique esa comprobación

- **Qué está mal:** se prueba `sin_pareja()` aisladamente, pero no que `main()` la invoque al ejecutarse sin argumentos.
- **Evidencia:**
  - `tests/base/prueba-scripts-base.py`, P3, N6 y N7: llaman directamente:
    ```python
    validaciones.sin_pareja(...)
    ```
  - `.github/workflows/ci.yml` ejecuta el script real contra el repositorio, donde actualmente todos los nombres están emparejados; no fabrica un estado huérfano.
  - `scripts/base/correr-validaciones.py`, `main()`: la conexión entre el modo sin argumentos y `sin_pareja()` no tiene prueba de integración.
- **Regla que se rompe y fallo observable:** si se eliminara la llamada a `sin_pareja()` desde `main()`, P3, N6 y N7 seguirían verdes y la ejecución normal de CI también seguiría verde mientras el repositorio actual estuviera emparejado. Una migración posterior sin validación volvería a entrar sin que la supuesta corrección estuviera protegida.
- **Qué lo corregiría:** invocar `main()` o el proceso completo sobre carpetas temporales con una migración huérfana y una validación huérfana. Este hallazgo nace de la corrección del hallazgo 2.

### 6. MEDIO — La prueba no exige realmente “exactamente 20 filas” de validación

- **Qué está mal:** compara un conjunto de nombres obtenido de un diccionario, por lo que las filas duplicadas desaparecen antes de contar.
- **Evidencia:**
  - `tests/base/prueba-validacion-organizacion.py`, `main()`:
    ```python
    fallas = sorted(k for k, v in filas.items() if v != "OK")
    ...
    elif set(filas) != FILAS:
    ```
  - Comentario anterior a `FILAS`:
    > “Las 20 filas que la validación debe dar, ni una más ni una menos”
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda1-respuesta.md`, hallazgo 5:
    > “La prueba exige exactamente las 20 filas”
- **Regla que se rompe y fallo observable:** si la validación emitiera 21 filas porque duplicó una comprobación con el mismo nombre, el diccionario conservaría una sola entrada, `set(filas)` seguiría coincidiendo con `FILAS` y todos los casos podrían pasar. El README continuaría afirmando falsamente que se verifican 20 filas exactas.
- **Qué lo corregiría:** conservar y comprobar la lista original de filas, su longitud y la ausencia de nombres duplicados. Este defecto nace de la corrección del hallazgo 5.

### 7. MEDIO — La especificación marca HU-03.1 como pendiente y completada al mismo tiempo, y fecha pruebas antes de que existieran

- **Qué está mal:** la cabecera dice que la comprobación ya terminó, pero el requisito conserva el rótulo “Por comprobar”, y atribuye al 23/11 casos añadidos el 24/11.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, cabecera:
    > “La de HU-03.1 ... quedó comprobada el 23/11/2026”
  - Mismo archivo, requisito «Separación por organización en la base»:
    > “**Por comprobar al construir HU-03.1:** que la base pueda consultar...”
  - Nota inmediatamente posterior:
    > “*Comprobado al construir HU-03.1 (23/11/2026)*”
    y cita N23–N31.
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda1-respuesta.md` está fechado el 24/11/2026 y explica que N23–N31 son correcciones de esa ronda.
- **Regla que se rompe y fallo observable:** contradice la fuente de verdad y `CLAUDE.md` §7. Un lector no puede determinar si la comprobación sigue pendiente; además, el registro atribuye evidencia a una fecha anterior a la creación de esos casos.
- **Qué lo corregiría:** eliminar o convertir en antecedente histórico el rótulo pendiente y distinguir la comprobación original del 23/11 de las ampliaciones del 24/11. La corrección del hallazgo 12 solo actualizó la cabecera.

### 8. MEDIO — La especificación declara que la comprobación no verifica cómo está escrita la política, pero el código sí exige su expresión exacta

- **Qué está mal:** la documentación describe como límite algo que la implementación sí comprueba.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, límite del requisito:
    > “la comprobación de estructura prueba que la regla existe, no que esté bien escrita”
  - `supabase/comprobaciones/estructura.sql`, CTE `regla_buena`: exige `polpermissive`, `polcmd`, `polroles` y la igualdad exacta de `USING` y `WITH CHECK` con `public.es_mi_organizacion(...)`.
  - `CLAUDE.md` §5 también afirma que la comprobación exige la regla restrictiva al leer y escribir.
- **Regla que se rompe y fallo observable:** vulnera la obligación documental de decir “ni más ni menos” que el código. Ante una política con `USING (true)`, la especificación dice que la comprobación solo garantiza su existencia, pero el SQL sí falla con `sin-regla-restrictiva`.
- **Qué lo corregiría:** alinear el límite con las comprobaciones sintácticas reales y reservar como límite únicamente que esa expresión tenga el comportamiento esperado con datos.
