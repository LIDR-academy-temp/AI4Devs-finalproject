# Revisión adversarial

- Fecha: 2026-11-18 00:50 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<repositorio>/.claude/hooks/datos-que-no-salen.py` · huella `a611bc9a389c` · 11735 caracteres
- Archivo: `<repositorio>/.claude/settings.json` · huella `b648efbebfed` · 269 caracteres
- Archivo: `<repositorio>/scripts/instalar-guardarrailes.sh` · huella `8d5526f65e58` · 4410 caracteres
- Archivo: `<repositorio>/tests/harness/prueba-datos-que-no-salen.py` · huella `71db39b1c097` · 9426 caracteres
- Archivo: `<repositorio>/tests/harness/prueba-instalar-guardarrailes.py` · huella `d0c4b41ba2d1` · 7590 caracteres
- Archivo: `<repositorio>/CLAUDE.md` · huella `ad565e3c06e7` · 4766 caracteres
- Archivo: `<repositorio>/.gitignore` · huella `7ee8b45abfd2` · 359 caracteres
- Archivo: `<repositorio>/openspec/plantillas/migracion-controlada.sql` · huella `39b2feb1c5a7` · 4659 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. CRÍTICO — Los secretos y datos privados pueden entrar en el mensaje del commit sin ninguna revisión

- **Evidencia:**  
  - `datos-que-no-salen.py`, cabecera: «impide que secretos, nombres reales, correos [...] entren en un commit».  
  - `revisar()` solo examina `git diff --cached`, nombres de archivos y correos de autor/committer.  
  - No existe un hook `commit-msg` ni lectura del mensaje pasado con `-m`, `-F` o mediante editor.
- **Regla o escenario roto:** El repositorio es público y los metadatos del commit también lo son.
- **Cómo se vería el fallo:** Un commit limpio como `git commit -m "Token sk-... de EmpresaReal; contacto persona@<dominio-real>"` pasa ambos controles y publica todos esos datos.

---

### 2. CRÍTICO — Una línea añadida que empiece por `++ ` desactiva el análisis del resto del bloque

- **Evidencia:** `datos-que-no-salen.py`, `lineas_agregadas()`:
  ```python
  if linea.startswith("+++ "):
      fichero = linea[6:] if linea.startswith("+++ b/") else None
  ...
  elif linea.startswith("+") and fichero:
  ```
  Una línea de contenido `++ comentario` aparece en el diff como `+++ comentario` y se confunde con una cabecera.
- **Regla o escenario roto:** Deben revisarse todas las líneas añadidas al commit.
- **Cómo se vería el fallo:** Este archivo pasa sin detectar el secreto de la segunda línea:
  ```text
  ++ comentario
  sk-<30 caracteres>  [cadena neutralizada en la copia del repositorio]
  ```
  La primera línea pone `fichero = None` y las siguientes líneas del mismo bloque dejan de revisarse.

---

### 3. CRÍTICO — Los archivos binarios pueden contener secretos o datos reales y no se inspeccionan ni se rechazan

- **Evidencia:** `lineas_agregadas()` solo procesa líneas `+` producidas por:
  ```python
  git("diff", "--cached", "-U0", "--no-color", "--diff-filter=ACMR")
  ```
  Git normalmente representa un binario como `Binary files ... differ`, sin exponer su contenido. No existe una regla que bloquee binarios no inspeccionables.
- **Regla o escenario roto:** «Ningún secreto entra al repositorio» y la afirmación de que el hook revisa lo preparado para commit.
- **Cómo se vería el fallo:** Un PDF, ZIP, imagen o archivo con un byte NUL que contenga una clave, correo o nombre privado pasa porque no genera líneas analizables. Ninguna prueba cubre binarios.

---

### 4. CRÍTICO — Los nombres de archivos no se contrastan con la lista privada y el propio registro puede publicarlos

- **Evidencia:**  
  - En `revisar()`, los nombres solo se usan para detectar `.env`:
    ```python
    if (base == ".env" or base.startswith(".env.")) ...
    ```
  - Los patrones privados se aplican únicamente a `texto` dentro de `lineas_agregadas()`.
  - `registrar()` escribe el nombre completo sin sanitizar:
    ```python
    f.write("| ... | `%s` | ..." % fichero)
    ```
- **Regla o escenario roto:** `CLAUDE.md`, sección 2: «No se escriben nombres reales de empresas, personas, contratos ni códigos de proyecto»; la ruta también forma parte del repositorio público.
- **Cómo se vería el fallo:** `EmpresaReal/ContratoSecreto.md` con contenido limpio pasa. Peor aún, si su contenido produce otro hallazgo, el bloqueo escribe esa ruta privada en `docs/seguridad/registro-de-bloqueos.md`, que luego se pretende publicar.

---

### 5. ALTO — El modo Claude permite preparar contenido después de la revisión y antes del commit

- **Evidencia:** `PREPARA_EN_EL_MISMO_COMANDO` solo reconoce `git add`, `commit -a` y `commit --all`:
  ```python
  r"\bgit\b[^|;&]*\badd\b|...-a...|...--all\b"
  ```
  No reconoce otras operaciones que alteran el índice.
- **Regla o escenario roto:** La cabecera afirma que detiene comandos que preparan y hacen el commit juntos porque no puede revisar el estado definitivo.
- **Cómo se vería el fallo:** Un comando como:
  ```bash
  git apply --cached parche-con-secreto.diff && git commit -m "x"
  ```
  revisa el índice anterior, pasa, luego introduce el secreto y lo confirma. También quedan fuera `git update-index`, `git commit --include`, modos interactivos y pathspecs. Solo un pre-commit instalado de forma independiente podría salvar algunos casos; el modo Claude por sí mismo no cumple lo declarado.

---

### 6. ALTO — Hay rutas y cambios de tipo que quedan totalmente fuera de `lineas_agregadas()`

- **Evidencia:**  
  - Una cabecera citada por Git, por ejemplo `+++ "b/ruta\303\261..."`, entra en:
    ```python
    if linea.startswith("+++ "):
        fichero = ... if linea.startswith("+++ b/") else None
    ```
    y deja `fichero = None`.
  - Ambos comandos `git diff` usan `--diff-filter=ACMR`, que excluye el estado `T` de cambio de tipo.
- **Regla o escenario roto:** Todo contenido preparado debe revisarse.
- **Cómo se vería el fallo:** Archivos con nombres que Git cita —por caracteres no ASCII, tabuladores o saltos de línea— pueden quedar sin analizar. También puede pasar un cambio de archivo regular a enlace simbólico cuyo destino contenga información privada, porque el estado `T` no se procesa.

---

### 7. ALTO — Se permiten explícitamente dominios reales pese a que la regla exige `example.com`

- **Evidencia:**  
  - `CLAUDE.md`, sección 2: «Los correos de ejemplo usan `example.com`».
  - `datos-que-no-salen.py`, `DOMINIOS_DE_EJEMPLO`:
    ```python
    "anthropic.com", "users.noreply.github.com", "ejemplo.com"
    ```
- **Regla o escenario roto:** Los correos de dominios reales deben bloquearse.
- **Cómo se vería el fallo:** `empleado@<dominio de un proveedor real>` o cualquier dirección bajo `users.noreply.github.com` pasa, aunque son dominios reales. Las pruebas solo cubren `example.com` y un dominio inventado, por lo que no detectan esta contradicción.

---

### 8. ALTO — `.env.example` puede contener valores aunque la regla diga que solo lleva nombres

- **Evidencia:**  
  - `CLAUDE.md`, sección 2: «`.env.example` lleva solo los nombres, sin valores».
  - `revisar()` excluye por completo el nombre exacto `.env.example` de la regla de archivos `.env`.
  - La única prueba usa valores vacíos:
    ```python
    "SUPABASE_URL=\nPUERTO=3000\n"
    ```
- **Regla o escenario roto:** La plantilla no debe incluir valores.
- **Cómo se vería el fallo:** Líneas como estas pasan porque no coinciden con las formas limitadas de `SECRETOS`:
  ```env
  SUPABASE_URL=https://proyecto-real.supabase.co
  DATABASE_HOST=servidor-cliente
  PASSWORD=corta
  ```
  El escenario negativo «`.env.example` con un valor no vacío debe bloquearse» no existe.

---

### 9. ALTO — Los términos declarados como literales no se buscan literalmente

- **Evidencia:** La cabecera define:
  ```text
  término              texto literal, sin distinguir mayúsculas
  ```
  pero `leer_lista_privada()` añade límites alfanuméricos:
  ```python
  r"(?<![A-Za-z0-9])" + re.escape(termino) + r"(?![A-Za-z0-9])"
  ```
- **Regla o escenario roto:** Un término literal debería encontrarse allí donde aparezca como secuencia literal.
- **Cómo se vería el fallo:** Si la lista contiene `Acme`, valores como `AcmeCorp`, `clienteAcme` o `ACME2025` pasan. Esto es especialmente peligroso para identificadores, códigos y nombres concatenados.

---

### 10. ALTO — La plantilla de migración no puede garantizar que todos los errores tengan texto propio

- **Evidencia:** `openspec/plantillas/migracion-controlada.sql` declara:
  ```text
  El mensaje (éxito o error) SIEMPRE lo redactamos nosotros
  ```
  pero ejecuta directamente:
  ```sql
  CREATE TABLE ...
  CREATE INDEX ...
  ALTER TABLE ... ADD CONSTRAINT ...
  ```
  sin capturar excepciones del motor.
- **Regla o escenario roto:** La plantilla promete que nunca será el motor quien decida el mensaje.
- **Cómo se vería el fallo:** Errores de permisos, columnas inexistentes, funciones ausentes, dependencias o sintaxis salen con mensajes de PostgreSQL. Además, dos ejecuciones concurrentes pueden pasar ambas el pre-check de tabla; una de ellas fallará después con `duplicate_relation` emitido por el motor.

---

### 11. ALTO — Las validaciones solo comprueban existencia, no que la estructura creada sea correcta

- **Evidencia:** La validación de ejemplo compara únicamente conteos por nombre:
  ```sql
  SELECT count(*) FROM pg_indexes
  WHERE schemaname = 'public' AND indexname = '<idx_nombre>'
  ```
  y lo mismo para tablas. Los post-checks siguen el mismo patrón.
- **Regla o escenario roto:** `CLAUDE.md` exige una validación 1 a 1 que demuestre que la migración «quedó bien», no solo que existe un objeto con ese nombre.
- **Cómo se vería el fallo:** Un índice creado sobre la columna equivocada, una tabla con tipos erróneos o un constraint con una definición incorrecta produce `encontrado = 1` y estado `OK`.

---

### 12. ALTO — El patrón de eliminar y recrear índices o constraints se declara “sin riesgo” sin garantizar una transacción

- **Evidencia:** La plantilla afirma:
  ```text
  se eliminan y se vuelven a crear sin riesgo
  ```
  y ejecuta `DROP` y `CREATE` como sentencias separadas, sin `BEGIN`, `COMMIT` ni manejo de error que asegure atomicidad.
- **Regla o escenario roto:** Una migración controlada no debe dejar el esquema en un estado intermedio o menos protegido.
- **Cómo se vería el fallo:** Si el `DROP CONSTRAINT` se confirma y el `ADD CONSTRAINT` falla, queda eliminada una regla de integridad. En ejecución no transaccional también pueden entrar escrituras inválidas entre ambas operaciones. La plantilla supone que el ejecutor envolverá todo en una transacción, pero no lo garantiza.

---

### 13. ALTO — El instalador puede sobrescribir un hook ajeno con solo encontrar una cadena de texto

- **Evidencia:** `scripts/instalar-guardarrailes.sh` decide que un hook es suyo únicamente mediante:
  ```bash
  grep -qF "$MARCA" "$DESTINO"
  ```
  y después lo reemplaza completamente con `cat > "$DESTINO"`.
- **Regla o escenario roto:** El comentario promete: «uno ajeno no se pisa».
- **Cómo se vería el fallo:** Un pre-commit compuesto que ejecute este guardarraíl junto con lint, tests u otros controles e incluya la marca será considerado propio y sobrescrito, eliminando los demás controles. La prueba del “hook ajeno” usa uno sin la marca y no cubre este caso.

---

### 14. MEDIO — No todos los bloqueos dejan registro, pese a la afirmación explícita

- **Evidencia:** La cabecera afirma: «Cada bloqueo deja una línea fechada». Sin embargo, `main()` sale directamente sin llamar a `registrar()` cuando:
  - el JSON es inválido;
  - `PREPARA_EN_EL_MISMO_COMANDO` coincide;
  - `CAMBIA_LA_IDENTIDAD` coincide;
  - una llamada a Git lanza `RuntimeError`.
  
  Además, `bloquear()` continúa aunque `registrar()` falle por `OSError`.
- **Regla o escenario roto:** La trazabilidad de todos los bloqueos.
- **Cómo se vería el fallo:** `git add . && git commit`, `git commit --author=...` o un fallo de Git quedan bloqueados, pero `registro-de-bloqueos.md` no recibe ninguna línea.

---

### 15. MEDIO — La suite afirma cubrir cada regla con positivo y negativo, pero no lo hace

- **Evidencia:** `prueba-datos-que-no-salen.py`, docstring:
  ```text
  un caso positivo y uno negativo por regla
  ```
  Sin embargo:
  - `SECRETOS` contiene siete categorías y solo se prueba `sk-`;
  - no hay casos de JWT, clave privada, GitHub, AWS, `re_` ni asignación secreta;
  - no se prueban mensajes de commit;
  - no se prueban binarios, rutas citadas, cambios de tipo ni nombres privados en rutas;
  - no se prueba `.env.example` con valores;
  - no se prueba un término privado concatenado;
  - no se prueba un committer distinto del autor;
  - no se prueban dominios reales incluidos en `DOMINIOS_DE_EJEMPLO`.
- **Regla o escenario roto:** `CLAUDE.md`, sección 4, exige un caso que pase y otro que se rechace para cada pieza.
- **Cómo se vería el fallo:** Todas las pruebas actuales pueden quedar en verde mientras siguen funcionando los bypasses anteriores; por tanto, el mensaje final «bloquea lo que debe» no está sustentado por los escenarios ejecutados.
