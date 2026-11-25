# Revisión adversarial

- Fecha: 2026-11-24 00:06 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-temporal>/encargo-tramo2-ronda1.md` · huella `638ca86f42f4` · 2558 caracteres
- Archivo: `<espacio-temporal>/diff-tramo2-dfb8530.diff` · huella `9039fbc449ca` · 106883 caracteres
- Archivo: `openspec/specs/acceso/spec.md` · huella `48727b0d2ea3` · 34159 caracteres
- Archivo: `CLAUDE.md` · huella `b3a6de4e3913` · 10176 caracteres
- Archivo: `openspec/plantillas/migracion-controlada.sql` · huella `396f2b91354d` · 8642 caracteres
- Archivo: `docs/trazabilidad/05-Tickets/Recorte-Entrega-20261119-v4.md` · huella `c6d68d085af4` · 8225 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. ALTO — La comprobación permite conservar `TRIGGER` y `REFERENCES`, aunque la regla del repositorio exige rechazarlos

**Qué está mal:** la documentación afirma que la comprobación falla ante cualquiera de esos tres privilegios, pero el SQL solo examina `TRUNCATE`.

**Evidencia:**

- `CLAUDE.md`, §5:

  > “La comprobación de estructura (...) falla si falta algo de esto”, incluida la ausencia de `TRUNCATE`, `TRIGGER` y `REFERENCES`.

- `supabase/comprobaciones/estructura.sql`, cabecera, líneas 25-29:

  > “No revisa los privilegios TRIGGER y REFERENCES: la migración los quita, pero aquí no se vigilan.”

- En el CTE `fallas` solo existe:

  ```sql
  has_table_privilege(p.rol, t.oid, 'TRUNCATE')
  ```

- `tests/base/prueba-comprobacion-estructura.py`, casos N22 y N23, solo prueba `TRUNCATE`.

**Regla que se rompe y fallo visible:** una migración futura puede dejar o volver a conceder `TRIGGER` o `REFERENCES` a `authenticated`; `comprobar-estructura.py` y toda la CI quedan en verde, contradiciendo directamente `CLAUDE.md`. Con permisos complementarios, `TRIGGER` permite colgar comportamiento de escrituras futuras sin pasar por la autorización prevista.

**Corrección mínima:** comprobar los tres privilegios y añadir negativos independientes para `TRIGGER` y `REFERENCES`.

---

### 2. ALTO — `es_mi_organizacion()` puede dejar de responder siempre falso y toda la CI seguiría verde

**Qué está mal:** D-100 exige que la función responda siempre falso en este tramo, pero ni la validación ni las pruebas comprueban directamente su cuerpo o resultado.

**Evidencia:**

- `supabase/migrations/20261123170000_organizacion.sql`, función `public.es_mi_organizacion(uuid)`:

  ```sql
  -- D-100...
  SELECT false;
  ```

- `supabase/validaciones/20261123170000_organizacion.sql`, cabecera:

  > “Lo que no comprueba: el cuerpo de es_mi_organizacion (...) Lo que hace se prueba con datos...”

- La fila 18 de esa validación solo comprueba retorno, volatilidad, `SECURITY DEFINER` y `search_path`, no `prosrc` ni el comportamiento.

- `tests/base/prueba-acceso-organizacion.py`, función `como_persona` y casos N12-N16: se conceden permisos de tabla, pero no se crea ninguna política permisiva. Con RLS, la ausencia de política permisiva ya produce denegación total, independientemente de que la función devuelva falso o verdadero.

- No existe una llamada directa a `/rest/v1/rpc/es_mi_organizacion` ni un `SELECT public.es_mi_organizacion(...)`.

**Regla que se rompe y fallo visible:** si `SELECT false` se sustituye por `SELECT true`, la estructura y la validación siguen aceptando la función, y N12-N16 siguen rechazados por la ausencia de política permisiva. La CI queda verde aunque D-100 esté incumplida. También podría sustituirse por una consulta `SECURITY DEFINER` que revele mediante el booleano la existencia de una organización.

**Corrección mínima:** añadir una prueba directa que invoque la función como `anon` y `authenticated` y exija falso para cualquier UUID durante el tramo 2.

---

### 3. ALTO — La CI no comprueba que exista una validación 1 a 1 por cada migración

**Qué está mal:** el ejecutor recorre los archivos de validación existentes, pero nunca compara sus nombres con las migraciones existentes.

**Evidencia:**

- `CLAUDE.md`, §5:

  > “Cada migración lleva su validación 1 a 1 de solo lectura...”

- `scripts/base/correr-validaciones.py`, `main`:

  ```python
  ficheros = [Path(a) for a in argumentos] or sorted(CARPETA.glob("*.sql"))
  ```

  No se recorre `supabase/migrations/` ni se comparan numeraciones.

- `.github/workflows/ci.yml` solo ejecuta:

  ```yaml
  python3 scripts/base/correr-validaciones.py
  ```

**Regla que se rompe y fallo visible:** una migración futura que cree o modifique una función, índice o constraint puede entrar sin archivo homónimo en `supabase/validaciones/`. Todas las validaciones antiguas dan `OK`, la comprobación de estructura puede no cubrir ese objeto y la CI queda verde sin haber validado la migración nueva.

**Corrección mínima:** fallar si los conjuntos de numeraciones de `migrations/*.sql` y `validaciones/*.sql` no coinciden uno a uno.

---

### 4. ALTO — Un identificador con tabulador o salto de línea puede ocultar una falla de estructura

**Qué está mal:** el script ignora silenciosamente cualquier fila `FALLA` que no tenga exactamente cuatro campos separados por tabuladores.

**Evidencia:**

- `supabase/comprobaciones/estructura.sql`, salida:

  ```sql
  SELECT 'FALLA', objeto, motivo, explicacion FROM fallas
  ```

  `objeto` contiene nombres de esquema, tabla o función sin codificación.

- `scripts/base/comprobar-estructura.py`, líneas 27-31:

  ```python
  partes = linea.split("\t")
  if partes[0] == "FALLA" and len(partes) == 4:
      fallas.append(partes[1:])
  ```

  Una fila que empiece con `FALLA` pero tenga cinco campos se descarta; no se considera error de formato.

**Regla que se rompe y fallo visible:** PostgreSQL admite identificadores entre comillas con tabuladores. Una tabla como `public."evasora<TAB>x"` sin `organizacion_id` produce una fila con más de cuatro partes; el script la ignora, encuentra el `RESUMEN` y termina con código 0.

**Corrección mínima:** tratar como error cualquier línea `FALLA` mal formada o usar una salida estructurada que escape los identificadores.

---

### 5. ALTO — Las pruebas de `sesion_abierta()` no detectarían que se aceptara una sesión de otra cuenta

**Qué está mal:** existe la condición de enlace entre sesión y cuenta, pero no hay un caso negativo que la proteja.

**Evidencia:**

- `supabase/migrations/20261123170000_organizacion.sql`, función `sesion_abierta()`:

  ```sql
  WHERE s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
    AND s.user_id = auth.uid()
  ```

- `tests/base/prueba-acceso-organizacion.py`, P1, N1 y P2: las dos sesiones pertenecen a la misma cuenta.

- N2 solo prueba una llamada sin pase; no prueba un usuario A con el `session_id` abierto del usuario B.

**Regla que se rompe y fallo visible:** si alguien elimina `AND s.user_id = auth.uid()`, P1, N1 y P2 conservan exactamente sus resultados y la CI queda verde. Con claims que combinen la identidad A y una sesión abierta de B, la función respondería verdadero indebidamente.

**Corrección mínima:** crear dos cuentas y comprobar que el `session_id` de la segunda da falso al consultar con la identidad de la primera; agregar también casos de pase autenticado sin `session_id` y con un rol no permitido.

---

### 6. MEDIO — La comprobación acepta explícitamente haber recorrido cero tablas

**Qué está mal:** el script declara que una comprobación vacía debe fallar, pero solo exige que exista una línea `RESUMEN`.

**Evidencia:**

- `scripts/base/comprobar-estructura.py`, docstring:

  > “una comprobación que no recorrió nada no comprueba”

- Su implementación únicamente hace:

  ```python
  if resumen is None:
      return 1
  ```

- `supabase/comprobaciones/estructura.sql` emite siempre un resumen, incluso si:

  ```sql
  (SELECT count(*) FROM tablas)
  ```

  es cero.

**Regla que se rompe y fallo visible:** contra una base sin tablas de negocio, el SQL devuelve `RESUMEN ... 0 tablas ...`, no hay filas `FALLA` y el script termina en verde, contradiciendo su propio contrato.

**Corrección mínima:** emitir y analizar los conteos en campos separados y exigir al menos la tabla mínima esperada o un conteo explícitamente autorizado.

---

### 7. MEDIO — La prueba de la validación no cubre todas las filas que afirma proteger

**Qué está mal:** la prueba dice detectar cada desvío de la especificación, pero varias comprobaciones no tienen mutación negativa y tampoco se verifica que estén presentes las 20 filas esperadas.

**Evidencia:**

- `tests/base/prueba-validacion-organizacion.py`, cabecera:

  > “cada desvío de la spec debe aparecer como FALLA en su fila.”

- `supabase/validaciones/20261123170000_organizacion.sql` produce 20 filas.

- La prueba tiene 16 casos y no comprueba, entre otros, una definición incorrecta de la PK, el tipo/nulabilidad/valor por defecto de `id`, la activación de RLS frente a solo su forzado, ni cambios en `USING` y `WITH CHECK` conservando el resto de la política.

- `tests/base/prueba-validacion-organizacion.py`, `main`, solo exige:

  ```python
  if not filas:
  ```

  No exige el conjunto exacto de nombres de fila.

**Regla que se rompe y fallo visible:** se puede eliminar, por ejemplo, la fila detallada de `constraint organizacion_pkey` o la de `columna id`; las pruebas actuales no detectan que esa comprobación dejó de existir. Una PK sobre otra columna o un `id` con definición incorrecta podría dejar de ser validado sin romper la batería.

**Corrección mínima:** exigir el conjunto exacto de las 20 filas y añadir una mutación negativa por cada definición independiente.

---

### 8. MEDIO — La prueba de estructura tampoco cubre todas las ramas implementadas

**Qué está mal:** afirma tener un positivo y un negativo por regla, pero hay ramas del SQL sin caso específico.

**Evidencia:**

- `tests/base/prueba-comprobacion-estructura.py`, cabecera:

  > “uno que debe fallar por cada regla”

- `supabase/comprobaciones/estructura.sql` contiene:

  ```sql
  SELECT objeto, 'tabla-foranea', ...
  FROM objetos WHERE relkind = 'f'
  ```

  No existe un caso que cree una tabla foránea.

- La detección de roles usa:

  ```sql
  r.rolbypassrls OR r.rolsuper
  ```

  El caso N19 solo activa `BYPASSRLS`; no hay caso separado para `SUPERUSER`.

**Regla que se rompe y fallo visible:** se puede borrar la rama `tabla-foranea` o la mitad `r.rolsuper` y los 27 casos siguen en verde. Por tanto, la batería no demuestra lo que declara.

**Corrección mínima:** añadir negativos independientes para tabla foránea y superusuario, además de los privilegios ausentes del hallazgo 1.

---

### 9. MEDIO — La fuente de verdad se contradice sobre si la comprobación de HU-03.1 sigue pendiente

**Qué está mal:** la cabecera de la especificación mantiene HU-03.1 entre las cuatro comprobaciones pendientes, mientras una nota posterior afirma que ya fue comprobada.

**Evidencia:**

- `openspec/specs/acceso/spec.md`, cabecera:

  > “Quedan cuatro comprobaciones «por comprobar al construir» ... y HU-03.1 (sesión abierta).”

- En el requisito «Separación por organización en la base»:

  > “Comprobado al construir HU-03.1 (23/11/2026)...”

**Regla que se rompe y fallo visible:** quien use la especificación como fuente de verdad obtiene dos estados incompatibles: HU-03.1 está pendiente y completada a la vez. También queda incorrecto el conteo de cuatro comprobaciones.

**Corrección mínima:** actualizar la cabecera y su conteo para reflejar el cierre de HU-03.1.

---

### 10. MEDIO — Sigue sin confirmarse la atomicidad completa de la migración, pese a que depende de varios bloques

**Qué está mal:** la plantilla identifica como obligación confirmar que la herramienta envuelve toda la migración en una transacción, pero el material no aporta esa confirmación.

**Evidencia:**

- `openspec/plantillas/migracion-controlada.sql`, límites:

  > “la migración COMPLETA solo lo es si quien la aplica la envuelve en una transacción. Hay que confirmarlo para la herramienta que se use; mientras no esté confirmado...”

- `supabase/migrations/20261123170000_organizacion.sql` contiene siete bloques `DO` independientes.

- `scripts/base/levantar-base.sh` ejecuta `supabase start`, pero no verifica ni documenta la atomicidad de su ejecutor de migraciones.

**Regla que se rompe y fallo visible:** si el bloque de privilegios o políticas falla después de crear la tabla y las funciones, una herramienta que no envuelva el archivo completo podría dejar una instalación parcial. En particular, el primer bloque puede recrear `es_zona_horaria` antes de que el segundo descubra que `organizacion` ya existía.

**Corrección mínima:** confirmar mediante documentación o prueba ejecutable que la versión fijada de Supabase aplica cada archivo en una sola transacción.

---

### 11. MEDIO — Los scripts no producen mensajes propios en todos sus caminos de error

**Qué está mal:** varios errores de archivos o subprocesos escapan como traceback de Python, pese a la regla explícita de mensajes controlados.

**Evidencia:**

- `CLAUDE.md`, §5:

  > “El mensaje de éxito o de error lo redactamos nosotros.”

- `scripts/base/comprobar-estructura.py`:

  ```python
  COMPROBACION.read_text(encoding="utf-8")
  ```

  sin comprobar existencia ni capturar `OSError`.

- `scripts/base/correr-validaciones.py`, `validar`:

  ```python
  fichero.read_text(encoding="utf-8")
  ```

  con el mismo problema.

- `tests/base/prueba-acceso-organizacion.py`, `entorno()`, no captura `subprocess.TimeoutExpired` de `supabase status`.

**Regla que se rompe y fallo visible:** si falta o no se puede leer `estructura.sql`, el usuario recibe un traceback de `FileNotFoundError`, no un mensaje propio que explique qué archivo falta y cómo proceder.

**Corrección mínima:** capturar los errores de lectura y los timeouts antes de ejecutar el SQL y terminar con un mensaje controlado.

## Sospechas que requieren verificación externa

- **Archivo de seed ausente:** `supabase/config.toml` habilita el seed y declara `sql_paths = ["./seed.sql"]`, pero el diff no contiene `supabase/seed.sql`. Debe verificarse si Supabase CLI 2.109.1 tolera que no exista al ejecutar `supabase start` o `supabase db reset`; si no lo tolera, la CI o la instrucción del README fallarán antes de las pruebas.
- **“Sesión abierta” equiparada a existencia de fila:** `sesion_abierta()` solo comprueba que exista una fila coincidente en `auth.sessions`. El material no demuestra si sesiones vencidas por políticas del servicio permanecen en esa tabla con algún estado o `not_after`. Si permanecen, la función podría responder verdadero cuando el servicio ya no reconoce la sesión como abierta.
