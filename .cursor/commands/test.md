# test

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Fase **TEST** del SDD: convierte la matriz de pruebas de `design.md` en el script
ejecutable del requerimiento, **antes** de implementar (TDD real: nace en ROJO).

- **Automática:** corre sola al final de `/diseñar` (paso 11.6) y al generar el SDD
  con la skill `sdd-workflow`. No hay que invocarla.
- **Manual:** `/test tkt-<id>` — para regenerarla tras cambiar `design.md`, o para un
  requerimiento diseñado antes de que existiera esta fase.

---

## Objetivo

Que el requerimiento llegue a `/ejecutar` con su `*Pruebas*.sql` ya escrito,
corrido en `<MCP_TEST>` y con los asertos **congelados**. El implementador hace
pasar los tests; no los inventa ni los ajusta a su código.

---

## Entrada requerida — Graph

```txt
<RUTA_PLANNING>\tkt-<id>\
├── _index.md    ← estado DISEÑO PENDIENTE REVISIÓN o LISTO PARA EJECUTAR
├── spec.md      ← CA [M] e invariantes
└── design.md    ← sección "Plan de pruebas" (matriz TC-*) con la pasada abogado-del-diablo hecha
```

---

## Flujo obligatorio

1. Leer `_index.md` → validar estado: `SPEC PENDIENTE` (solo cuando corre automática dentro de
   `/diseñar`, paso 11.6), `DISEÑO PENDIENTE REVISIÓN` o `LISTO PARA EJECUTAR` (manual).
2. Leer `spec.md` (CA `[M]`, invariantes) y la sección **Plan de pruebas** de `design.md`.
   - La matriz de `design.md` es la **fuente única** de casos y valores esperados.
     Este comando NO crea otra matriz: la materializa.
   - Si falta un caso Happy por CA `[M]`, el `TC-ERR-x` negativo, el `TC-CHAR-x`
     (Refactor) o el caso `[ROJO]` (Bug Fix) → completar primero la matriz en
     `design.md` (y anotarlo en su log), luego seguir.
