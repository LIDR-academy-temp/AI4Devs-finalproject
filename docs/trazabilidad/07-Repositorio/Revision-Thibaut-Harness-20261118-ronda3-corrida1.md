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

### 1. CRÍTICO — Un alias definido en el propio comando permite omitir tanto la revisión de Claude como los hooks de Git

- **Qué está mal:** La combinación de un alias de Git y `core.hooksPath` evade todas las capas del guardarraíl.
- **Evidencia:**
  - `.claude/hooks/datos-que-no-salen.py`, `clasificar()`: solo devuelve `"commit"` cuando `palabras[i] == "commit"`; cualquier alias termina como `"otra"`.
  - `.claude/hooks/datos-que-no-salen.py`, tratamiento de `-c`: únicamente marca identidad si `valor.lower().startswith("user.email")`; no prohíbe `core.hooksPath` ni definiciones `alias.*`.
  - Cabecera del mismo archivo, límite conocido: “Un alias [...] no los ve: esos los detiene el pre-commit de git”.
- **Regla que se rompe y fallo observable:** Un comando como:
  ```bash
  git -c alias.publicar=commit -c core.hooksPath=/dev/null publicar -m "Para EmpresaReal"
  ```
  se clasifica como no-commit y el PreToolUse sale con 0; Git expande el alias a `commit`, pero no ejecuta `pre-commit` ni `commit-msg`. El mensaje, los metadatos y cualquier secreto preparado pueden entrar. Esto contradice expresamente la afirmación de que los alias quedan cubiertos por el pre-commit.

---

### 2. ALTO — Cualquier binario puede entrar si se renombra con extensión de imagen

- **Qué está mal:** El código decide que un binario es una imagen únicamente por su extensión, sin validar su formato.
- **Evidencia:**
  - `.claude/hooks/datos-que-no-salen.py`, `revisar_preparado()`:
    ```python
    if extension not in EXTENSIONES_BINARIAS_PERMITIDAS:
        ...
    for cadena in CADENA_LEGIBLE.findall(git_bytes("cat-file", "blob", ":0:" + ruta)):
    ```
  - `tests/harness/prueba-datos-que-no-salen.py`, `CABECERA_PNG` y caso `"imagen limpia pasa"`: no se intenta decodificar ni verificar que el fichero sea una imagen válida.
  - `CLAUDE.md`, sección 2: “solo entran imágenes”; “Un PDF, un Excel o un ZIP no entran”.
- **Regla que se rompe y fallo observable:** Un ZIP, base de datos o documento cifrado llamado `datos.png` pasa como binario permitido si no contiene cadenas ASCII detectables. El commit entra aunque el contenido no sea una imagen, contradiciendo la regla de tipos permitidos.

---

### 3. ALTO — La propia suite demuestra que secretos, correos y términos privados se evaden fragmentándolos

- **Qué está mal:** La revisión busca patrones contiguos en cada línea, pero no detecta valores reconstruidos mediante concatenación.
- **Evidencia:**
  - `.claude/hooks/datos-que-no-salen.py`, `revisar_preparado()`: llama a `revisar_texto(texto, patrones)` una línea agregada a la vez.
  - `tests/harness/prueba-datos-que-no-salen.py`, cabecera:
    > “Los valores con forma de secreto, los correos y el término privado se arman por partes [...] para que este fichero no contenga ninguno y el propio hook lo deje pasar.”
  - En el mismo archivo:
    ```python
    SECRETO = "sk-" + "a1B2c3D4e5" * 3
    TERMINO_PRIVADO = "Empresa" + "Ficticia"
    CORREO_REAL = "persona" + ARROBA + "dominio-inventado.io"
    ```
- **Regla que se rompe y fallo observable:** Código real como:
  ```python
  token = "sk-" + "parte_real_del_secreto"
  cliente = "Empresa" + "Real"
  ```
  puede reconstruir exactamente los datos prohibidos al ejecutarse, pero el hook deja pasar el commit. No está declarado como riesgo aceptado y contradice “Ningún secreto entra al repositorio”.

---

### 4. ALTO — La detección de variables secretas omite formatos habituales como JSON y comillas invertidas

- **Qué está mal:** El patrón para asignaciones solo admite una clave sin comillas y valores precedidos opcionalmente por `'` o `"`.
- **Evidencia:**
  - `.claude/hooks/datos-que-no-salen.py`, categoría `"valor asignado a una variable secreta"`:
    ```python
    r"...(SECRET|PASSWORD|SERVICE_ROLE_KEY|API_KEY|TOKEN)..."
    r"\s*[=:]\s*[\"']?[A-Za-z0-9_\-./+]{16,}"
    ```
  - `tests/harness/prueba-datos-que-no-salen.py`, `MUESTRAS_DE_SECRETO`: solo prueba la forma:
    ```python
    SERVICE_ROLE_KEY=<20 caracteres>
    ```
- **Regla que se rompe y fallo observable:** Estas formas no coinciden con el patrón y pueden pasar:
  ```json
  {"API_KEY":"<16 caracteres>"}
  ```
  ```javascript
  const API_KEY = `<16 caracteres>`;
  ```
  Si el valor carece de uno de los prefijos específicos restantes, el secreto entra pese a estar asignado explícitamente a `API_KEY`.

---

### 5. ALTO — La desaparición de uno solo de los hooks deja media revisión abierta sin aviso

