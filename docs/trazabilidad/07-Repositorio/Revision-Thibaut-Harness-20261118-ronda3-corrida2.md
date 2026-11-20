# Revisión adversarial

- Fecha: 2026-11-18 01:41 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<repositorio>/.claude/hooks/datos-que-no-salen.py` · huella `24ca1771466c` · 36966 caracteres
- Archivo: `<repositorio>/.claude/settings.json` · huella `b648efbebfed` · 269 caracteres
- Archivo: `<repositorio>/scripts/instalar-guardarrailes.sh` · huella `3dd9ff8b2eb3` · 6473 caracteres
- Archivo: `<repositorio>/tests/harness/prueba-datos-que-no-salen.py` · huella `f417d701546f` · 26857 caracteres
- Archivo: `<repositorio>/tests/harness/prueba-instalar-guardarrailes.py` · huella `6a9a9a07dc1a` · 10656 caracteres
- Archivo: `<repositorio>/CLAUDE.md` · huella `76276662e1aa` · 6160 caracteres
- Archivo: `<repositorio>/.gitignore` · huella `84c575b45ddc` · 496 caracteres
- Archivo: `<repositorio>/openspec/plantillas/migracion-controlada.sql` · huella `09c96092102a` · 8156 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. CRÍTICO — El modo Claude puede desactivar los hooks y ocultarle por completo el mensaje real del commit

**Qué está mal:** Un comando directo puede fijar `core.hooksPath=/dev/null` y proporcionar el mensaje mediante `/dev/stdin`; el prehook autoriza el comando sin revisar ese mensaje y Git tampoco ejecuta `commit-msg`.

**Evidencia:**
- `.claude/hooks/datos-que-no-salen.py`, `clasificar()`:
  ```python
  if nombre in ("-c", "--config-env") and valor.lower().startswith("user.email"):
      datos["problemas"].append("identidad")
  ```
  Cualquier otro `-c`, incluido `-c core.hooksPath=/dev/null`, queda permitido.
- `mensajes_del_comando()` solo asocia el heredoc con el mensaje cuando el argumento es exactamente `-F -`:
  ```python
  if fichero == "-":
      ...
      textos.append(cuerpos.pop(0))
  ```
  Para `-F /dev/stdin`, intenta leer el stdin del proceso del hook, ya consumido por `json.load()`, no el heredoc que recibirá Git.
- `leer_opciones_del_commit()` también admite `fixup` y `squash` como opciones con valor, pero no revisa el mensaje que generan:
  ```python
  COMMIT_LARGAS_CON_VALOR = {..., "fixup", "squash", ...}
  ```

**Regla que se rompe y fallo observable:** Se rompe `CLAUDE.md`, §2: “El hook ... revisa cada commit” y “Un bloqueo del hook no se rodea”. Un comando como:

```bash
git -c core.hooksPath=/dev/null commit -F /dev/stdin <<'EOF'
mensaje con un secreto o nombre real
EOF
```

puede recibir código 0 del PreToolUse, desactivar `pre-commit` y `commit-msg`, y crear el commit con el texto no revisado. No existe un escenario de prueba para `/dev/stdin`, `core.hooksPath` ni mensajes generados por `--fixup`/`--squash`.

---

### 2. CRÍTICO — Los merges pueden introducir contenido y metadatos sin pasar por la revisión de lo preparado

**Qué está mal:** Solo se instalan `pre-commit` y `commit-msg`; un `git merge` no ejecuta `pre-commit`, y no se instala `pre-merge-commit`.

**Evidencia:**
- `scripts/instalar-guardarrailes.sh`, función `contenido()` y bucles de instalación:
  ```bash
  for NOMBRE in pre-commit commit-msg; do
  ```
- `.claude/hooks/datos-que-no-salen.py`, `analizar_comando()` solo reconoce:
  ```python
  ES_COMMIT = re.compile(r"\bgit\b[^|;&]*\bcommit\b")
  ```
- Cabecera del hook:
  > “Un alias, un script o `make` que hagan el commit por dentro no los ve: esos los detiene el pre-commit de git”.

  Esta afirmación no cubre commits creados por otros comandos de Git.
- `CLAUDE.md`, §8:
  > “Al clonar se instalan los dos (`pre-commit` ... y `commit-msg` ...)”.

**Regla que se rompe y fallo observable:** Se rompe la afirmación de que los hooks de Git cubren los commits hechos desde terminal. Un `git merge --no-ff rama-importada` puede crear un merge que incorpore un fichero con secretos; como máximo, `commit-msg` revisará el mensaje, no el árbol ni la identidad. Un fast-forward puede mover directamente la rama a commits no revisados. Ninguna de las dos suites prueba merges.

---

### 3. CRÍTICO — El instalador puede declarar éxito aunque Git esté configurado para buscar hooks en otro directorio

**Qué está mal:** El instalador escribe y valida `.git/hooks`, pero no comprueba `core.hooksPath`, que puede hacer que Git ignore completamente esos archivos.

**Evidencia:**
- `scripts/instalar-guardarrailes.sh`:
  ```bash
  DIR_HOOKS="$(git -C "$RAIZ" rev-parse --git-path hooks)"
  ```
  No se consulta:
  ```bash
  git config --get core.hooksPath
  ```
- Toda la validación posterior solo inspecciona `$DIR_HOOKS/$NOMBRE`.
- El script concluye:
  ```bash
  echo "Hooks pre-commit y commit-msg instalados exitosamente en $DIR_HOOKS"
  ```
- `tests/harness/prueba-instalar-guardarrailes.py` no configura `core.hooksPath` en ningún escenario.

**Regla que se rompe y fallo observable:** Se rompe el contrato del instalador: “instala ... y verifica que quedaron bien” y “el pre-commit instalado detiene de verdad un `git commit` real”. Con un `core.hooksPath` global o local ya configurado, la instalación puede salir con 0, pero un commit manual con secretos no ejecutará ninguno de los archivos validados.

---

### 4. ALTO — `git -C` revisa el repositorio destino usando la lista privada y el registro del repositorio de origen

**Qué está mal:** Al cambiar el destino con `git -C`, solo cambia `DONDE`; la lista privada y el registro siguen ligados estáticamente al repositorio que contiene el hook.

**Evidencia:**
- Variables globales:
  ```python
  RAIZ = Path(__file__).resolve().parents[2]
  REGISTRO = RAIZ / "docs" / "seguridad" / "registro-de-bloqueos.md"
  FICHERO_RUTA = RAIZ / ".datos-que-no-salen.ruta"
  ```
- En `main()`, modo Claude:
  ```python
  DONDE["directorio"] = str(destino)
  ...
  patrones, autores = leer_lista_privada()
  ```
  `leer_lista_privada()` continúa usando `FICHERO_RUTA` del origen.
- `registrar()` siempre escribe en `REGISTRO` del origen.
- Los escenarios “Claude: commit con -C a otro repositorio...” usan el mismo `TERMINO_PRIVADO` global en ambos repositorios, por lo que no detectan listas distintas.

**Regla que se rompe y fallo observable:** Se rompe la cabecera del hook: “Con `-C <ruta>` se revisa el repositorio de esa ruta”. Si A prohíbe `EmpresaA` y B prohíbe `EmpresaB`, ejecutar desde A `git -C B commit` no buscará `EmpresaB`. Además, un bloqueo de B dejará nombres de ficheros de B en el registro público de A.

---

### 5. ALTO — Cualquier binario opaco puede pasar simplemente usando una extensión de imagen

**Qué está mal:** El código equipara “extensión permitida” con “imagen” sin validar el formato real del archivo.

**Evidencia:**
- `revisar_preparado()`:
  ```python
  if es_binario:
      if extension not in EXTENSIONES_BINARIAS_PERMITIDAS:
          ...
          continue
      for cadena in CADENA_LEGIBLE.findall(...):
          ...
      continue
  ```
- No hay comprobación de firma, MIME ni estructura de PNG/JPEG/GIF/WebP/ICO.
- `CLAUDE.md`, §2:
  > “Binarios: solo entran imágenes... Un PDF, un Excel o un ZIP no entran”.
- Límite declarado:
  > “Texto comprimido ... dentro de una imagen no se ve”.

  Ese riesgo aceptado habla de contenido dentro de una imagen, no de archivos arbitrarios renombrados.

**Regla que se rompe y fallo observable:** Un ZIP cifrado, PDF o ejecutable renombrado a `archivo.png` se considera permitido; si sus cadenas ASCII no coinciden con los patrones, el hook devuelve 0 y publica íntegramente el binario opaco. La prueba “imagen limpia pasa” solo utiliza una cabecera PNG mínima y no prueba una extensión falsa.

---

### 6. ALTO — `.gitattributes` puede evitar la prohibición de binarios no permitidos

**Qué está mal:** La decisión de si un fichero es binario depende de `git diff --numstat`, cuyo resultado puede ser forzado como texto mediante atributos Git; la extensión solo se valida dentro de la rama `es_binario`.

**Evidencia:**
- `ficheros_preparados()`:
  ```python
  salida = git("diff", "--cached", "--numstat", ...)
  ...
  yield ruta, agregadas == "-"
  ```
- `revisar_preparado()`:
  ```python
  if es_binario:
      if extension not in EXTENSIONES_BINARIAS_PERMITIDAS:
          ...
  ```
- No se usa `--no-textconv` en `ficheros_preparados()` ni se valida independientemente el tipo real. `--no-textconv` aparece únicamente en `lineas_agregadas()`.
- No hay ningún escenario con `.gitattributes`.

**Regla que se rompe y fallo observable:** Si se prepara un `.gitattributes` que marque `*.pdf diff`, Git puede reportar el PDF como texto. Entonces nunca se ejecuta la comprobación que rechaza extensiones no permitidas, y el PDF puede entrar pese a la regla explícita de `CLAUDE.md`.

---

### 7. ALTO — La plantilla de migración puede borrar un índice válido de otra tabla

**Qué está mal:** El patrón elimina cualquier índice del esquema con el nombre indicado antes de comprobar que pertenece a la tabla esperada.

**Evidencia:**
- `openspec/plantillas/migracion-controlada.sql`, patrón B:
  ```sql
  DROP INDEX IF EXISTS public.<idx_nombre>;
  CREATE INDEX <idx_nombre> ON public.<tabla> (<columna>);
  ```
- El preámbulo afirma:
  > “Índice, llave o constraint: si existe se elimina; se crea”.
- El post-check solo verifica nombre y esquema:
  ```sql
  WHERE schemaname = 'public' AND indexname = '<idx_nombre>'
  ```

**Regla que se rompe y fallo observable:** Si `public.<idx_nombre>` existe por deriva sobre otra tabla, la migración lo borra y crea uno nuevo sobre `<tabla>`. El bloque termina con `OK`, pero la otra tabla pierde un índice válido. La validación propuesta confirma el nuevo índice, no la desaparición del anterior.

---

### 8. ALTO — El parser permite cambiar la ruta de hooks aunque esa opción equivale a saltarse la protección

**Qué está mal:** La prohibición de saltar hooks se limita sintácticamente a `--no-verify`/`-n`; una configuración de Git en el mismo comando logra el mismo efecto y se acepta.

**Evidencia:**
- `MOTIVOS["sin_hooks"]`:
  ```python
  "`--no-verify` (o `-n`) salta los hooks de git..."
  ```
- `clasificar()` solo considera problemática una configuración de identidad:
  ```python
  if nombre in ("-c", "--config-env") and valor.lower().startswith("user.email"):
      datos["problemas"].append("identidad")
  ```
- No se rechazan `core.hooksPath`, `init.templateDir` ni otras configuraciones relacionadas con hooks.
- `CLAUDE.md`, §2:
  > “Un bloqueo del hook no se rodea”.

**Regla que se rompe y fallo observable:** `git -c core.hooksPath=/dev/null commit ...` no contiene `--no-verify`, pero suprime exactamente los dos controles de Git de los que depende el modo Claude para revisar mensajes finales o generados. Las pruebas de opciones prohibidas cubren `--no-verify`, pero no su equivalente por configuración.

---

### 9. MEDIO — Los correos internacionales con local-part Unicode no se detectan

**Qué está mal:** La regla prohíbe cualquier correo de dominio real, pero el patrón solo acepta caracteres ASCII antes de `@`.

**Evidencia:**
- Patrón `CORREO`:
  ```python
  r"[A-Za-z0-9._%+-]+@(...)"
  ```
- `CLAUDE.md`, §2:
  > “Los correos de ejemplo usan `example.com`... Ningún otro dominio”.
- El límite documentado solo acepta como excepción los dominios sin punto:
  > “`persona@empresa`, sin punto, no se detiene”.
  No declara como riesgo aceptado los local-parts Unicode.
- Las pruebas solo usan local-parts ASCII.

**Regla que se rompe y fallo observable:** Un correo válido bajo SMTPUTF8 como `josé@<dominio-real>` no coincide con `CORREO` y puede quedar en contenido, rutas o mensajes de commit pese a usar un dominio real.

---

### 10. MEDIO — La suite afirma cubrir cada regla, pero no prueba las entradas `re:` de la lista privada

**Qué está mal:** El formato admite expresiones regulares, pero ningún caso positivo o negativo ejercita esa modalidad.

**Evidencia:**
- Cabecera de `tests/harness/prueba-datos-que-no-salen.py`:
  > “un caso positivo y uno negativo por regla”.
- Cabecera del hook:
  > “`re: expresión` — expresión regular”.
- `leer_lista_privada()`:
  ```python
  if termino.startswith("re:"):
      patrones.append(re.compile(...))
  ```
- `nuevo_repo()` en la prueba solo escribe:
  ```python
  TERMINO_PRIVADO + "\n" + TERMINO_CORTO + "\n" + "autor: ..."
  ```
  No incluye ninguna línea `re:`.

**Regla que se rompe y fallo observable:** Una regresión que ignore `re:`, cambie su sensibilidad a mayúsculas o compile incorrectamente puede dejar pasar nombres privados —o bloquear todos los commits— mientras ambas suites siguen en verde. Tampoco hay un escenario para una expresión regular inválida, aunque el código promete quedar ciego y bloquear.