3. Generar `<yyyymmdd>_<TKT>_PruebasUnitarias.sql` en `<RUTA_PLANNING>\tkt-<id>\`
   desde `sdd-toolkit/templates/pruebas.sql` (agente `tester-sql`):
   - Un bloque por fila de la matriz, con el **mismo ID** (`TC-INV-x`, `TC-ERR-x`, `TC-CHAR-x`…)
     y el `Expected` **idéntico** al de `design.md`.
   - SP que escribe (`prcSet*`): materializar la tabla «Contratos de escritura» —
     `TC-IDEM` (ejecutar 2 veces, contar efectos durables = 1) obligatorio; `TC-CONC`,
     `TC-PARC`, `TC-EST` según la tabla. El hook rechaza el script sin `TC-IDEM`.
   - Fixture propio dentro de `BEGIN TRAN ... ROLLBACK`; prohibido depender de datos
     que "ya estén" en test (PG recargado por API, catálogos distintos TEST/PROD).
   - Objetos que aún no existen (SP/tabla/columna nueva): invocarlos vía
     `EXEC sys.sp_executesql` dentro de `TRY/CATCH` → el caso queda ROJO en vez de
     abortar el batch.
4. Si hay endpoints en scope: generar `<TKT>_api_tests.http` (agente `api-tester`)
   con los mismos IDs de caso, incluido el negativo.
5. Verificar fixtures y correr el suite en `<MCP_TEST>` (read-only, TRAN+ROLLBACK).
   Resultado esperado **antes de implementar**:
   - Characterization / comportamiento que no cambia → PASS.
   - Comportamiento nuevo o bug a corregir → ROJO.
   - Si un caso nuevo sale PASS antes de implementar → el test no prueba nada
     (Test Theater) o el cambio ya existe: revisar el caso, no seguir.
6. Anotar la evidencia en el encabezado del script:
   `-- [OK] TESTS [<entorno>] -> <N> PASS / <M> ROJO esperado`
   (el hook `check-tests-green` la exige y acepta ROJO esperado).
7. **Mutation en paths críticos** (negocio/financiero/gates): listar en el script los
   3 mutantes T-SQL a probar en `/ejecutar` (WHERE, operador, umbral) y qué caso
   debe matarlos. Si ningún caso mataría uno → falta un test: agregarlo a la matriz.
8. Pasada adversarial (`abogado-del-diablo`) sobre el suite en SP de negocio:
   ¿algún caso pasa con una implementación equivocada? Si sí → reforzar el aserto.
9. Actualizar `_index.md`: fila `Test` en la tabla Graph + log. El estado **no cambia**.
10. **Re-sellar el diseño** (sobre todo en corrida manual): `python sdd-toolkit/tools/sello.py registrar --tkt-dir <carpeta> --fase diseno`.
    Si el requerimiento ya estaba en `LISTO PARA EJECUTAR` y cambió la matriz o un `Expected`,
    pedir al usuario que reconfirme el design antes de `/ejecutar`.

---

## Asertos congelados

A partir de aquí los `Expected` del script son contrato:

- `/ejecutar` hace pasar los casos ROJO cambiando el **código**, nunca el aserto.
- Si un aserto está mal de verdad → corregirlo en la matriz de `design.md` y en el
  script, registrarlo en `impl.md` como `⚠ Ajustado` con la justificación.
- `/revisar` compara los `Expected` del script final contra la matriz de `design.md`
  y bloquea cualquier diferencia sin justificar.

---

## Stop conditions — DETENTE aquí

1. `design.md` no existe o no tiene sección "Plan de pruebas" → devolver a `/diseñar`.
2. La matriz no tiene ≥1 caso negativo (`TC-ERR-x`) y no puede derivarse del spec → preguntar, no inventar.
3. Un valor esperado depende de una regla de negocio no documentada → marcar `BLOQUEADO` en la matriz; no asumir.
4. `<MCP_TEST>` no disponible → guardar el script con
   `-- [PENDIENTE] TESTS [<entorno>] -> sin ejecutar: <motivo>` (el hook lo acepta) y avisar.
   `/ejecutar` no arranca hasta que el suite corra y tenga `[OK]`.

## Done-state

- [ ] `<yyyymmdd>_<TKT>_PruebasUnitarias.sql` en la carpeta del requerimiento, un bloque por fila de la matriz.
- [ ] ≥1 caso negativo + characterization (Refactor) + `[ROJO]` (Bug Fix) según aplique.
- [ ] Corrido en `<MCP_TEST>`; evidencia `-- [OK] TESTS [..] -> N PASS / M ROJO esperado`.
- [ ] Ningún caso nuevo en PASS antes de implementar.
- [ ] Mutantes de paths críticos listados con el caso que los mata.
- [ ] `.http` si hay endpoints.
- [ ] `_index.md` con fila `Test` + log.
- [ ] Sello `diseno` registrado.

## Reglas

- No implementar el SP/endpoint: solo el test.
- No modificar archivos productivos.
- No escribir la evidencia sin haber corrido el suite.
- El humano define el *qué*; prohibido Test Theater (ver `rules/pipeline-test.md`).

---

## Actualización obligatoria: _index.md

```md
| Test | [<yyyymmdd>_<TKT>_PruebasUnitarias.sql](<yyyymmdd>_<TKT>_PruebasUnitarias.sql) | /test | Creado (N PASS / M ROJO) |
```

```md
| yyyy-mm-dd | <estado actual> | <mismo estado> | /test | Suite generado: N PASS / M ROJO esperado · sello diseno |
```

## Resultado esperado

```md
### Fase TEST

- Script: `<yyyymmdd>_<TKT>_PruebasUnitarias.sql`
- Evidencia: N PASS / M ROJO esperado [<entorno>]
- Casos: TC-... (Happy) · TC-ERR-... (negativo) · TC-CHAR-... · [ROJO] ...
- Mutantes críticos: ...

### Siguiente comando

Confirmar design → `/ejecutar tkt-<id>` (hace pasar a VERDE sin tocar asertos)
```