- **Qué está mal:** `pre-commit` y `commit-msg` no comprueban que el otro siga instalado; la ausencia de cualquiera produce un fallo silencioso.
- **Evidencia:**
  - `scripts/instalar-guardarrailes.sh`, `contenido()`: instala dos ejecutables independientes.
  - `.claude/hooks/datos-que-no-salen.py`, `main()`:
    - modo `pre-commit`: revisa identidad y contenido preparado, pero no el mensaje;
    - modo `commit-msg`: revisa únicamente el mensaje.
  - `tests/harness/prueba-instalar-guardarrailes.py`: el caso de desaparición elimina simultáneamente el script de revisión y `pre-commit`; no prueba la desaparición aislada de `pre-commit` o `commit-msg` mientras el script común sigue presente.
- **Regla que se rompe y fallo observable:** Si desaparece solo `.git/hooks/pre-commit`, un fichero preparado con un secreto y un mensaje limpio entra porque `commit-msg` pasa. Si desaparece solo `commit-msg`, un mensaje con datos privados entra después de que `pre-commit` declare el contenido limpio. Se rompe la afirmación de que “el hook revisa cada commit” y el principio de bloqueo cuando el control queda ciego.

---

### 6. MEDIO — `--fixup` y `--squash` reutilizan mensajes sin que el modo Claude los revise

- **Qué está mal:** El parser reconoce estas opciones como portadoras de valor, pero no recupera ni marca como reutilizado el mensaje que Git generará.
- **Evidencia:**
  - `.claude/hooks/datos-que-no-salen.py`:
    ```python
    COMMIT_LARGAS_CON_VALOR = {
        ..., "fixup", "squash", ...
    }
    ```
  - `leer_opciones_del_commit()`: solo agrega mensajes para `"message"` y `"trailer"`, ficheros para `"file"` y problemas para `reuse-message`, `reedit-message` o `template`; no procesa `fixup` ni `squash`.
  - Cabecera del hook: “El mensaje se revisa donde venga”.
- **Regla que se rompe y fallo observable:** `git commit --fixup=amend:HEAD` puede copiar el mensaje del commit objetivo, pero `mensajes_del_comando()` recibe una lista vacía y el PreToolUse informa “sin hallazgos”. Con `commit-msg` presente habrá una segunda oportunidad; sin él, el mensaje reutilizado entra sin revisión.

---

### 7. MEDIO — El correo especial de coautoría está permitido globalmente, no solo en el pie del commit

- **Qué está mal:** La excepción destinada al pie `Co-Authored-By` se aplica a cualquier contenido y ruta.
- **Evidencia:**
  - `.claude/hooks/datos-que-no-salen.py`:
    ```python
    # Direcciones exactas ... la del pie «Co-Authored-By»
    CORREOS_PERMITIDOS = {"noreply" + "@" + "anthropic.com"}
    ```
  - `revisar_texto()` consulta `CORREOS_PERMITIDOS` sin recibir contexto de mensaje.
  - `tests/harness/prueba-datos-que-no-salen.py`, caso:
    ```python
    caso("la dirección exacta permitida pasa", 0, correr(r))
    ```
    donde el correo está dentro de `a.md`, no en un pie de coautoría.
  - `CLAUDE.md`, sección 2: “Los correos de ejemplo usan `example.com` [...] Ningún otro dominio”.
- **Regla que se rompe y fallo observable:** Ese correo puede aparecer en documentación, código, datos o incluso rutas y el commit pasa. La excepción implementada es más amplia que su justificación y contradice la regla global de dominios.

---

### 8. MEDIO — Los correos SMTPUTF8 o con local-part citado no se detectan

- **Qué está mal:** La expresión de correo exige un local-part ASCII sin comillas, aunque la regla prohíbe todos los correos de dominios reales.
- **Evidencia:**
  - `.claude/hooks/datos-que-no-salen.py`, `CORREO`:
    ```python
    r"[A-Za-z0-9._%+-]+@(...)"
    ```
  - La cabecera solo declara como límite conocido los dominios sin punto; no declara esta exclusión.
  - `CLAUDE.md`, sección 2: “Ningún otro dominio”.
- **Regla que se rompe y fallo observable:** Direcciones válidas como `用户@<dominio-real>` o una dirección con local-part citado pueden entrar sin hallazgo. El dominio real queda expuesto aunque no corresponda al único límite aceptado y documentado.

---

### 9. MEDIO — El registro afirma que cada fila representa un commit, pero escribe una fila por hallazgo

- **Qué está mal:** La semántica declarada del registro contradice la implementación y sobredimensiona el número de commits bloqueados.
- **Evidencia:**
  - Cabecera de `.claude/hooks/datos-que-no-salen.py`:
    > “Cada bloqueo deja una línea fechada”.
  - `registrar()`:
    ```python
    """Deja una línea por hallazgo."""
    for categoria, fichero, numero, _ in hallazgos:
        f.write(...)
    ```
  - Encabezado que crea `registrar()`:
    > “Cada fila es un commit que el hook detuvo.”
- **Regla que se rompe y fallo observable:** Un único intento con tres hallazgos produce tres filas que el propio registro define como tres commits detenidos. El registro deja de servir como trazabilidad fiable de bloqueos.

## Sospecha separada

- El parser solo reconoce opciones globales con valor cuando el token coincide exactamente con `-C` o `-c`. Si la versión de Git utilizada acepta formas adjuntas como `-C/ruta` o `-cclave=valor`, `clasificar()` las saltaría como opciones desconocidas y podría revisar el repositorio o la identidad equivocados. No lo elevo a hallazgo sin verificar ese comportamiento contra las versiones de Git soportadas; no hay casos correspondientes en las pruebas.
