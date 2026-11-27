# Revisión adversarial

- Fecha: 2026-11-18 01:29 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<repositorio>/.claude/hooks/datos-que-no-salen.py` · huella `6aced5053b80` · 32642 caracteres
- Archivo: `<repositorio>/.claude/settings.json` · huella `b648efbebfed` · 269 caracteres
- Archivo: `<repositorio>/scripts/instalar-guardarrailes.sh` · huella `3dd9ff8b2eb3` · 6473 caracteres
- Archivo: `<repositorio>/tests/harness/prueba-datos-que-no-salen.py` · huella `9b73c7cac5cc` · 23635 caracteres
- Archivo: `<repositorio>/tests/harness/prueba-instalar-guardarrailes.py` · huella `6a9a9a07dc1a` · 10656 caracteres
- Archivo: `<repositorio>/CLAUDE.md` · huella `c5d2b6759975` · 5854 caracteres
- Archivo: `<repositorio>/.gitignore` · huella `7ee8b45abfd2` · 359 caracteres
- Archivo: `<repositorio>/openspec/plantillas/migracion-controlada.sql` · huella `f4d3c9de925c` · 7915 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. CRÍTICO — `--no-verify` está expresamente permitido y permite saltar todas las revisiones efectivas del mensaje

- **Qué está mal:** El modo Claude acepta `git commit --no-verify`, aunque la regla lo prohíbe y Git usa esa opción para omitir tanto `pre-commit` como `commit-msg`.
- **Evidencia:**
  - `CLAUDE.md`, sección **2. Datos que no salen**: “**No se usa `--no-verify`**”.
  - `.claude/hooks/datos-que-no-salen.py`, `COMMIT_LARGAS_SIN_VALOR`: incluye `"no-verify"`.
  - `.claude/hooks/datos-que-no-salen.py`, `leer_opciones_del_commit()`: las opciones de `COMMIT_LARGAS_SIN_VALOR` no generan ningún problema.
  - La misma función reconoce `trailer`, `template`, `fixup` y `squash` como opciones con valor, pero solo revisa `message` y `file`; sus valores no se incorporan a `datos["mensajes"]`.
- **Regla o escenario que se rompe:** Se rompe la regla de que el mensaje del commit pasa por la misma revisión y la prohibición explícita de rodear el hook. Por ejemplo:
  ```bash
  git commit --no-verify -m "Cambio" \
    --trailer "Reviewed-by: persona@<dominio-real>"
  ```
  El PreToolUse revisa únicamente `"Cambio"`, ignora el tráiler y devuelve 0; Git omite ambos hooks y el correo real queda en el commit.
- **Cobertura ausente:** `tests/harness/prueba-datos-que-no-salen.py` no contiene un escenario Claude que exija bloquear `git commit --no-verify`.

---

### 2. CRÍTICO — El hook puede revisar un repositorio distinto del que realmente se va a confirmar

- **Qué está mal:** El analizador acepta `git -C`, `--git-dir` y `--work-tree`, pero toda revisión de índice e identidad se ejecuta incondicionalmente contra `RAIZ`.
- **Evidencia:**
  - `.claude/hooks/datos-que-no-salen.py`, `GIT_GLOBAL_CON_VALOR`: admite `"-C"`, `"--git-dir"` y `"--work-tree"`.
  - `clasificar()`: guarda `-C` solo en `datos["directorio"]`; no rechaza que apunte a otro repositorio.
  - `git_bytes()`: siempre ejecuta `["git", "-C", str(RAIZ), *args]`.
  - `revisar_preparado()` y `revisar_identidad()` usan esa función, por lo que inspeccionan siempre `RAIZ`.
  - `tests/harness/prueba-datos-que-no-salen.py`, caso **“Claude: commit con -C <ruta> y secreto bloquea”**: prepara el secreto en el repositorio raíz, no en el repositorio indicado por `-C`; por tanto no verifica que ambos destinos coincidan.
- **Regla o escenario que se rompe:** Se rompe la afirmación de que el modo Claude revisa lo que está preparado para el commit. Con el índice de `RAIZ` limpio y un secreto preparado en otro clon o worktree:
  ```bash
  git -C ../otro-worktree commit -m "Cambio"
  ```
  el PreToolUse revisa el índice equivocado y deja pasar el comando. Si el destino no tiene los hooks instalados, o se combina con `--no-verify`, el secreto entra sin revisión.

---

### 3. ALTO — La expansión del shell ocurre después del análisis y puede introducir mensajes o rutas no revisados

- **Qué está mal:** El parser bloquea sustituciones `$(...)`, pero no expansión de variables ni globbing, aunque `shlex.split()` no representa los argumentos finales que ejecutará el shell.
- **Evidencia:**
  - `.claude/hooks/datos-que-no-salen.py`, `partir()`: solo marca sustitución para `` `...` ``, `$(`, `<(` y `>(`.
  - `clasificar()` usa `shlex.split(texto, posix=True)`, que conserva literalmente `$MSG` y `*`.
  - `leer_opciones_del_commit()`: consume el token posterior a `-m` como mensaje y deja de comprobar si la expansión producirá argumentos adicionales.
  - Cabecera del hook, sección del modo Claude: afirma que no permite rutas porque preparan ficheros al vuelo.
- **Regla o escenario que se rompe:** 
  - `git commit -m "$MSG"` hace que el hook revise el texto literal `$MSG`, no el mensaje final.
  - `git commit -m *` puede analizarse como un único valor de `-m`, pero el shell puede expandirlo a varios nombres: el primero será el mensaje y los restantes serán rutas que `git commit` prepara al vuelo.
  - Combinado con `--no-verify`, esas expansiones no tienen una segunda revisión y pueden producir un commit con contenido o mensaje privado.
- **Cobertura ausente:** No hay escenarios con `$VARIABLE`, `*`, `?` o clases glob como valor de `-m`.

---

### 4. ALTO — Los nombres reales del autor y del committer quedan fuera de toda revisión

- **Qué está mal:** La identidad solo se valida por correo; el nombre público de autor y committer no se contrasta con la lista privada.
- **Evidencia:**
  - `CLAUDE.md`, sección **2. Datos que no salen**: “No se escriben nombres reales de empresas, personas…”.
  - Cabecera de `.claude/hooks/datos-que-no-salen.py`: la lista privada contiene “nombres reales de empresas, clientes, personas…”.
  - `.claude/hooks/datos-que-no-salen.py`, `revisar_identidad()`: aplica `re.search(r"<([^>]*)>", git("var", variable))` y conserva únicamente el correo.
  - No existe llamada a `revisar_texto()` sobre `GIT_AUTHOR_IDENT`, `GIT_COMMITTER_IDENT`, `%an` o `%cn`.
  - Las pruebas configuran siempre `user.name` como `"Prueba"` y solo ejercitan correos.
- **Regla o escenario que se rompe:** Con un correo permitido y `git config user.name "Nombre Real Privado"`, el commit pasa, pero `git log` publica ese nombre como autor y committer. El fallo se vería en `%an` y `%cn`, aunque `%ae` y `%ce` estén permitidos.

---

### 5. ALTO — Se dejan pasar formatos estándar de secretos que contradicen la regla “ningún secreto”

- **Qué está mal:** La detección de credenciales AWS solo reconoce claves permanentes `AKIA`, no claves temporales estándar `ASIA`, y el patrón genérico tampoco cubre necesariamente `AWS_ACCESS_KEY_ID`.
- **Evidencia:**
  - `CLAUDE.md`, sección **2. Datos que no salen**: “**Ningún secreto entra al repositorio**”.
  - `.claude/hooks/datos-que-no-salen.py`, `SECRETOS`: AWS se limita a `r"\bAKIA[0-9A-Z]{16}\b"`.
  - El patrón genérico exige que el nombre contenga `SECRET`, `PASSWORD`, `SERVICE_ROLE_KEY`, `API_KEY` o `TOKEN`; `AWS_ACCESS_KEY_ID` no contiene ninguna de esas cadenas.
  - `tests/harness/prueba-datos-que-no-salen.py`, `MUESTRAS_DE_SECRETO`: solo prueba el prefijo `AKIA`.
- **Regla o escenario que se rompe:** Una línea como:
  ```text
  AWS_ACCESS_KEY_ID=ASIA<16 caracteres>
  ```
  no coincide con el patrón AWS ni con el patrón genérico, por lo que puede entrar en el repositorio pese a ser una credencial temporal válida.

---

### 6. ALTO — La regla “ningún otro dominio” no cubre correos con dominios sin punto

- **Qué está mal:** El detector solo reconoce dominios con al menos un punto, por lo que omite direcciones internas o válidas con dominio de una sola etiqueta.
- **Evidencia:**
  - `CLAUDE.md`, sección **2. Datos que no salen**: “Los correos de ejemplo usan `example.com`… **Ningún otro dominio**”.
  - `.claude/hooks/datos-que-no-salen.py`, `CORREO`:
    ```python
    r"[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)"
    ```
    El `+` final exige al menos un `.`.
  - Las pruebas solo usan dominios con punto.
- **Regla o escenario que se rompe:** `persona@empresa` no produce hallazgo y puede revelar una organización o identidad interna. El hook devolvería 0 aunque el dominio no sea `example.com`, `example.org` ni `example.net`.

---

### 7. MEDIO — La protección de ficheros `.env` depende de mayúsculas y de un conjunto estrecho de nombres

- **Qué está mal:** `.ENV` y variantes con distinta capitalización no se consideran ficheros `.env`, y `.gitignore` tampoco las excluye.
- **Evidencia:**
  - `.claude/hooks/datos-que-no-salen.py`, `revisar_preparado()`:
    ```python
    if (base == ".env" or base.startswith(".env.")) and base != ".env.example":
    ```
    La comparación es sensible a mayúsculas.
  - `.gitignore`: solo contiene `.env`, `.env.*` y `!.env.example`.
  - Las pruebas solo cubren `.env`, `.env.local` y `.env.example`.
- **Regla o escenario que se rompe:** En un sistema sensible a mayúsculas, un fichero `.ENV` puede prepararse y confirmarse. Si contiene un valor que no coincide con las formas limitadas de `SECRETOS`, ninguna de las dos barreras lo detiene.

---

### 8. MEDIO — La plantilla de validación contradice su propia exigencia de dos filas por objeto

- **Qué está mal:** La plantilla declara que cada objeto debe tener una fila de existencia y otra de definición, pero la constraint solo tiene la segunda.
- **Evidencia:**
  - `openspec/plantillas/migracion-controlada.sql`, sección **CIERRE**:
    > “Por cada objeto van dos filas: que está, y que está HECHO como se pidió”.
  - En el CTE `checks`:
    - tabla: pasos 1 y 2;
    - índice: pasos 3 y 4;
    - constraint: únicamente paso 5, `definición de la constraint`.
  - `CLAUDE.md`, sección **5. Migraciones controladas**: exige comprobar que el objeto existe y que está hecho como dice la spec.
- **Regla o escenario que se rompe:** Una validación copiada literalmente de la plantilla no tendrá la comprobación 1 a 1 de existencia de la constraint que la propia plantilla exige. Su ausencia solo aparecerá indirectamente como una definición nula, no como el control separado prometido.

---

### 9. MEDIO — Las pruebas usan el mecanismo que la regla de proceso prohíbe de forma absoluta

- **Qué está mal:** Los harness crean commits mediante `--no-verify`, aunque `CLAUDE.md` declara que un bloqueo nunca se rodea y no establece una excepción para fixtures.
- **Evidencia:**
  - `CLAUDE.md`, sección **2**: “No se usa `--no-verify`”.
  - `tests/harness/prueba-datos-que-no-salen.py`, `commit_previo()`:
    ```python
    sh(repo, "-c", "user.email=" + autor, "commit", "-q", "--no-verify", "-m", mensaje)
    ```
  - `tests/harness/prueba-instalar-guardarrailes.py`, escenario de amend:
    ```python
    commit(r, "previo.md", "Commit previo.\n", "--no-verify", autor=AUTOR_AJENO)
    ```
- **Regla o escenario que se rompe:** La suite normaliza exactamente el bypass que el proceso dice no usar. Además, no verifica que el modo Claude rechace esa misma opción, lo que contribuye a que el hallazgo crítico 1 quede sin detectar.

## Sospecha separada

- **Posible exposición de datos privados por stderr:** `revisar_texto()` devuelve el término privado completo como `pista`, y `bloquear()` imprime tanto esa pista como la ruta original. En modo PreToolUse, la configuración de `.claude/settings.json` ejecuta este hook dentro de Claude Code. El material suministrado no permite demostrar si ese stderr se envía al modelo, se conserva en telemetría o solo se muestra localmente; debe verificarse el comportamiento real de Claude Code. Si se reenvía, nombres privados y rutas que deliberadamente se ocultan del registro público sí saldrían por el canal del hook.
