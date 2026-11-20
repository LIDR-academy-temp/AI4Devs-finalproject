# Revisión adversarial

- Fecha: 2026-11-19 14:38 EST
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

### 1. ALTO — La excepción para archivos derivados permite alterar decisiones históricas sin que la CI lo detecte

- **Qué está mal:** cualquier contenido del registro derivado puede reescribirse, siempre que se conserve el archivo y se actualice su huella.
- **Evidencia:**  
  - `scripts/verificar-referencias.py`, sección 5: `if estado == "M" and ruta in derivadas_base: continue`.  
  - `docs/revisiones/docs-trazabilidad-d91-ronda2-respuesta.md`, “Cruce de las correcciones”: «una edición de una decisión antigua en el registro derivado no la detiene la integración continua».  
  - `tests/harness/prueba-verificar-referencias.py`, caso `positivo: con --base, la derivada se pone al día`: solo demuestra que cualquier modificación del archivo pasa; no distingue una decisión nueva de la alteración de una antigua.
- **Regla que se rompe y fallo visible:** contradice la integridad prometida por D-91 y la regla de `prompts.md` de que las decisiones superadas se marcan y no se borran. Cambiar el texto de D-1, D-50 o D-94 manteniendo su identificador y actualizando la huella dejaría la CI en verde. Declarar el hueco no convierte A2 en una corrección efectiva.

### 2. ALTO — Una referencia puede escapar del repositorio y darse por válida contra el sistema de archivos del ejecutor

- **Qué está mal:** la resolución de rutas no comprueba que el destino permanezca dentro de la raíz del repositorio.
- **Evidencia:** `scripts/verificar-referencias.py`, función `resuelve`: prueba `(base / rel).exists()` para `doc.parent`, `raiz` y `raiz/docs/trazabilidad`, sin resolver y validar que el resultado siga bajo `raiz`.
- **Regla que se rompe y fallo visible:** la documentación afirma que el verificador comprueba archivos del repositorio. Un enlace como `[x](../../../../../../etc/passwd)`, ajustado a la profundidad del ejecutor, pasa si el archivo externo existe, aunque no forme parte del repositorio. El resultado dependería además de la máquina donde corra la verificación.

### 3. ALTO — Las filas mal formadas del índice son invisibles y permiten duplicados que deberían fallar

- **Qué está mal:** solo se consideran filas cuyo hash ya cumple exactamente el formato esperado; cualquier otra fila se ignora por completo.
- **Evidencia:**  
  - `scripts/verificar-referencias.py`, `FILA_INDICE`: exige `[0-9a-f]{12}`.  
  - En el bucle del índice: `if not m: continue`.  
  - `tests/harness/prueba-verificar-referencias.py`, caso `negativo: archivo dos veces en el índice`: ambas filas duplicadas son sintácticamente válidas; no se prueba una segunda fila con hash mayúsculo, corto o inválido.
- **Regla que se rompe y fallo visible:** la respuesta de ronda 2, hallazgo 9, afirma «una fila repetida falla». Una fila válida de `01-Paso/a.md` y una segunda fila del mismo archivo con hash `ABCDEF...` dejarían una sola entrada reconocida y la verificación pasaría. También pueden añadirse filas basura sin archivo que el control no ve.

### 4. ALTO — Los enlaces Markdown por referencia siguen sin comprobarse de extremo a extremo

- **Qué está mal:** el verificador revisa las definiciones `[id]: destino`, pero no comprueba que un uso `[texto][id]` tenga una definición existente.
- **Evidencia:**  
  - `scripts/verificar-referencias.py`: `ENLACE_MD` solo reconoce `](...)`; `ENLACE_REF` solo reconoce líneas que empiezan por `[id]:`.  
  - `tests/harness/prueba-verificar-referencias.py`: los casos por referencia prueban `[r]: /sub/unico.txt` y `[r]: no/ref.md`, pero ninguno usa `[texto][r]` ni un identificador ausente.
- **Regla que se rompe y fallo visible:** la respuesta al hallazgo 8 afirma que ahora reconoce enlaces «por referencia» y que «los enlaces se revisan siempre». Un documento con `[documento][referencia-inexistente]` pasa en verde aunque el enlace esté roto.

### 5. ALTO — D-97 deja un tercer lugar público con identidad del autor, contradiciendo D-98

- **Qué está mal:** se afirma que el nombre del autor solo aparece en la ficha 0.1 y en los metadatos, pero se acepta conservar un nombre de usuario de la máquina en el historial público.
- **Evidencia:**  
  - D-97 en `diff-b062c63-decisiones.diff`: el primer commit «trae en las cabeceras de las revisiones el usuario de la máquina».  
  - D-98: «Son los dos únicos lugares: la ficha 0.1 del README y los metadatos».  
  - `CLAUDE.md` §2 repite «en dos lugares y en ninguno más».  
  - La ruta aportada en el material contiene el identificador personal `<usuario-de-la-máquina>` *(neutralizado al guardar el informe, D-95)*.
