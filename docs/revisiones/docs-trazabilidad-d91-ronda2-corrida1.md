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

### 1. ALTO — D-94 contradice el requisito vigente de recuperación tras una caída

- **Qué está mal:** D-94 acepta perder definitivamente lo pendiente del día anterior, mientras RNF-4 todavía promete reportar lo pendiente al volver.
- **Evidencia:**
  - `diff-5d89d4d-decisiones.diff`, **D-94**: «tras una caída que cruza la medianoche, no se reporten los no reportados del día anterior».
  - `docs/trazabilidad/03-PRD/PRD-MVP-Controlador-de-Tiempo-20261119-v8.md`, **RNF-4**: «Si el sistema estuvo fuera de servicio a la hora del reporte, al volver reporta lo pendiente».
  - `openspec/specs/no-reportados/spec.md`, requisito **“Recuperación tras una caída”**, escenario **“lo de ayer no se recupera”**.
  - `docs/trazabilidad/README.md`, **“Qué manda cuando no coinciden”**: afirma que mandan la especificación y el PRD v8.
- **Regla que se rompe y fallo observable:** D-91 exige documentación vigente y coherente. Si el sistema cae desde el martes hasta el miércoles, las ausencias del martes nunca se crean, aunque RNF-4 siga declarando que serán recuperadas.

### 2. ALTO — La cobertura temporal invocada por D-94 no existe como capacidad verificable

- **Qué está mal:** D-94 dice que la pérdida la cubre “que la caída larga la ve quien opera el sistema”, pero no hay monitorización, alerta, escenario ni ticket que garantice que alguien la vea.
- **Evidencia:**
  - `diff-5d89d4d-decisiones.diff`, **D-94**: «Mientras tanto lo cubre que la caída larga la ve quien opera el sistema».
  - `docs/trazabilidad/05-Tickets/Recorte-Entrega-20261119-v4.md`, secciones **1, 3 y 4**: la lista completa de 23 tickets y H-4 no incluyen monitorización ni alerta de indisponibilidad.
  - `readme.md`, §2.4 **Infraestructura y despliegue**: tampoco define un componente o comprobación que detecte una caída prolongada.
- **Regla que se rompe y fallo observable:** la decisión presenta una mitigación inexistente. Una caída nocturna puede pasar inadvertida y, aun cuando se descubra después, los no reportados del día anterior ya no se recuperan.

### 3. ALTO — H-4 puede cerrarse sin comprobar el riesgo de bloqueo global de la entrada

- **Qué está mal:** la especificación encarga a H-4 comprobar el límite de intentos y qué dirección IP ve el servicio, pero el ticket vigente de H-4 y la lista de pruebas manuales no incluyen esas comprobaciones.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, **Riesgos aceptados**, RA asociado a **D-72**: «H-4 lo comprueba [...] y comprueba también qué dirección ve el servicio».
  - `readme.md`, §0.4: reconoce que es una cuarta comprobación y que «el recorte v4 todavía no lo lista».
  - `docs/trazabilidad/05-Tickets/Recorte-Entrega-20261119-v4.md`, §3, fila **H-4**: solo exige correo, menos de cinco segundos y P1/P2/P5 con la cookie segura.
  - `readme.md`, §2.6, **“A mano, en el despliegue”**: vuelve a enumerar solo esas tres comprobaciones.
- **Regla que se rompe y fallo observable:** se rompe la mitigación de RA-10/D-72. Si el proveedor ve siempre la IP del servidor, un atacante puede agotar el límite compartido y bloquear la entrada de todas las cuentas, pero H-4 podría quedar aprobado.

### 4. ALTO — D-92 contradice el PRD vigente sobre nombres reales

