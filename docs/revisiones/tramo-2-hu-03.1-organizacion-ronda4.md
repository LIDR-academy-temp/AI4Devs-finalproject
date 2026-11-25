# Revisión adversarial

- Fecha: 2026-11-24 08:16 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-temporal>/encargo-tramo2-ronda4.md` · huella `9bfff46ee578` · 2022 caracteres
- Archivo: `<espacio-temporal>/diff-tramo2-ronda4-d256052-705f95b.diff` · huella `17bb64eb3952` · 61261 caracteres
- Archivo: `supabase/comprobaciones/estructura.sql` · huella `d2c5eb56ae6b` · 9030 caracteres
- Archivo: `tests/base/prueba-acceso-organizacion.py` · huella `c00ebc93036c` · 20078 caracteres
- Archivo: `tests/base/prueba-validacion-organizacion.py` · huella `135d5fb08f91` · 11010 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. MEDIO — `prompts.md` todavía afirma que `supabase start` demostró atomicidad, en contradicción directa con la corrección de la ronda 3

- **Qué está mal:** la documentación conserva como válida la afirmación que el hallazgo 7 debía retirar.
- **Evidencia:**
  - `prompts.md`, párrafo «Ronda 2»:
    > “La atomicidad quedó probada también con `db reset` y `start`.”
  - `openspec/plantillas/migracion-controlada.sql`, apartado de atomicidad corregido:
    > “Eso no es atomicidad: es que no queda base que usar”
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda3-respuesta.md`, hallazgo 7:
    > “Corregido”
  - La misma respuesta, «Documentación al día (D-91)», incluye expresamente `prompts.md`.
- **Regla o escenario que se rompe:** un lector de `prompts.md` puede concluir que `start` garantiza una migración transaccional, mientras la plantilla dice exactamente lo contrario. La documentación deja dos decisiones incompatibles.
- **Qué lo corregiría:** marcar aquella afirmación como conclusión posteriormente refutada o dejar claro en la ronda 3 que `start` no probó atomicidad.
- **Origen:** la corrección del hallazgo 7 de la ronda 3 quedó incompleta.

### 2. MEDIO — La mitigación de 8 segundos de D-102 no tiene ninguna comprobación ejecutable ni evidencia preservada

- **Qué está mal:** se presenta el límite local de 8 segundos como cota efectiva del riesgo, pero ninguna prueba o validación comprueba que siga configurado.
- **Evidencia:**
  - `docs/trazabilidad/01-Discovery/discovery-controlador-tiempo.md`, D-102:
    > “una consulta por la API no dura más de 8 segundos en la base local”
  - `openspec/specs/acceso/spec.md`, tabla de riesgos:
    > “es el tiempo máximo que la base local trae configurado para `authenticator` [...] y para `authenticated` (visto el 24/11/2026...)”
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda3-respuesta.md`, hallazgo 1:
    > “lo acotan [...] el tiempo máximo de 8 segundos que la base local trae”
  - En el diff de corrección no se añade ninguna prueba, validación ni migración que lea o fije `statement_timeout`; P7 y N32 solo comprueban el comportamiento temporal de `sesion_abierta()`.
- **Regla o escenario que se rompe:** si una actualización de la base local cambia o elimina ese ajuste, todas las pruebas seguirán verdes y la documentación continuará afirmando que el margen máximo es de 8 segundos. D-102 quedaría respaldada por una cota que ya no existe.
- **Qué lo corregiría:** comprobar de forma reproducible el ajuste efectivo de los roles relevantes o dejar de presentarlo como cobertura vigente y tratarlo solo como una observación manual no garantizada.
- **Origen:** nace de la documentación y cobertura añadidas para D-102.

### 3. MEDIO — P7 depende de que la consulta comience menos de un segundo después de preparar `not_after`, por lo que puede fallar con la implementación correcta

- **Qué está mal:** la prueba usa una ventana de solo un segundo entre la actualización y el inicio de la sentencia que pretende demostrar D-102.
- **Evidencia:**
  - `tests/base/prueba-acceso-organizacion.py`, P7:
    ```python
    antes="update auth.sessions set not_after = clock_timestamp() + interval '1 second' ..."
    ```
    seguido de:
    ```sql
    select public.sesion_abierta()
    from (select pg_sleep(1.5)) espera;
    ```
  - Entre ambas operaciones, `con_pase()` ejecuta además:
    ```sql
    set local role ...;
    set local request.jwt.claims = ...;
    ```
- **Regla o escenario que se rompe:** con una pausa del proceso, carga alta o planificación lenta superior a un segundo después del `UPDATE`, la consulta empezará cuando `not_after` ya haya pasado; `statement_timestamp()` devolverá correctamente una hora posterior y P7 fallará esperando `t`. El fallo parecerá una regresión de D-102 aunque el código sea correcto.
- **Qué lo corregiría:** preparar el vencimiento con margen suficiente y comprobar explícitamente que el inicio de la sentencia ocurrió antes de él, sin depender de una ventana tan estrecha.
- **Origen:** nace del nuevo caso P7 introducido para cerrar el hallazgo 1.

### 4. MEDIO — El normalizador de N36 no maneja comentarios de bloque anidados válidos en PostgreSQL

- **Qué está mal:** la expresión regular elimina hasta el primer `*/`, aunque PostgreSQL permite anidar comentarios de bloque.
- **Evidencia:**
  - `tests/base/prueba-acceso-organizacion.py`, `sin_comentarios()`:
    ```python
    texto = re.sub(r"/\*.*?\*/", " ", texto, flags=re.DOTALL)
    ```
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda3-respuesta.md`, hallazgo 8:
    > “N36 quita también [...] los de bloque”
  - P8 solo usa un bloque no anidado:
    ```python
    "SELECT /* bloque\n de dos líneas */ false;"
    ```
