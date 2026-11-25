# Revisión adversarial

- Fecha: 2026-11-24 00:05 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-temporal>/encargo-tramo2-ronda1.md` · huella `638ca86f42f4` · 2558 caracteres
- Archivo: `<espacio-temporal>/diff-tramo2-dfb8530.diff` · huella `9039fbc449ca` · 106883 caracteres
- Archivo: `openspec/specs/acceso/spec.md` · huella `48727b0d2ea3` · 34159 caracteres
- Archivo: `CLAUDE.md` · huella `b3a6de4e3913` · 10176 caracteres
- Archivo: `openspec/plantillas/migracion-controlada.sql` · huella `396f2b91354d` · 8642 caracteres
- Archivo: `docs/trazabilidad/05-Tickets/Recorte-Entrega-20261119-v4.md` · huella `c6d68d085af4` · 8225 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. ALTO — La comprobación de estructura incumple expresamente la regla sobre `TRIGGER` y `REFERENCES`

- **Qué está mal:** `CLAUDE.md` afirma que la comprobación falla si una tabla conserva `TRIGGER` o `REFERENCES`, pero el SQL declara que no los vigila.
- **Evidencia:**
  - `CLAUDE.md`, §5: «La comprobación de estructura [...] falla si falta algo de esto», después de exigir ausencia de `TRUNCATE`, `TRIGGER` y `REFERENCES`.
  - `supabase/comprobaciones/estructura.sql`, apartado `LÍMITES DECLARADOS`: «No revisa los privilegios TRIGGER y REFERENCES».
  - El CTE `fallas` solo usa `has_table_privilege(..., 'TRUNCATE')`.
- **Regla que se rompe y fallo observable:** una tabla futura puede conservar `TRIGGER` o `REFERENCES` para `anon` o `authenticated` y `comprobar-estructura.py` informará «sin fallas», contradiciendo la garantía central de HU-03.1 y `CLAUDE.md`.
- **Corrección mínima:** incorporar ambos privilegios a la comprobación y casos negativos independientes para cada uno.

### 2. ALTO — La CI no garantiza la validación 1 a 1 de cada migración

- **Qué está mal:** el corredor ejecuta los archivos de validación existentes, pero nunca compara la lista de migraciones con la lista de validaciones.
- **Evidencia:**
  - `scripts/base/correr-validaciones.py`, `main`: `sorted(CARPETA.glob("*.sql"))`; no enumera `supabase/migrations/` ni comprueba correspondencia de nombres.
  - `CLAUDE.md`, §5: «Cada migración lleva su validación 1 a 1».
  - `.github/workflows/ci.yml`, trabajo `base`: solo ejecuta `python3 scripts/base/correr-validaciones.py`.
- **Regla que se rompe y fallo observable:** una migración futura puede agregarse sin validación; si su estructura satisface el comprobador general, la CI ejecutará únicamente las validaciones antiguas y quedará verde sin detectar la ausencia.
- **Corrección mínima:** fallar cuando falte una validación con la misma numeración para cualquier migración, o cuando exista una validación huérfana.

### 3. ALTO — Ninguna prueba demuestra que `es_mi_organizacion()` responda siempre falso en el tramo 2

- **Qué está mal:** la validación excluye deliberadamente el cuerpo y afirma que las pruebas con datos lo cubren, pero todas las pruebas de acceso pueden pasar aunque la función devuelva `true`.
- **Evidencia:**
  - `supabase/migrations/20261123170000_organizacion.sql`, bloque 4: `SELECT false;`.
  - `supabase/validaciones/20261123170000_organizacion.sql`, cabecera: «Lo que no comprueba: el cuerpo de es_mi_organizacion [...] Lo que hace se prueba con datos».
  - La misma migración declara que solo existe una política restrictiva y ninguna permisiva.
  - `tests/base/prueba-acceso-organizacion.py`, casos N3–N17: no hay llamada directa a `es_mi_organizacion`; N12–N16 prueban la tabla bajo RLS.
- **Regla que se rompe y fallo observable:** PostgreSQL deniega todo cuando solo hay políticas restrictivas y ninguna permisiva. Por ello, si el cuerpo cambiara accidentalmente a `SELECT true`, N12–N16 seguirían sin ver ni cambiar filas y la suite quedaría verde. D-100 no está realmente verificada.
- **Corrección mínima:** probar directamente el resultado de la función, o añadir temporalmente una política permisiva dentro de una transacción para demostrar que la condición restrictiva es la que rechaza.

### 4. ALTO — La especificación asegura una repetición en H-4 que el ticket de H-4 no contiene

- **Qué está mal:** la nota nueva de la especificación dice que H-4 repetirá la comprobación de `sesion_abierta()` en el servicio gestionado, pero H-4 solo exige repetir otras pruebas de HU-01.6.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, nota añadida bajo «Separación por organización en la base»: «Como lo demás probado en local, H-4 lo repite en el servicio gestionado».
  - `docs/trazabilidad/05-Tickets/Recorte-Entrega-20261119-v4.md`, sección 3, fila H-4: exige repetir P1, P2 y P5 de HU-01.6; no menciona ejecutar `sesion_abierta()`, consultar `auth.sessions` desde la base ni las pruebas P1/N1/P2 de `prueba-acceso-organizacion.py`.
- **Regla que se rompe y fallo observable:** H-4 puede cerrarse cumpliendo literalmente su ticket aunque la función `SECURITY DEFINER` no pueda leer `auth.sessions` en el entorno gestionado. La afirmación de la spec quedaría sin verificación.
- **Corrección mínima:** convertir la repetición de esos casos concretos en criterio explícito de H-4.

### 5. ALTO — Las pruebas de la validación no cubren “cada desvío de la especificación” como afirman

- **Qué está mal:** la validación produce 20 filas, pero la prueba no tiene un caso negativo para numerosas filas y ramas críticas.
- **Evidencia:**
  - `supabase/validaciones/20261123170000_organizacion.sql`, CTE `filas`, comprobaciones 1 a 20.
  - `tests/base/prueba-validacion-organizacion.py`, `CASOS`: solo N1–N14 y dos positivos.
  - `readme.md`, tabla de pruebas: «marca cada desvío de la especificación en su fila».
  - No existen casos negativos específicos para, entre otros: tabla ausente; definición de `id`; PK; UNIQUE de `nombre`; RLS desactivado; política que deja de ser `FOR ALL`, `TO PUBLIC`, cambia `USING` o `WITH CHECK`; pérdida de ejecución por `authenticated`; y concesiones `TRIGGER` o `REFERENCES`.
- **Regla que se rompe y fallo observable:** por ejemplo, la lógica de la fila `constraint organizacion_pkey` podría quedar hardcodeada para devolver el valor esperado y ninguna prueba negativa lo detectaría. La CI podría aprobar una validación incapaz de detectar una PK incorrecta.
- **Corrección mínima:** añadir al menos un desvío negativo por cada fila y por cada privilegio agrupado que represente una condición independiente.

### 6. ALTO — `sesion_abierta()` no tiene prueba negativa de vinculación entre sesión y cuenta

- **Qué está mal:** la condición `s.user_id = auth.uid()` es una frontera de seguridad, pero ninguna prueba fallaría si se eliminara.
- **Evidencia:**
  - `supabase/migrations/20261123170000_organizacion.sql`, función `public.sesion_abierta()`: condiciones `s.id = ...session_id...` y `s.user_id = auth.uid()`.
  - `tests/base/prueba-acceso-organizacion.py`, P1, N1 y P2: ambas sesiones pertenecen a la misma cuenta.
  - N2 usa una petición sin pase y espera 401/403; no ejecuta la función como `authenticated` con un pase sin `session_id`.
  - No hay caso con `session_id` de otra cuenta ni con un pase firmado para otro rol.
- **Regla que se rompe y fallo observable:** si se elimina la comparación con `auth.uid()`, P1, N1 y P2 siguen dando el mismo resultado. La suite no detectaría que la función acepta una sesión abierta perteneciente a otra cuenta.
- **Corrección mínima:** cubrir por separado sesión de otra cuenta, pase autenticado sin `session_id` y pase cuyo rol no puede ejecutar la función.

### 7. MEDIO — `CLAUDE.md` contradice la excepción de la tabla `organizacion`

- **Qué está mal:** la regla documental dice que toda tabla de negocio nace con `organizacion_id`, aunque la especificación y la propia migración establecen la excepción de `organizacion`.
- **Evidencia:**
  - `CLAUDE.md`, §5: «Toda tabla de negocio nace con `organizacion_id` no nulo».
  - `openspec/specs/acceso/spec.md`, sección «Datos»: «Toda tabla lleva `organizacion_id` salvo `organizacion`».
  - Requisito «Separación por organización en la base»: para `organizacion`, la regla debe comparar su `id`.
  - `supabase/migrations/20261123170000_organizacion.sql`: la tabla no contiene `organizacion_id`.
- **Regla que se rompe y fallo observable:** el documento de proceso marca como incumplidor al ejemplo que él mismo recomienda. Un cambio futuro no puede obedecer simultáneamente ambas instrucciones.
- **Corrección mínima:** hacer explícita la misma excepción en la regla de `CLAUDE.md`.

### 8. MEDIO — El script acepta como válida una comprobación que recorrió cero tablas

- **Qué está mal:** la documentación declara que una comprobación que no recorrió nada debe fallar, pero el código solo exige que exista cualquier línea `RESUMEN`.
- **Evidencia:**
  - `scripts/base/comprobar-estructura.py`, docstring: «una comprobación que no recorrió nada no comprueba».
  - En `main`, la única condición es `if resumen is None`; no interpreta ni exige que el resumen tenga al menos una tabla.
  - `supabase/comprobaciones/estructura.sql` siempre emite `RESUMEN`, incluso con `0 tablas`.
- **Regla que se rompe y fallo observable:** si una regresión en la selección de esquemas excluye todas las tablas, el script imprimirá «sin fallas (… 0 tablas …)» y terminará con código 0.
- **Corrección mínima:** validar los contadores del resumen y rechazar cero tablas de negocio en este proyecto.

### 9. MEDIO — Los scripts no tienen mensajes propios cuando falta su archivo SQL

- **Qué está mal:** varios caminos de error terminan en un traceback de Python, pese a la regla de mensajes controlados.
- **Evidencia:**
  - `scripts/base/comprobar-estructura.py`, `main`: llama directamente a `COMPROBACION.read_text(...)` sin comprobar existencia ni capturar `OSError`.
  - `scripts/base/correr-validaciones.py`, `validar`: llama directamente a `fichero.read_text(...)` con el mismo problema.
  - `CLAUDE.md`, después de §5: «El mensaje de éxito o de error lo redactamos nosotros».
- **Regla que se rompe y fallo observable:** si `estructura.sql` falta, tiene permisos incorrectos o no puede leerse, la salida será una excepción `FileNotFoundError`/`OSError` de Python, no un mensaje propio que identifique la comprobación fallida.
- **Corrección mínima:** detectar y reportar de forma controlada los errores de lectura antes de ejecutar `psql`.