- **Qué está mal:** D-92 y el README permiten el nombre real del autor, mientras RNF-8 continúa prohibiendo nombres reales de personas sin excepción.
- **Evidencia:**
  - `diff-5d89d4d-decisiones.diff`, **D-92**: «El único nombre real permitido [...] es el del autor, en la ficha 0.1».
  - `readme.md`, §0.1: publica `Jaime Guillermo Carson Albáez`.
  - `docs/trazabilidad/03-PRD/PRD-MVP-Controlador-de-Tiempo-20261119-v8.md`, **RNF-8**: «no contienen nombres reales de clientes, personas ni contratos».
  - `docs/trazabilidad/README.md`: declara que el PRD v8 sigue mandando.
- **Regla que se rompe y fallo observable:** D-91 exige mantener al día lo vigente. Un control que aplique RNF-8 debe rechazar el README, mientras otro que aplique D-92 debe aceptarlo; no hay una política única.

### 5. ALTO — La corrección del hallazgo 8 dejó fuera documentos de revisión que sí forman parte de la cadena

- **Qué está mal:** la respuesta afirma que solo quedan fuera las pruebas y el código de aplicación, pero `docs/revisiones/*.md` tampoco se revisa.
- **Evidencia:**
  - `docs/revisiones/docs-trazabilidad-d91-ronda1-respuesta.md`, hallazgo **8**: «Quedan fuera [...] las pruebas [...] y el código de la aplicación».
  - `scripts/referencias.txt`, sección **[vivos]**: no contiene `docs/revisiones/*.md`.
  - `CLAUDE.md`, §6: obliga a guardar en `docs/revisiones/` la revisión y su respuesta de cada PR.
  - `CLAUDE.md`, §7, **D-91**: «Todo lo que se sube cita su origen [...] y esa cita tiene que existir».
- **Regla que se rompe y fallo observable:** una respuesta de revisión puede citar `D-999`, un ticket inexistente o una ruta borrada y la CI seguirá verde. La propia evidencia usada para cerrar hallazgos queda fuera del control prometido.

### 6. ALTO — El verificador deja sin comprobar muchas citas reales de criterios y rangos

- **Qué está mal:** solo reconoce criterios escritos con el identificador completo, pero los documentos vivos usan abreviaturas como `CA-2` y rangos cuyo interior nunca se comprueba.
- **Evidencia:**
  - `scripts/verificar-referencias.py`, `FAMILIAS["CA"]`: `r"\b(HU-\d{2}\.CA-\d+)\b"`.
  - `readme.md`, §2.5: `HU-03.CA-1 a CA-3`.
  - `openspec/specs/acceso/spec.md`, requisito **“Reglas por rol en la base”**: `HU-02.CA-1, CA-2, CA-3, ...`.
  - `readme.md` y `prompts.md`: usan rangos como `D-1 a D-91`.
- **Regla que se rompe y fallo observable:** D-91 promete comprobar cada criterio citado. Un texto como `HU-03.CA-1 a CA-99` solo verifica `HU-03.CA-1`; `CA-99` pasa en verde. Del mismo modo, un rango puede omitir identificadores intermedios y el verificador solo mira sus extremos.

### 7. ALTO — La mitigación de D-93 depende de premisas que la CI no verifica

- **Qué está mal:** D-93 dice que el riesgo queda cubierto porque todos los commits los hace el agente con hooks y solo se unen ramas propias, pero ningún control presentado comprueba ninguna de esas dos condiciones.
- **Evidencia:**
  - `diff-5d89d4d-decisiones.diff`, **D-93**: «todo commit lo hace el agente con los hooks [...] y solo se une trabajo de ramas propias».
  - `.github/workflows/ci.yml`: ejecuta las pruebas del hook, pero no ejecuta el hook sobre el contenido del repositorio ni valida el propietario de la rama o del PR.
  - `CLAUDE.md`, §2: admite que lo llegado por `merge`, `pull`, `cherry-pick` o `rebase` no pasa por el hook.
  - `readme.md`, §2.2: reconoce explícitamente que la CI no revisa con el hook el contenido subido.
- **Regla que se rompe y fallo observable:** un commit creado fuera del agente o mediante edición web puede introducir un nombre real o secreto; el verificador de referencias y las pruebas del hook pueden quedar verdes porque no escanean ese contenido. En un repositorio público, la exposición ya ocurrió al hacer el push.

