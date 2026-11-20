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

### 1. CRÍTICO — La CI no impide que secretos o datos reales entren al repositorio público

- **Qué está mal:** el control de datos sensibles solo se prueba en repositorios desechables, pero nunca se ejecuta contra el contenido real del commit o del pull request.
- **Evidencia:**
  - `CLAUDE.md`, sección 2: «Lo que llega por `merge`, `pull`, `cherry-pick` o `rebase` no pasa por el hook».
  - `.github/workflows/ci.yml`, trabajo `guardarrailes`: ejecuta `tests/harness/prueba-datos-que-no-salen.py` y `tests/harness/prueba-instalar-guardarrailes.py`, pero no analiza los archivos del checkout con `.claude/hooks/datos-que-no-salen.py`.
  - `readme.md`, §2.2: los guardarraíles supuestamente «Impiden subir secretos o nombres reales».
- **Regla que se rompe y fallo observable:** se rompen R-5, RNF-8 y `CLAUDE.md` §2; un commit creado sin hooks, incorporado por merge o subido con un secreto, un `.env`, un binario prohibido o un nombre real puede dejar toda la CI en verde y hacerse público.

### 2. ALTO — El repositorio publica un nombre completo pese a prohibir nombres reales de personas

- **Qué está mal:** el README contiene un nombre completo real en contradicción directa con la política de anonimización.
- **Evidencia:**
  - `readme.md`, §0.1: «Jaime Guillermo Carson Albáez».
  - `readme.md`, bloque «Anonimización»: «No se nombran personas».
  - `CLAUDE.md`, §2: «No se escriben nombres reales de empresas, personas, contratos ni códigos de proyecto».
  - PRD v8, RNF-8: el repositorio público «no contiene nombres reales de clientes, personas ni contratos».
- **Regla que se rompe y fallo observable:** se rompen RNF-8, R-5 y la regla de datos que no salen; la identidad personal ya queda publicada en el propio documento que afirma estar anonimizado.

### 3. ALTO — La separación entre organizaciones en el correo carece de una prueba asignada en el recorte

- **Qué está mal:** la vía que usa la credencial del sistema y omite las reglas de fila depende únicamente de un filtro de código, pero la prueba de correo de punta a punta que podría detectar una fuga entre organizaciones está diferida.
- **Evidencia:**
  - `openspec/specs/no-reportados/spec.md`, «Correo agrupado al supervisor»: «la credencial del sistema [...] no pasa por las reglas de la base» y «la separación aquí la pone el código».
  - Mismo requisito, escenario «dos organizaciones en la misma ejecución»: exige que ningún nombre, cliente o teléfono cruce de organización.
  - `docs/trazabilidad/05-Tickets/Recorte-Entrega-20261119-v4.md`, §2: HU-07.8, «Escenarios de punta a punta del correo», está diferido.
  - El mismo archivo, H-4: solo comprueba que «un correo de ejemplo llega a un buzón», no que dos organizaciones queden separadas.
  - `Tickets-MVP...v4.md`: HU-03.3 se construye antes de HU-07.4 y HU-07.4 no hereda HU-03.CA-4.
- **Regla que se rompe y fallo observable:** queda sin verificación efectiva HU-03.CA-4; un filtro omitido o aplicado después de agrupar podría enviar al supervisor de Proveedor A nombres y teléfonos de Proveedor B mientras las pruebas previstas y H-4 siguen pasando.

### 4. ALTO — El plazo máximo de un intervalo se puede declarar cumplido con una marca temporal retroactiva aunque el reporte aún no exista

- **Qué está mal:** el requisito promete que el reporte queda generado y consultable dentro de un intervalo, pero la especificación permite crearlo mucho después y guardar en `detectado_en` el instante anterior de la llamada.
- **Evidencia:**
  - PRD v8, RNF-3: «el reporte [...] queda generado y consultable [...] con un retraso máximo de un intervalo».
  - Backlog v5, HU-07.CA-15: la misma promesa de reporte «generado y consultable».
  - `openspec/specs/no-reportados/spec.md`, «Ejecución recurrente»: `detectado_en` es el instante de la llamada, pero «la fila aparece en la base después [...] lo que tarden en procesarse [...] las organizaciones anteriores» y «ese tiempo [...] no se acota».
  - El mismo requisito admite que una ejecución más larga que el intervalo retrasa todavía más la detección.
- **Regla que se rompe y fallo observable:** se rompen RNF-3 y HU-07.CA-15; una llamada de las 09:05 puede llegar a una organización a las 09:30, crear entonces la fila con `detectado_en = 09:05` y aparentar que cumplió el plazo aunque el reporte no estuvo disponible durante 25 minutos.

### 5. ALTO — La recuperación tras una caída contradice el requisito de reportar lo pendiente

- **Qué está mal:** la especificación descarta expresamente lo pendiente del día anterior, mientras el PRD y el criterio de aceptación ordenan recuperarlo cuando el sistema vuelva.
- **Evidencia:**
  - PRD v8, RNF-4: «Si el sistema estuvo fuera de servicio a la hora del reporte, al volver reporta lo pendiente».
  - Backlog v5, HU-07.CA-11: «cuando vuelve, reporta lo pendiente de ese día».
  - `openspec/specs/no-reportados/spec.md`, «Recuperación tras una caída», escenario «lo de ayer no se recupera»: «no se crea ningún no reportado con fecha de ayer».
- **Regla que se rompe y fallo observable:** una caída desde antes del vencimiento hasta la mañana siguiente hace desaparecer definitivamente todos los no reportados del día anterior, pese a RNF-4; el sistema vuelve sin reportar lo pendiente y sin que el README lo declare entre los riesgos de la entrega.

