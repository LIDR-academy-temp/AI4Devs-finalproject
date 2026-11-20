# Revisión adversarial

- Fecha: 2026-11-19 13:38 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-temporal>/encargo-PR-trazabilidad.md` · huella `995ad7e9f412` · 1759 caracteres
- Archivo: `readme.md` · huella `e22a59e2b421` · 44200 caracteres
- Archivo: `prompts.md` · huella `71cc0d9543e2` · 20018 caracteres
- Archivo: `CLAUDE.md` · huella `72569bf9ba33` · 7897 caracteres
- Archivo: `.github/workflows/ci.yml` · huella `6b57d1da8e3e` · 1605 caracteres
- Archivo: `scripts/verificar-referencias.py` · huella `c3d283b69e7b` · 10214 caracteres
- Archivo: `scripts/referencias.txt` · huella `1acfaa1c51d6` · 1722 caracteres
- Archivo: `tests/harness/prueba-verificar-referencias.py` · huella `59bc5f95686e` · 6023 caracteres
- Archivo: `docs/trazabilidad/README.md` · huella `3f4f9dde685a` · 16503 caracteres
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

### 1. CRÍTICO — El repositorio público publica el nombre completo de una persona pese a prohibir expresamente nombres reales

- **Qué está mal:** `readme.md` contiene un nombre completo real, contradiciendo la regla de anonimización aplicable a cualquier persona.
- **Evidencia:**  
  - `readme.md`, §0.1: **“Jaime Guillermo Carson Albáez”**.  
  - `CLAUDE.md`, §2: **“No se escriben nombres reales de empresas, personas, contratos ni códigos de proyecto.”**  
  - PRD v8, `RNF-8`: **“no contienen nombres reales de clientes, personas ni contratos.”**
- **Regla que se rompe y fallo observable:** se rompen RNF-8, R-5 y la regla “Datos que no salen”. El dato ya queda expuesto en el historial y en cualquier clon público; además demuestra que el guardarraíl no impide todo lo que el README afirma que impide.

---

### 2. ALTO — Un aviso posterior al inicio de la ejecución puede evitar indebidamente el reporte

- **Qué está mal:** la clasificación afirma evaluar la ausencia de aviso en el instante de la ejecución, pero en realidad consulta esa condición más tarde, cuando obtiene el candado de cada asignación.
- **Evidencia:**  
  - `openspec/specs/no-reportados/spec.md`, requisito **“Clasificación de no reportados”**: **“El instante de la ejecución es el de la llamada: uno solo…”**.  
  - Mismo requisito: **“La condición 3 es la excepción al instante único: se comprueba con lo que hay en la base al tomar el candado”**.  
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, `HU-07.CA-1`: si al correr la primera ejecución posterior el consultor no avisó, **entra en el reporte**.
- **Regla que se rompe y fallo observable:** una llamada comienza a las 09:05 sin aviso, procesa esa asignación a las 09:10 y el consultor avisa a las 09:08; la especificación evita el reporte aunque el aviso ocurrió después de la ejecución que debía clasificarlo. Se rompe HU-07.CA-1 y se amplía indebidamente HU-07.CA-4, que solo excluye avisos anteriores a la ejecución.

---

### 3. ALTO — El plazo del reporte puede figurar como cumplido aunque la fila todavía no exista

- **Qué está mal:** el README afirma que el reporte queda generado en un intervalo, mientras la especificación admite que la fila aparezca después de un retraso no acotado y le asigna retroactivamente el instante inicial como `detectado_en`.
- **Evidencia:**  
  - `readme.md`, §5, `HU-07.CA-15`: **“El reporte queda generado con un retraso máximo de un intervalo.”**  
  - `openspec/specs/no-reportados/spec.md`, **“Ejecución recurrente”**: **“la fila aparece en la base después de `detectado_en`… Ese retraso no se acota”**.  
  - PRD v8, `RNF-3`: el retraso hasta cada organización **“se suma, no se acota”**.  
  - PRD v8, `M-2`: afirma que el máximo es un intervalo.
- **Regla que se rompe y fallo observable:** al cumplirse un intervalo, el supervisor todavía no puede encontrar ni recibir el reporte, pero `detectado_en` queda dentro del plazo y la métrica lo presenta como cumplimiento. Contradice HU-07.CA-15, RNF-3 y M-2 en su significado observable.

---

### 4. ALTO — La vía que omite las reglas por fila no tiene una prueba de entrega multiorganización asignada en el recorte

- **Qué está mal:** el correo usa la credencial del sistema y depende exclusivamente de un filtro de código para no mezclar organizaciones, pero el recorte difiere la prueba de punta a punta que capturaría destinatario y contenido.
- **Evidencia:**  
  - `openspec/specs/no-reportados/spec.md`, **“Correo agrupado al supervisor”**: **“la ejecución usa la credencial del sistema, que no pasa por las reglas de la base”** y la separación la pone el código.  
  - Mismo requisito, escenario **“dos organizaciones en la misma ejecución”**.  
  - `Recorte-Entrega-20261119-v4.md`, §2: `HU-07.8` queda diferido.  
  - `Tickets-MVP-Controlador-de-Tiempo-20261118-v4.md`, `HU-07.8`: es el ticket que captura **“destinatario correcto”** y el contenido entregado al servicio.  
  - `H-4` solo comprueba que **un correo de ejemplo** llega a un buzón.
- **Regla que se rompe y fallo observable:** un filtro omitido o aplicado después de agrupar podría enviar nombres, teléfonos y clientes de la organización B al supervisor de A sin que la comprobación manual de un único correo lo detecte. Se rompe HU-03.CA-4 y el escenario multiorganización de la especificación.

---

### 5. ALTO — Se difiere la prueba de concurrencia pese a que las reglas vigentes exigen pruebas para cada pieza y declaran que solo hay tres excepciones

- **Qué está mal:** el plan omite la prueba que demuestra el invariante más delicado entre aviso y clasificación, sin haberla incorporado como excepción de las reglas de proceso.
- **Evidencia:**  
  - `CLAUDE.md`, §4: **“Cada pieza se ejercita al menos dos veces: un caso que debe pasar y uno que debe rechazarse.”**  
  - `Tickets-MVP-Controlador-de-Tiempo-20261118-v4.md`, §1: **“Excepciones escritas a la Definition of Done. Son tres y no hay más.”**  
  - `Recorte-Entrega-20261119-v4.md`, §3: `HU-07.5` deja fuera la prueba de concurrencia `HU-07.CA-20`.  
  - `openspec/specs/no-reportados/spec.md`, riesgos: **“la prueba de concurrencia no se escribe en esta entrega”**.
- **Regla que se rompe y fallo observable:** una implementación incorrecta del candado podría producir aviso y no reportado incoherentes, o no producir ninguno, sin prueba automatizada que lo revele. Se rompe HU-07.CA-20 y la regla de tests antes del código.

---

### 6. ALTO — El verificador no revisa “todo lo que se sube”, sino solo una lista reducida de documentos

- **Qué está mal:** las citas presentes en código, workflows, pruebas y otros archivos pueden romperse sin que el control las examine.
- **Evidencia:**  
  - `CLAUDE.md`, §7: **“Todo lo que se sube cita su origen… y esa cita tiene que existir en este repositorio.”**  
  - `scripts/referencias.txt`, `[vivos]`: solo incluye `readme.md`, `prompts.md`, `CLAUDE.md`, el índice, las specs y el PRD.  
  - `.github/workflows/ci.yml` contiene citas `H-2`, `R-4` y `D-91`, pero no está en `[vivos]`.  
  - `scripts/verificar-referencias.py` solo recorre `cfg["vivos"]`.
- **Regla que se rompe y fallo observable:** cambiar `D-91` por `D-999` en el workflow, o añadir una cita rota en una prueba o script, seguiría permitiendo que el verificador imprima **“toda referencia resuelve”**.

---

### 7. ALTO — Las citas a criterios `HU-nn.CA-n` no se verifican

- **Qué está mal:** el patrón de identificadores solo reconoce tickets como `HU-06.3`, no criterios como `HU-06.CA-14`, aunque esos criterios son el origen principal de los requisitos.
- **Evidencia:**  
  - `scripts/verificar-referencias.py`, `FAMILIAS["HU"]`: `r"\bHU-(\d{2}\.\d+)\b"`.  
  - `scripts/referencias.txt`, fuente `HU`: solo tickets y recorte; no incluye el backlog como fuente de criterios.  
  - `tests/harness/prueba-verificar-referencias.py`: el negativo de HU usa `HU-09.9`, no un criterio `HU-09.CA-...`.  
  - Las especificaciones citan repetidamente identificadores como `HU-07.CA-20`.
- **Regla que se rompe y fallo observable:** una cita inventada como `HU-07.CA-999` no coincide con el patrón y pasa en verde. Un requisito podría quedar atribuido a un criterio inexistente sin que D-91 lo detecte.

---

### 8. ALTO — Las huellas no demuestran que una copia histórica no cambió después de subirse

- **Qué está mal:** el archivo histórico y la huella esperada viven en el mismo cambio mutable; editar ambos simultáneamente produce un falso verde.
- **Evidencia:**  
  - `readme.md`, §2.5: el verificador supuestamente falla **“si una copia de `docs/trazabilidad/` cambió después de subirse”**.  
  - `scripts/verificar-referencias.py`, funciones `huella()` y bloque del índice: compara el archivo actual con la huella actual escrita en `docs/trazabilidad/README.md`.  
  - `tests/harness/prueba-verificar-referencias.py`, caso `huella_mala`: solo prueba una huella incorrecta sin actualizarla junto con el contenido.
- **Regla que se rompe y fallo observable:** modificar una revisión histórica y recalcular su SHA-256 deja la CI en verde. El control comprueba consistencia interna del commit, no inmutabilidad desde la subida anterior.

---

### 9. ALTO — La columna de origen del índice se captura pero nunca se valida

- **Qué está mal:** el índice puede citar un origen inexistente y aun así superar el control.
- **Evidencia:**  
  - `docs/trazabilidad/README.md`: presenta un **“índice de origen y huella”**.  
  - `scripts/verificar-referencias.py`, `FILA_INDICE`: captura archivo, origen y huella en tres grupos.  
  - En el procesamiento se guarda únicamente `m.group(1)` y `m.group(3)`: `en_indice[m.group(1)] = (m.group(3), n)`; `m.group(2)` se descarta.  
  - El harness no contiene un caso con origen roto.
- **Regla que se rompe y fallo observable:** reemplazar el origen de una fila por `no/existe.md` no produce error y el resultado sigue diciendo que toda referencia resuelve. Se rompe precisamente la parte “cita su origen y esa cita existe” de D-91.

---

### 10. ALTO — El índice declara vigentes fuentes que se autodeclaran pendientes de actualización y ya contradicen decisiones posteriores

- **Qué está mal:** backlog y tickets antiguos aparecen como “vigentes” aunque H-1 ya terminó y esos documentos dicen que debían revisarse después de H-1.
- **Evidencia:**  
  - `docs/trazabilidad/README.md`, tabla “Qué hay aquí”: marca como vigentes `Backlog...v5`, `Tickets...v4` y `Recorte...v4`.  
  - `Tickets-MVP...v4.md`: **“Estos totales valen hasta que se apruebe la especificación inicial (H-1)… este documento se revisa”**.  
  - `Recorte...v4.md`: **“Cuando se apruebe la especificación inicial (H-1) y los tickets pasen a su versión 5…”**.  
  - Las tres specs declaran H-1 aprobado por D-89.  
  - El backlog vigente aún dice 72 horas en `HU-01.CA-9` y mantiene `PA-B10` abierto; PRD v8 y `prompts.md`, sección HU-01.6, fijan 24 horas y dan la comprobación por cerrada.
- **Regla que se rompe y fallo observable:** se rompe el objetivo D-90/D-91 de reflejar el estado vigente. Quien tome el backlog o los tickets señalados como vigentes puede implementar 72 horas o repetir una investigación ya resuelta.

---

### 11. MEDIO — Las rutas escritas como enlaces Markdown no son verificadas

- **Qué está mal:** el verificador solo extrae texto entre comillas invertidas, no destinos de enlaces Markdown.
- **Evidencia:**  
  - `scripts/verificar-referencias.py`, `CANDIDATO_RUTA = re.compile(r"`([^`\n]+)`")`.  
  - No existe patrón para `[texto](ruta)`.  
  - `tests/harness/prueba-verificar-referencias.py` solo prueba rutas entre comillas invertidas.
- **Regla que se rompe y fallo observable:** una cita estándar como `[fuente](docs/no-existe.md)` queda rota para el lector, pero el script no la mira y puede declarar que toda referencia resuelve.

---

### 12. MEDIO — `prompts.md` conserva como decisión vigente un stack incompatible con la arquitectura actual

- **Qué está mal:** el documento afirma que la decisión fue “Next.js + Supabase + pg-boss”, mientras el README vigente usa el disparador de Supabase y declara que no hay procesos aparte.
- **Evidencia:**  
  - `prompts.md`, §2.1, resultado del Prompt 2: **“Decisión: Opción A, Next.js + Supabase + pg-boss”**.  
  - `readme.md`, §1.2: **“Una sola aplicación desplegada, sin procesos aparte”**.  
  - `readme.md`, §2.1: el disparador programado de Supabase llama a la operación interna; no aparece pg-boss.  
  - `prompts.md`, regla inicial: **“las superadas se tachan, no se borran”**; la referencia a pg-boss no está marcada como superada.
- **Regla que se rompe y fallo observable:** contradice la obligación de mantener `prompts.md` al día. Un mantenedor puede concluir que debe desplegar o configurar pg-boss aunque la arquitectura vigente no lo contempla.

## Sospecha separada

- `prompts.md` afirma que las revisiones adversariales las hace **“un modelo de otro proveedor”**, pero el material visible solo identifica el perfil “Thibaut” y dice que el modelo exacto está en las cabeceras históricas. Como el encargo prohíbe revisar el contenido de esas copias históricas, no es posible confirmar aquí esa afirmación; queda como sospecha, no como hallazgo demostrado.