### 8. MEDIO — La comprobación de enlaces Markdown acepta enlaces locales rotos y puede rechazar enlaces válidos

- **Qué está mal:** el analizador no cubre todos los destinos Markdown que promete revisar.
- **Evidencia:**
  - `scripts/verificar-referencias.py`, `ENLACE_MD = re.compile(r"\]\(([^)\s]+)\)")`: no reconoce destinos con espacios, títulos ni la sintaxis con `<...>`.
  - `scripts/verificar-referencias.py`, `parece_ruta`: descarta cualquier destino que empiece por `/`.
  - Docstring, regla **1**: promete revisar «el destino de cada enlace Markdown» que no sea web.
  - `tests/harness/prueba-verificar-referencias.py`: solo prueba un enlace simple sin espacios ni título.
- **Regla que se rompe y fallo observable:** `[documento](/docs/no-existe.md)` o un destino entre `<...>` puede pasar en verde aunque esté roto. A la inversa, un enlace correcto a un archivo con espacio codificado como `%20` se busca literalmente y puede producir un falso rojo.

### 9. MEDIO — El índice admite filas ambiguas o estados inválidos sin detectarlos

- **Qué está mal:** el parser sobrescribe filas duplicadas y no valida que el estado pertenezca al conjunto declarado.
- **Evidencia:**
  - `scripts/verificar-referencias.py`, lectura del índice: `en_indice[archivo] = (h, n)` reemplaza silenciosamente cualquier fila anterior del mismo archivo.
  - En el mismo bloque, cualquier estado que no contenga `derivada` se trata como copia; no se comprueban valores permitidos como `idéntica` o `neutralizada`.
  - `docs/trazabilidad/README.md`, **“Qué cambió frente al original”**: afirma que la columna Estado distingue exactamente copia, neutralizada o derivada.
- **Regla que se rompe y fallo observable:** dos filas del mismo archivo, una con huella incorrecta y otra correcta, dejan prevalecer solo la última para la comprobación. También puede usarse un estado inventado y la CI seguir verde.

### 10. MEDIO — Las pruebas no cubren todas las ramas de las reglas que dicen cubrir

- **Qué está mal:** no hay pruebas para el origen de una derivada, una copia neutralizada ni la desaparición de una copia, aunque esas conductas se prometen expresamente.
- **Evidencia:**
  - `tests/harness/prueba-verificar-referencias.py`, `montar`: todas las filas de origen usan estado `idéntica`; no existe un caso `derivada` ni `neutralizada`.
  - Los casos de `--base` prueban agregar y reescribir, pero no eliminar una copia.
  - `docs/revisiones/docs-trazabilidad-d91-ronda1-respuesta.md`, hallazgos **7 y 10**: afirman que se comprueba desaparición y coherencia de derivadas/copias.
  - `readme.md`, §2.6: declara «un caso positivo y uno negativo por regla».
- **Regla que se rompe y fallo observable:** una regresión en la rama `estado == D`, en la comparación por paso de una derivada o en el tratamiento de neutralizadas no haría fallar el harness.

### 11. MEDIO — Los documentos vivos siguen declarando que el registro termina en D-91

- **Qué está mal:** después de agregar D-92 a D-95, varios documentos vivos siguen presentando D-91 como última decisión.
- **Evidencia:**
  - `readme.md`, bloque de estado: «registro de decisiones (D-1 a D-91)».
  - `prompts.md`, actualización del 19/11: «hoy D-1 a D-91».
  - `docs/trazabilidad/README.md`, tabla del paso 1: «registro de decisiones (D-1 a D-91)».
  - `diff-5d89d4d-decisiones.diff`, cabecera del discovery: se actualiza a **D-1 a D-95**.
- **Regla que se rompe y fallo observable:** se incumple D-91 y la obligación de mantener README y `prompts.md` al día. Un lector del índice concluye que D-92 a D-95 no pertenecen a la cadena, aunque el propio README ya cita D-92.
