# Revisión adversarial

- Fecha: 2026-11-19 14:14 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-temporal>/encargo-PR-trazabilidad-ronda2.md` · huella `ce17a751cd5c` · 2348 caracteres
- Archivo: `docs/revisiones/docs-trazabilidad-d91-ronda1-respuesta.md` · huella `3da6a3766369` · 8020 caracteres
- Archivo: `<espacio-temporal>/diff-5d89d4d-decisiones.diff` · huella `00fb445b513f` · 8610 caracteres
- Archivo: `readme.md` · huella `08203900f85e` · 45435 caracteres
- Archivo: `prompts.md` · huella `c07a174c674f` · 20732 caracteres
- Archivo: `CLAUDE.md` · huella `18273009d8c6` · 8306 caracteres
- Archivo: `.github/workflows/ci.yml` · huella `804672f2630e` · 2538 caracteres
- Archivo: `scripts/verificar-referencias.py` · huella `d4681a2899c1` · 13034 caracteres
- Archivo: `scripts/referencias.txt` · huella `ea3f061688d7` · 2454 caracteres
- Archivo: `tests/harness/prueba-verificar-referencias.py` · huella `1940be9b38a3` · 8972 caracteres
- Archivo: `docs/trazabilidad/README.md` · huella `0a7fcf3bc159` · 18009 caracteres
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

### 1. CRÍTICO — La neutralización de D-95 no elimina las rutas locales del historial público

- **Qué está mal:** Las rutas se sustituyeron en un segundo commit, por lo que las versiones originales siguen recuperables desde el commit anterior del PR.
- **Evidencia:**
  - `encargo-PR-trazabilidad-ronda2.md`, §«Qué pasó desde la ronda 1», punto 2: «Un segundo commit agregó las decisiones D-92 a D-95 [...] y sustituyó con `sed` las rutas locales [...] de 27 revisiones copiadas».
  - `diff-5d89d4d-decisiones.diff`, D-95: «se neutralizan las rutas locales de la máquina [...] revelan la estructura del equipo de trabajo».
  - `CLAUDE.md`, introducción: «El repositorio es público. Todo lo que entra en un commit lo puede leer cualquiera».
- **Regla o escenario roto:** D-95 pretende impedir la revelación de la estructura local, pero `git show <primer-commit>:<archivo>` conserva las cabeceras anteriores. El fallo se vería al inspeccionar el primer commit del PR, aunque la versión final muestre `<espacio-de-trabajo>` o `<repositorio>`.

### 2. ALTO — La inmutabilidad no se comprueba commit por commit y un push con varios commits puede publicar una copia original y otra reescrita en verde

- **Qué está mal:** En un push de varios commits, el workflow compara solo el estado final con el último estado remoto, no cada commit intermedio.
- **Evidencia:**
  - `docs/revisiones/docs-trazabilidad-d91-ronda1-respuesta.md`, hallazgo 7: afirma que en los push se compara «contra el commit anterior».
  - `.github/workflows/ci.yml`, trabajo `guardarrailes`: usa `ANTES: ${{ github.event.before }}` y ejecuta una única comparación `--base "$ANTES"`.
  - `scripts/verificar-referencias.py`, sección 5: hace un solo `git diff args.base ...`.
  - `encargo-PR-trazabilidad-ronda2.md`, punto 2: declara precisamente un primer estado y «un segundo commit» que reescribe 27 copias.
- **Regla o escenario roto:** La regla de `CLAUDE.md` §7 dice que las copias no se editan y que debe agregarse otra versión. Si dos commits se suben juntos —el primero agrega `a.md` y el segundo lo reescribe—, frente a `github.event.before` el archivo final sigue siendo `A`, no `M`, y pasa la inmutabilidad aunque el historial publicado contenga ambas versiones.

### 3. ALTO — `--base` puede dejar pasar la sustitución de una copia por un enlace simbólico

- **Qué está mal:** El filtro de Git solo busca estados modificados o eliminados y omite los cambios de tipo.
- **Evidencia:**
  - `scripts/verificar-referencias.py`, sección 5:
    ```python
    git diff ... --name-status --diff-filter=MD
    ```
  - El mismo archivo, sección 4, usa `p.is_file()` y `read_bytes()`, operaciones que siguen un enlace simbólico.
  - `docs/trazabilidad/README.md`, §«Cómo se comprueba»: promete fallar si una copia «cambió o desapareció».
- **Regla o escenario roto:** Sustituir un archivo regular por un enlace simbólico a otro archivo del repositorio produce un cambio de tipo `T`, no incluido en `MD`. Si se actualiza la huella al contenido del destino, el índice también pasa; la copia cambió, pero la CI queda verde.

### 4. ALTO — D-94 contradice el requisito vigente de recuperación y no fue propagada al PRD

- **Qué está mal:** Una decisión acepta no recuperar el día anterior mientras el PRD vigente sigue exigiendo reportar lo pendiente tras una caída.
- **Evidencia:**
  - `diff-5d89d4d-decisiones.diff`, D-94: «tras una caída que cruza la medianoche, no se reporten los no reportados del día anterior».
  - `docs/trazabilidad/03-PRD/PRD-MVP-Controlador-de-Tiempo-20261119-v8.md`, RNF-4: «Si el sistema estuvo fuera de servicio a la hora del reporte, al volver reporta lo pendiente».
  - `openspec/specs/no-reportados/spec.md`, requisito «Recuperación tras una caída», escenario «lo de ayer no se recupera»: ordena explícitamente no crear el no reportado de ayer.
  - `CLAUDE.md` §7: exige mantener al día el PRD y la documentación.
- **Regla o escenario roto:** Tras una caída de todo el martes, la ejecución del miércoles no crea reportes del martes. La especificación lo considera correcto, pero RNF-4 sigue prometiendo recuperación; no existe una única verdad vigente.

### 5. ALTO — La supuesta cobertura temporal de D-94 no existe como requisito, ticket ni control operativo

- **Qué está mal:** D-94 afirma que una caída larga «la ve quien opera el sistema», pero ningún material exige detección, alerta o revisión de disponibilidad.
- **Evidencia:**
  - `diff-5d89d4d-decisiones.diff`, D-94: «Mientras tanto lo cubre que la caída larga la ve quien opera el sistema».
  - `readme.md`, §§2.2 y 2.4: el registro de ejecución solo contiene tiempos y conteos de llamadas que sí ocurrieron.
  - `docs/trazabilidad/05-Tickets/Recorte-Entrega-20261119-v4.md`, tramos 0–10: no contiene ticket de monitorización, alerta de caída ni conciliación de días no procesados.
- **Regla o escenario roto:** Si el sistema deja de ejecutar durante un día y nadie lo observa manualmente, no existe evento posterior que detecte automáticamente el hueco. Los no reportados de ese día se pierden sin aviso, por lo que el «mientras tanto» de D-94 es solo un supuesto.

### 6. ALTO — La comprobación de límite de intentos y de la dirección IP efectiva sigue sin ticket

- **Qué está mal:** La especificación asigna a H-4 dos comprobaciones de seguridad que el ticket H-4 no contiene.
- **Evidencia:**
  - `docs/revisiones/docs-trazabilidad-d91-ronda1-respuesta.md`, hallazgo 6: se cierra como «Corregido en el README · tickets v5».
  - `readme.md` §0.4: reconoce que «El recorte v4 todavía no lo lista: se agrega a H-4 en los tickets v5».
  - `openspec/specs/acceso/spec.md`, tabla «Riesgos aceptados», RA-10: H-4 debe comprobar el límite y «qué dirección ve el servicio».
  - `docs/trazabilidad/05-Tickets/Recorte-Entrega-20261119-v4.md`, H-4: solo enumera correo, cinco segundos y pruebas P1/P2/P5 con cookie segura.
- **Regla o escenario roto:** Si el servidor llama al proveedor de autenticación desde una IP única, una persona puede agotar el límite común y bloquear la entrada de todos. H-4 podría cerrarse en verde sin descubrirlo porque el ticket vigente no exige esa prueba; además, los anunciados «tickets v5» no están incluidos.

### 7. ALTO — D-92 deja dos reglas vigentes incompatibles sobre nombres reales

- **Qué está mal:** La excepción del autor se incorporó al README y a `CLAUDE.md`, pero RNF-8 sigue prohibiendo todo nombre real de persona.
- **Evidencia:**
  - `diff-5d89d4d-decisiones.diff`, D-92: «El único nombre real permitido [...] es el del autor, en la ficha 0.1».
  - `readme.md` §0.1: publica «Jaime Guillermo Carson Albáez».
  - `docs/trazabilidad/03-PRD/PRD-MVP-Controlador-de-Tiempo-20261119-v8.md`, RNF-8: «no contienen nombres reales de clientes, personas ni contratos», sin excepción.
  - `CLAUDE.md`, introducción: llama al PRD v8 «vigente».
- **Regla o escenario roto:** Un revisor que aplique RNF-8 debe rechazar el README; otro que aplique D-92 debe aceptarlo. D-91 exigía documentación vigente, pero no se creó una versión del PRD que incorpore la excepción.

### 8. ALTO — El verificador no comprueba todos los enlaces Markdown que afirma comprobar

- **Qué está mal:** El patrón solo reconoce enlaces en línea sin espacios y omite varias formas válidas de Markdown.
- **Evidencia:**
  - `scripts/verificar-referencias.py`:
    ```python
    ENLACE_MD = re.compile(r"\]\(([^)\s]+)\)")
    ```
  - El mismo archivo, `parece_ruta()`, descarta destinos que empiezan con `/`.
  - `docs/trazabilidad/README.md`, §«Cómo se comprueba»: afirma que falla cuando un documento vivo cita «un enlace [...] que no existe».
  - `tests/harness/prueba-verificar-referencias.py`: solo prueba enlaces en línea sin espacios, como `[enlace](sub/unico.txt#arriba)`.
- **Regla o escenario roto:** Enlaces válidos como `[alcance](<02-Alcance/archivo con espacios.html>)`, enlaces de referencia (`[texto][id]`) o un destino raíz `/docs/inexistente.md` no se validan. Un enlace roto de esas formas deja la CI en verde.

### 9. MEDIO — Los documentos vivos siguen declarando D-1 a D-91 aunque el registro ya llega a D-95

- **Qué está mal:** La ampliación del registro no actualizó sus descripciones principales.
- **Evidencia:**
  - `readme.md`, bloque de estado: «registro de decisiones (D-1 a D-91)».
  - `prompts.md`, actualización del 19/11: «hoy D-1 a D-91».
  - `docs/trazabilidad/README.md`, tabla del paso 1: «registro de decisiones (D-1 a D-91)».
  - `diff-5d89d4d-decisiones.diff`, cabecera del discovery: lo actualiza a «D-1 a D-95».
- **Regla o escenario roto:** Se rompe D-91 y `CLAUDE.md` §7, que exigen documentación al día. Un lector del índice concluye que D-92 a D-95 no forman parte de la cadena, aunque otros documentos ya las citan; el verificador no lo detecta porque solo comprueba las citas existentes, no las decisiones omitidas.

### 10. MEDIO — La afirmación de “un positivo y un negativo por regla” no cubre ramas explícitas del verificador

- **Qué está mal:** No hay prueba de origen para una fila `derivada` ni prueba de desaparición de una copia, aunque ambas son comportamientos distintos del código.
- **Evidencia:**
  - `readme.md` §2.6 y `tests/harness/prueba-verificar-referencias.py`, docstring: «un caso positivo y uno negativo por regla».
  - `scripts/verificar-referencias.py`, índice:
    ```python
    if "derivada" in estado:
        ...
    elif origen != archivo:
        ...
    ```
  - `scripts/verificar-referencias.py`, inmutabilidad: distingue «cambió» (`M`) y «desapareció» (`D`).
  - `tests/harness/prueba-verificar-referencias.py`, `CASOS`: prueba una copia idéntica con origen incorrecto y una reescritura, pero no una derivada de otro paso ni una eliminación.
- **Regla o escenario roto:** Un defecto exclusivo de la rama `derivada` o del estado `D` podría entrar sin que las 32 pruebas fallen. La cobertura anunciada es más amplia que la cobertura real.

### 11. MEDIO — Las instrucciones locales no ejecutan la misma comprobación de integridad que la CI

- **Qué está mal:** El README presenta el comando sin `--base` como parte de «las mismas comprobaciones» de la CI, aunque omite precisamente la inmutabilidad.
- **Evidencia:**
  - `readme.md` §1.4: «Las mismas comprobaciones que corre la integración continua» seguido de:
    ```bash
    python3 scripts/verificar-referencias.py
    ```
  - `.github/workflows/ci.yml`: en PR y push normalmente lo ejecuta con `--base`.
  - `scripts/verificar-referencias.py`, docstring y salida: sin `--base` no comprueba inmutabilidad.
  - `tests/harness/prueba-verificar-referencias.py`: documenta que reescribir una copia y su huella «sin `--base` [...] pasa».
- **Regla o escenario roto:** Un desarrollador puede seguir el README, obtener verde local tras reescribir una copia y descubrir el fallo solo al subirla. No son las mismas comprobaciones anunciadas.

### 12. MEDIO — M-2 sigue prometiendo un máximo que RNF-3 declara no acotado

- **Qué está mal:** El mismo PRD afirma que el máximo es un intervalo y, a la vez, que existen retrasos adicionales sin límite.
- **Evidencia:**
  - `docs/trazabilidad/03-PRD/PRD-MVP-Controlador-de-Tiempo-20261119-v8.md`, RNF-3: el retraso del disparador y el procesamiento por organización «se suman, no se acotan».
  - Mismo archivo, M-2: «Nada: con el sistema en servicio el máximo es un intervalo».
  - `docs/revisiones/docs-trazabilidad-d91-ronda1-respuesta.md`, hallazgo 4: reconoce que M-2 queda para «la próxima versión del PRD».
- **Regla o escenario roto:** Una fila puede aparecer mucho después de un intervalo y ser válida según RNF-3, pero incumplir M-2. La métrica no puede decidir de forma coherente si el sistema cumplió.

## Sospecha separada

- **Posible segunda ubicación del nombre real del autor:** D-92 limita el nombre real a `readme.md` §0.1, mientras `CLAUDE.md` §2 permite/configura un `git config user.name` público y solo dice que pasa por una lista privada. No se incluyó el historial ni la implementación del hook para confirmar si el nombre real aparece también en los metadatos de los commits; si aparece, sería otra violación de D-92 fuera de la ficha 0.1.