- **Regla que se rompe y fallo visible:** el historial público expone un identificador local asociado al autor fuera de los dos lugares permitidos. Por tanto, la garantía de D-98, el README y `CLAUDE.md` es falsa incluso aunque el riesgo de D-97 haya sido aceptado.

### 6. MEDIO — D-94 conserva como vigente una cobertura que D-96 declara inexistente

- **Qué está mal:** D-94 sigue en negrita y mantiene la afirmación «Mientras tanto lo cubre…», aunque D-96 afirma lo contrario.
- **Evidencia:**  
  - D-94 en `diff-b062c63-decisiones.diff`: conserva «Mientras tanto lo cubre que la caída larga la ve quien opera el sistema».  
  - D-96: «El riesgo de D-94 no tiene cobertura mientras tanto».  
  - `prompts.md`, regla del proyecto: «las superadas se tachan, no se borran».  
  - D-94 solo recibe la nota «Lo que la cubre, corregido en D-96»; no está tachada.
- **Regla que se rompe y fallo visible:** un lector sigue encontrando dos afirmaciones incompatibles presentadas como decisiones activas. Además, se incumple la regla explícita de tachar la decisión superada, justo en el archivo que se usa como fuente de verdad.

### 7. MEDIO — La validación de estados no exige realmente uno de los tres valores declarados

- **Qué está mal:** el control acepta cualquier texto cuyo primer término sea un estado válido.
- **Evidencia:**  
  - `scripts/verificar-referencias.py`: `clase = estado.replace("*", "").split()[0]` y solo valida `clase`.  
  - `docs/trazabilidad/README.md`, “Cómo se comprueba”: declara que el estado debe ser `idéntica`, `neutralizada` o `derivada`.  
  - El propio índice usa `derivada sin nombres`, demostrando que el contrato escrito y lo aceptado por el código no coinciden.
- **Regla que se rompe y fallo visible:** estados como `idéntica alterada`, `neutralizada sin revisar` o `derivada no confiable` pasan en verde. El hallazgo 9 de la ronda anterior no quedó corregido con la exactitud que afirma la respuesta.

### 8. MEDIO — No existe la prueba prometida para rangos de más de 200 elementos

- **Qué está mal:** se implementó el límite, pero ningún caso prueba que ese borde falle.
- **Evidencia:**  
  - `scripts/verificar-referencias.py`: `RANGO_MAX = 200` y rechazo cuando `b - a > RANGO_MAX`.  
  - `docs/revisiones/docs-trazabilidad-d91-ronda2-respuesta.md`, hallazgo 6: «Un rango al revés o de más de 200 se marca. Seis casos de prueba».  
  - `tests/harness/prueba-verificar-referencias.py`: existe `negativo: rango al revés`, pero no hay ningún rango cuya longitud supere 200.
- **Regla que se rompe y fallo visible:** la afirmación de cobertura de la corrección es falsa. Una regresión que elimine o cambie `RANGO_MAX` no haría fallar las 52 pruebas.

### 9. MEDIO — D-99 no tiene ningún control que impida comenzar el tramo 8 con PRD v8 y tickets v4

- **Qué está mal:** la decisión exige que PRD v9 y tickets v5 existan antes del tramo 8, pero ninguna regla o escenario convierte esa condición en una puerta verificable.
- **Evidencia:**  
  - D-99: «Los tickets v5 y el PRD v9 se hacen antes del tramo 8».  
  - `scripts/referencias.txt`, `[fuentes]`: sigue usando `PRD-...-v8.md`, `Tickets-...-v4.md` y `Recorte-...-v4.md`.  
  - `.github/workflows/ci.yml`: no comprueba la versión vigente antes de construir HU-06.3 o HU-07.3.  
  - `CLAUDE.md` §6 fija el orden de tramos, pero no exige como precondición de tramo 8 la existencia de esas dos versiones.
- **Regla que se rompe y fallo visible:** podría abrirse y fusionarse el PR del tramo 8 con HU-06.3 y HU-07.3 mientras el repositorio todavía usa PRD v8 y tickets v4; la CI quedaría verde pese a incumplir D-99.

## Sospechas separadas

- **D-97 afirma sin evidencia aportada que borrar las rutas «no es posible» porque GitHub conserva la referencia del PR.** El material no incluye una comprobación de las referencias públicas efectivamente retenidas ni de las alternativas de eliminación. La aceptación del riesgo puede sostenerse, pero la imposibilidad técnica no está demostrada.
- **D-98 justifica el nombre real diciendo que “git exige un autor”.** Git exige metadatos de autor, pero el material no demuestra que deban contener el nombre real o un correo identificable; esa parte del fundamento es más fuerte que la evidencia presentada.