### 6. ALTO — H-4 no contiene la comprobación de disponibilidad que la especificación le atribuye

- **Qué está mal:** la especificación delega en H-4 comprobar el límite de intentos y qué dirección IP ve el proveedor, pero el ticket H-4 no incluye esa comprobación.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, «Riesgos aceptados», riesgo del límite por IP: «H-4 lo comprueba [...] y comprueba también qué dirección ve el servicio».
  - `docs/trazabilidad/05-Tickets/Recorte-Entrega-20261119-v4.md`, §3, H-4: enumera solo correo real, aviso en menos de cinco segundos y repetición de P1, P2 y P5 con la marca segura de la cookie.
  - `readme.md`, §0.4 y §2.6: también presenta únicamente esas tres comprobaciones.
- **Regla que se rompe y fallo observable:** queda sin cubrir RA-10 y la comprobación prometida por la especificación; si el proveedor ve únicamente la IP del servidor, una persona puede agotar el límite compartido y bloquear la entrada de todas las cuentas sin impedir el cierre de H-4.

### 7. ALTO — Las huellas no impiden modificar las copias históricas si se actualiza también el índice

- **Qué está mal:** el supuesto control de inmutabilidad compara dos valores del mismo commit y no detecta que el archivo y su huella hayan cambiado juntos.
- **Evidencia:**
  - `scripts/verificar-referencias.py`, bloque del índice: calcula `huella(base / rel)` y la compara únicamente con `h`, leído del `docs/trazabilidad/README.md` actual.
  - `docs/trazabilidad/README.md`, «Cómo se comprueba»: afirma que falla «si [...] alguien lo cambió después de subirlo».
  - `tests/harness/prueba-verificar-referencias.py`, caso «huella que no coincide»: solo altera la huella para provocar una discrepancia; no prueba cambiar simultáneamente archivo e índice.
- **Regla que se rompe y fallo observable:** se rompe la inmutabilidad prometida por D-91 y `CLAUDE.md` §7; alguien puede alterar una revisión histórica, recalcular sus 12 caracteres, actualizar la fila del índice y obtener «toda referencia resuelve».

### 8. ALTO — El verificador no puede garantizar que “todo lo que se sube” cite un origen

- **Qué está mal:** solo valida algunas referencias ya existentes dentro de una lista cerrada de documentos; no exige que un archivo o una afirmación tenga origen.
- **Evidencia:**
  - `CLAUDE.md`, §7: «Todo lo que se sube cita su origen».
  - `scripts/referencias.txt`, `[vivos]`: solo incluye `readme.md`, `prompts.md`, `CLAUDE.md`, el índice, las tres especificaciones y el PRD vigente.
  - `scripts/verificar-referencias.py`: recorre exclusivamente `vivos` y comprueba tokens encontrados; no hay ninguna regla que falle por ausencia total de una cita.
  - Quedan fuera, entre otros, `.github/workflows/ci.yml`, `scripts/*.py`, `tests/harness/*.py` y el código de aplicación.
- **Regla que se rompe y fallo observable:** se rompe D-91; un archivo nuevo sin ninguna referencia, o una afirmación nueva sin origen dentro de un archivo no cubierto por `[vivos]`, pasa en verde porque el verificador no tiene nada que revisar.

### 9. ALTO — La prueba del verificador no cubre “un positivo y un negativo por regla” y deja familias enteras sin validar

- **Qué está mal:** el verificador ignora varios identificadores usados como trazabilidad y la prueba no contiene negativos para la mayoría de las familias que afirma cubrir.
- **Evidencia:**
  - `scripts/verificar-referencias.py`, `FAMILIAS`: solo contempla D, PA numérico, HU con forma de ticket, H, RF, RNF, RA, R y E.
  - No reconoce criterios como `HU-07.CA-20`, puntos `PA-B10` o `PA-P5`, ni métricas o notas como M-4 y N-1.
  - `tests/harness/prueba-verificar-referencias.py`, `CASOS`: los únicos negativos de identificador son D-99 y HU-09.9; no hay un negativo por PA, H, RF, RNF, RA, R o E.
  - La cabecera de esa prueba y `readme.md` §2.6 afirman «un caso positivo y uno negativo por regla».
- **Regla que se rompe y fallo observable:** la prueba no demuestra lo que declara; referencias inexistentes como `HU-99.CA-99` o `PA-B99` no producirían error, pero la CI anunciaría que el verificador detecta cada tipo de cita rota.

### 10. MEDIO — La compatibilidad con Node 20 se afirma sin probarse

- **Qué está mal:** el README declara soporte para Node 20 o superior, pero la única versión ejecutada en CI es Node 22.
- **Evidencia:**
  - `readme.md`, §1.4: «Node 20 o superior».
  - `.github/workflows/ci.yml`, trabajo `aplicacion`: `node-version: 22`, sin matriz ni ejecución adicional con Node 20.
- **Regla que se rompe y fallo observable:** la instrucción de instalación depende de un supuesto no garantizado; una dependencia, script o compilación puede funcionar en Node 22 y fallar en Node 20 mientras toda la CI permanece verde.

## Sospecha separada

- `openspec/specs/acceso/spec.md`, «Separación por organización en la base», señala que `docs/trazabilidad/06-Spec-viva/HU-01.6-prueba-local-resultado-20261118.txt` contiene la salida completa de autenticación y un `session_id`. Sin el contenido de ese archivo no se puede afirmar que publique pases, tokens o datos reutilizables, pero una salida completa de autenticación en un repositorio público merece inspección manual específica; no la elevo a hallazgo porque el fragmento suministrado no muestra esos valores.
