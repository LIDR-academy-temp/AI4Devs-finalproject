---
paths:
  - "**/*Pruebas*.sql"
  - "**/templates/pruebas.sql"
---

## Pipeline SDD — pruebas (endurecimiento de calidad, Unidad 7)

Fase entre `design.md` e `impl`. El plan de pruebas se DISEÑA en `design.md`
(Plan de pruebas / Testing Trophy / CHAR-x / TC-INV-x); esta fase produce el
**script ejecutable** y lo verifica. La implementación del SP viene DESPUÉS.

1. **Regla de Oro (no negociable):** el humano define el *qué* (casos y asertos
   de negocio); la IA implementa el *cómo*. Prohibido "Test Theater" (tests
   tautológicos que solo confirman lo que el código hace). Nunca alterar un test
   para que pase: se corrige la lógica.

2. **Cobertura mínima obligatoria** (el hook `check-tests-green.ps1` bloquea el
   Write/Edit del script si falta):
   - ≥1 caso **Happy** por CA del `spec.md`.
   - ≥1 caso **Negativo/Error** (código `5xxxx`, `'Error'`, `actionable=0`, borde
     de dominio). Sin esto el guardado se **rechaza**.
   - Si el ticket es Refactor: un `TC-CHAR-x` por cada `CHAR-x` (paridad).
   - Si hay bug confirmado: un caso `[ROJO]` que aserta el comportamiento
     **correcto** y falla hasta el fix.

3. **Characterization primero (legacy):** antes de tocar código sin tests,
   capturar el comportamiento actual (aunque sea un bug) y marcar
   `defecto probable | ambigüedad | regla no documentada`. No inventar reglas.

4. **Edge cases de dominio:** incluir los que la IA no deduce del código
   (invariantes de negocio, concurrencia, cupos, país/tenant, idempotencia).
   Apoyarse en el profile del target en scope.

5. **Verificación por MCP (read-only):** ejecutar el suite contra
   `mcp__<MCP_TEST>__execute_sql` en `TRAN+ROLLBACK` y anotar en el encabezado:
   `-- [OK] TESTS [<entorno>] → <N> PASS / <M> ROJO esperado`.
   El hook rechaza el script sin esa anotación (suite no ejecutado).

6. **Gotchas T-SQL** (no romper el andamiaje): no recrear el mismo `#temp` en un
   batch; `CONCAT()`/`NEWID()` no son argumento de `EXEC` (pre-construir en
   variable); `INSERT..EXEC` no funciona sobre SP con `FOR JSON` (validar por
   tablas base + contrato JSON en la capa API); aislar con `TRAN+ROLLBACK`;
   fixture idempotente (no acoplar a IDs de un fixture externo).

7. **Paso adversarial (endurecimiento):** antes de dar el suite por bueno en SP
   de negocio (comisiones, pedidos, inventario, afiliación) o cambios difíciles
   de revertir, aplicar la skill `abogado-del-diablo` o lanzar un refutador
   (`Explore`) con el mandato de **destruir** cada caso/hallazgo. Si encuentra
   refutación con evidencia → reabrir el diseño de pruebas.

8. **Shift-left (impl):** no se implementa un SP de negocio (`*_business_sps.sql`)
   sin que exista su `*Pruebas*.sql` en la misma carpeta. El hook lo bloquea.

9. **Handoff:** al cerrar, dejar la instrucción lista para el implementador
   (Cursor `/ejecutar`): fixes anclados a marcadores de código (nunca líneas),
   cada uno con su caso de prueba, y las decisiones de negocio BLOQUEADAS
   explícitas (no inventar).