- **Regla o escenario que se rompe:** el cuerpo semánticamente idéntico:
  ```sql
  SELECT /* exterior /* interior */ exterior */ false;
  ```
  es válido en PostgreSQL, pero el normalizador dejaría `exterior */` y N36 fallaría aunque D-100 siga cumpliéndose exactamente.
- **Qué lo corregiría:** no declarar cubiertos todos los comentarios de bloque con esta expresión regular, o usar un análisis que respete el anidamiento admitido por PostgreSQL y añadir ese caso al control.
- **Origen:** la corrección del hallazgo 8 no cubre completamente la sintaxis que afirma normalizar.

### 5. MEDIO — El propio archivo de prueba conserva el rótulo obsoleto «Por comprobar» que la corrección 5 pretendía eliminar

- **Qué está mal:** la especificación fue actualizada a «Comprobado», pero la documentación inicial de la prueba todavía presenta el requisito con el estado anterior.
- **Evidencia:**
  - `tests/base/prueba-acceso-organizacion.py`, docstring inicial:
    > `sesion_abierta(): «Por comprobar al construir HU-03.1»`
  - `openspec/specs/acceso/spec.md`, rótulo corregido:
    > “Comprobado al construir HU-03.1”
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda3-respuesta.md`, hallazgo 5:
    > “Corregido”
- **Regla o escenario que se rompe:** una búsqueda de marcadores pendientes todavía encuentra HU-03.1 como «Por comprobar», y dos archivos describen el mismo estado de forma incompatible. Esto contradice además la declaración de «Documentación al día (D-91)».
- **Qué lo corregiría:** identificar el texto como antecedente histórico o actualizarlo al estado vigente.
- **Origen:** la corrección del rótulo fue parcial.

### 6. MEDIO — La respuesta afirma que P8 es un control «sin base», pero no puede ejecutarse sin levantar y usar la base

- **Qué está mal:** P8 es una comprobación puramente textual, pero está incrustada después de numerosas operaciones de API y SQL en una prueba que inicializa el entorno de Supabase al importar el archivo.
- **Evidencia:**
  - `docs/revisiones/tramo-2-hu-03.1-organizacion-ronda3-respuesta.md`, hallazgo 8:
    > “Su control P8, sin base, comprueba el normalizador”
  - `tests/base/prueba-acceso-organizacion.py`:
    ```python
    ENV = entorno()
    ```
    y P8 aparece dentro de `main()`, después de crear cuentas, sesiones, una organización y ejecutar múltiples consultas.
  - El docstring del mismo archivo indica:
    > “Necesita la base local levantada”
- **Regla o escenario que se rompe:** con la base detenida, el proceso termina antes de alcanzar P8; por tanto, no existe el control independiente «sin base» que la respuesta declara. Una regresión del normalizador no puede comprobarse aisladamente.
- **Qué lo corregiría:** describirlo solo como una operación que no consulta la base, o separarlo realmente en una prueba ejecutable sin Supabase.
- **Origen:** la respuesta del hallazgo 8 dice más de lo que implementa la corrección.

## Sospecha no elevada a hallazgo

- La plantilla sigue declarando confirmada la atomicidad de `migration up` y `db reset` a partir de una prueba manual cuya salida no se conservó. El material no permite verificar de manera independiente si la ausencia del primer objeto se debió a rollback transaccional o a reconstrucción/limpieza del entorno. No puedo afirmar que la conclusión sea falsa sin la salida o una reproducción, pero la evidencia disponible es frágil.
