# Revisión adversarial

- Fecha: 2026-11-19 14:37 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-temporal>/encargo-PR-trazabilidad-ronda3.md` · huella `51db8917fcc9` · 1989 caracteres
- Archivo: `docs/revisiones/docs-trazabilidad-d91-ronda2-respuesta.md` · huella `8deb8046621a` · 8647 caracteres
- Archivo: `<espacio-temporal>/diff-b062c63-decisiones.diff` · huella `9982c690954f` · 6700 caracteres
- Archivo: `readme.md` · huella `c2cef6ece14f` · 46090 caracteres
- Archivo: `prompts.md` · huella `cdf355919925` · 22036 caracteres
- Archivo: `CLAUDE.md` · huella `83a7206a424f` · 8883 caracteres
- Archivo: `.github/workflows/ci.yml` · huella `804672f2630e` · 2538 caracteres
- Archivo: `scripts/verificar-referencias.py` · huella `71f15c852c95` · 19924 caracteres
- Archivo: `scripts/referencias.txt` · huella `aa436fb0d585` · 2685 caracteres
- Archivo: `tests/harness/prueba-verificar-referencias.py` · huella `4880dc96bfa5` · 14870 caracteres
- Archivo: `docs/trazabilidad/README.md` · huella `f65827b509fd` · 18997 caracteres
- Archivo: `openspec/specs/acceso/spec.md` · huella `dae5e932285d` · 33662 caracteres
- Archivo: `openspec/specs/aviso-inicio/spec.md` · huella `c4e663444f56` · 27307 caracteres
- Archivo: `openspec/specs/no-reportados/spec.md` · huella `e838acab6f47` · 29185 caracteres
- Archivo: `docs/trazabilidad/03-PRD/PRD-MVP-Controlador-de-Tiempo-20261119-v8.md` · huella `660bdceba523` · 38562 caracteres
- Archivo: `docs/trazabilidad/05-Tickets/Recorte-Entrega-20261119-v4.md` · huella `c6d68d085af4` · 8225 caracteres
- Archivo: `docs/trazabilidad/05-Tickets/Tickets-MVP-Controlador-de-Tiempo-20261118-v4.md` · huella `837c1d666419` · 40362 caracteres
- Archivo: `docs/trazabilidad/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` · huella `84e92c472ace` · 38894 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. ALTO — El verificador acepta como válida una referencia que salga del repositorio mediante `..`

- **Qué está mal:** La comprobación de rutas permite resolver destinos externos al repositorio, aunque declara comprobar que el archivo exista dentro de él.
- **Evidencia:**
  - `scripts/verificar-referencias.py`, función `resuelve`:
    ```python
    for base in (doc.parent, raiz, raiz / "docs" / "trazabilidad"):
        if (base / rel).exists():
            return True
    ```
    No normaliza el destino ni comprueba que quede contenido bajo `raiz`.
  - Cabecera del mismo archivo, regla 1: los destinos se buscan «desde la raíz o dentro de `docs/trazabilidad/`».
  - `CLAUDE.md` §7: «esa cita tiene que existir en este repositorio».
- **Regla que se rompe y fallo observable:** Un enlace como `[origen](../../../../../../../../etc/passwd)` puede pasar en el ejecutor Linux porque el archivo existe en el sistema anfitrión, aunque no pertenece al repositorio. La CI declararía íntegra una referencia cuyo destino no está versionado ni es reproducible.

### 2. ALTO — La excepción de D-91 excluye precisamente las revisiones obligatorias, sin una decisión que modifique la regla “todo lo que se sube”

- **Qué está mal:** D-91 exige que toda cita subida exista, pero las revisiones adversariales obligatorias quedan fuera del verificador, no solo las “corridas” auxiliares.
- **Evidencia:**
  - `CLAUDE.md` §7:
    > «Todo lo que se sube cita su origen [...] y esa cita tiene que existir en este repositorio».
  - `CLAUDE.md` §6 exige guardar la revisión como:
    ```text
    docs/revisiones/<rama>-ronda<N>.md
    ```
  - `scripts/referencias.txt`, `[vivos]`, solo incluye:
    ```text
    docs/revisiones/*-respuesta.md
    ```
  - `scripts/verificar-referencias.py`, “Lo que NO revisa”, solo presenta la excepción como:
    ```text
    docs/revisiones/*-corrida*.md
    ```
  - `docs/revisiones/docs-trazabilidad-d91-ronda2-respuesta.md`, hallazgo 5, justifica dejar fuera las corridas, pero ninguna de D-96 a D-99 modifica D-91 para crear esa excepción.
- **Regla que se rompe y fallo observable:** Una referencia rota en la revisión canónica `docs/revisiones/rama-ronda1.md` pasa la CI. Además, la implementación excluye más archivos de los que declara: también excluye revisiones sin `-corrida`, pese a que son artefactos obligatorios de cada PR.

### 3. ALTO — D-99 no está incorporada como dependencia ni puerta de entrada al tramo 8

- **Qué está mal:** D-99 exige producir el PRD v9 y los tickets v5 antes del tramo 8, pero el plan permite comenzar ese tramo sin ninguno de los dos.
- **Evidencia:**
  - `diff-b062c63-decisiones.diff`, D-99:
    > «Los tickets v5 y el PRD v9 se hacen antes del tramo 8».
  - `docs/trazabilidad/05-Tickets/Recorte-Entrega-20261119-v4.md`, §4:
    ```text
    Tramo 8 | HU-06.3, HU-07.3
    ```
    No contiene ticket, dependencia ni comprobación para PRD v9 o tickets v5.
  - `docs/trazabilidad/05-Tickets/Tickets-MVP-Controlador-de-Tiempo-20261118-v4.md`:
    - `HU-06.3` depende de `HU-06.2, HU-02.2, HU-02.4`.
    - `HU-07.3` depende de `HU-07.2, HU-02.4`.
  - El propio encabezado de `Recorte-Entrega-20261119-v4.md` deja la actualización para después:
    > «Cuando se apruebe la especificación inicial (H-1) y los tickets pasen a su versión 5, lo que aquí se ajusta entra allí».
- **Regla que se rompe y fallo observable:** Todas las dependencias técnicas del tramo 8 pueden estar satisfechas mientras siguen vigentes PRD v8 y tickets v4. Se podría construir HU-06.3 y HU-07.3 antes de incorporar los arrastres que D-99 declaró obligatorios, sin que el plan ni la CI fallen.

### 4. MEDIO — D-92 y D-98 siguen figurando simultáneamente como decisiones vigentes incompatibles

- **Qué está mal:** D-92 afirma que el README es el único lugar permitido para el nombre, mientras D-98 afirma que hay dos lugares, pero D-92 no está marcada como superada.
- **Evidencia:**
  - `diff-b062c63-decisiones.diff`, D-92:
    > «El único nombre real permitido en el repositorio es el del autor, en la ficha 0.1 del README».
  - Mismo archivo, D-98:
    > «El nombre del autor también figura en los metadatos de cada commit [...] Son los dos únicos lugares».
  - `prompts.md`, regla del proyecto:
    > «las superadas se tachan, no se borran».
  - En el diff, D-92 permanece sin tachado ni anotación de sustitución.
- **Regla que se rompe y fallo observable:** El registro presenta dos instrucciones de confidencialidad que no pueden cumplirse a la vez. Un lector o control basado en D-92 rechazaría metadatos que D-98 permite; la precedencia temporal puede inferirse, pero no se aplicó la regla explícita para marcar decisiones superadas.

### 5. MEDIO — Una fila duplicada o con estado inventado puede ocultarse al verificador usando una huella que no coincida con el patrón

- **Qué está mal:** El índice solo reconoce como fila una línea cuya huella tenga exactamente doce caracteres hexadecimales minúsculos; cualquier otra fila se ignora por completo antes de comprobar duplicados y estados.
- **Evidencia:**
  - `scripts/verificar-referencias.py`, `FILA_INDICE`:
    ```python
    FILA_INDICE = re.compile(
        r"^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([0-9a-f]{12})`\s*\|\s*([^|]+)\|"
    )
    ```
  - Lectura del índice:
    ```python
    m = FILA_INDICE.match(linea)
    if not m:
        continue
    ```
  - La detección de duplicado y la validación de `ESTADOS` ocurren solamente después de ese `continue`.
  - `docs/trazabilidad/README.md`, “Cómo se comprueba”, promete que falla si un archivo «está dos veces» o si el estado no es válido.
- **Regla que se rompe y fallo observable:** Junto a una fila válida se puede añadir otra para el mismo archivo con una huella como `ABCDEF123456` y estado `revisada`. La segunda fila es visible en la tabla Markdown, pero el verificador no la cuenta como duplicada ni denuncia su estado inventado. La prueba existente solo duplica dos filas que sí encajan completamente en la expresión regular.

### 6. MEDIO — El límite de 200 elementos de un rango tiene un error de borde y carece del caso de prueba prometido

- **Qué está mal:** Un intervalo con 201 identificadores se acepta como válido porque se compara la diferencia de extremos, no la cantidad de elementos.
- **Evidencia:**
  - `scripts/verificar-referencias.py`:
    ```python
    RANGO_MAX = 200
    ```
    y:
    ```python
    if b <= a or b - a > RANGO_MAX:
    ```
    La misma condición aparece para rangos abreviados de criterios.
  - Por tanto, `D-1 a D-201` tiene 201 elementos, pero `201 - 1 == 200` y no activa el error.
  - `docs/revisiones/docs-trazabilidad-d91-ronda2-respuesta.md`, hallazgo 6:
    > «Un rango al revés o de más de 200 se marca. Seis casos de prueba».
  - `tests/harness/prueba-verificar-referencias.py` incluye un rango válido, uno con interior inexistente y uno al revés, pero ningún caso de más de 200 elementos.
- **Regla que se rompe y fallo observable:** En un repositorio de prueba donde estén definidos D-1 a D-201, la cita `D-1 a D-201` pasa aunque la respuesta afirma que debe marcarse. La ausencia del caso permitió que sobreviviera el error de borde.

### 7. MEDIO — Las pruebas no cubren que una copia ya declarada `derivada` siga sin poder desaparecer o cambiar de tipo

- **Qué está mal:** La nueva excepción se prueba para una modificación permitida y para un reetiquetado fraudulento, pero no en sus bordes negativos de desaparición y cambio de tipo.
- **Evidencia:**
  - `scripts/verificar-referencias.py`, excepción:
    ```python
    if estado == "M" and ruta in derivadas_base:
        continue
    ```
    La condición correcta depende de que la excepción se limite estrictamente a `M`.
  - `tests/harness/prueba-verificar-referencias.py`:
    - positivo: `con --base, la derivada se pone al día`;
    - negativo: `reetiquetar una copia como derivada no la libra`;
    - desaparición y cambio de tipo solo se prueban sobre `01-Paso/a.md`, cuya fila base es `idéntica`.
  - `readme.md` §2.6 afirma:
    > «un caso positivo y uno negativo por regla».
- **Regla que se rompe y fallo observable:** Una regresión que cambiara la excepción a “si la ruta está en `derivadas_base`, ignorar cualquier estado” seguiría pasando los negativos genéricos de desaparición y tipo, porque estos no usan una derivada. Entonces el registro derivado podría borrarse o convertirse en enlace simbólico sin que la suite denunciara el hueco específico.
