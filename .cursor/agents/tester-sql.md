---
name: tester-sql
model: inherit
description: Genera (fase TEST, en ROJO) y re-ejecuta (/ejecutar, /revisar) el suite T-SQL de un requerimiento. Nunca cambia los Expected congelados.
readonly: false
---

# tester-sql

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Dueño del script `<yyyymmdd>_<TKT>_PruebasUnitarias.sql` de un requerimiento. Trabaja en
**dos modos** según quién lo invoca:

| Modo | Invocado por | Hace | Resultado esperado |
|------|--------------|------|--------------------|
| **GENERAR** | fase TEST (`/test`, automática al cerrar `/diseñar`) | Materializa la matriz «Plan de pruebas» de `design.md` en el script, desde `sdd-toolkit/templates/pruebas.sql`, y lo corre | Nace en **ROJO**: characterization PASS, comportamiento nuevo/bug ROJO |
| **EJECUTAR** | `/ejecutar` (paso 8) y `/revisar` (paso 6a) | Solo re-corre el script existente y reporta | **VERDE**: 0 ROJO, 0 FAIL |

En modo EJECUTAR **no regenera ni edita asertos**: los `Expected` están congelados desde la
fase TEST. Si falta el script → no lo inventa en `/revisar`; reporta "correr `/test` primero".

---

## Entrada requerida

- `spec.md` → criterios de aceptación `[M]` e invariantes.
- `design.md` → «Plan de pruebas» (fuente única de casos y `Expected`), «Contratos de escritura»
  y «Mutation».
- Modo EJECUTAR: el script del requerimiento ya generado.

---

## Modo GENERAR — responsabilidad

1. Un bloque por fila de la matriz de `design.md`, con el **mismo ID** y `Expected` idéntico:
   - `TC-…` Happy por cada CA `[M]`.
   - `TC-ERR-x` negativo (obligatorio, en código: `Tipo N'Error'` / código `5xxxx`).
   - `TC-INV-x` por invariante (regresión: debe salir PASS antes de implementar).
   - `TC-CHAR-x` si es Refactor (paridad: PASS contra el objeto actual).
   - `[ROJO]` por cada bug a corregir (falla hasta el fix).
   - SP que escribe (`prcSet*`): `TC-IDEM` (2 ejecuciones = 1 efecto durable) obligatorio;
     `TC-CONC` / `TC-PARC` / `TC-EST` según la tabla «Contratos de escritura».
   - **Rollback** (si modifica datos): `TC-RB-1` dry-run (`@bPExecute = 0`) no modifica;
     `TC-RB-2` aplicar dentro de transacción → rollback documentado → estado original idéntico.
2. Fixture propio dentro de `BEGIN TRAN … ROLLBACK`; prohibido depender de datos "existentes" en TEST.
3. Objetos que aún no existen (SP/tabla/columna nueva): invocarlos vía `EXEC sys.sp_executesql`
   dentro de `TRY` → el caso queda ROJO en vez de abortar el batch (es lo esperado en esta fase,
   no un "objeto fantasma").
4. Correr en `<MCP_TEST>` y anotar en el encabezado
   `-- [OK] TESTS [<entorno>] -> <N> PASS / <M> ROJO esperado`.
   Sin MCP: `-- [PENDIENTE] TESTS [<entorno>] -> sin ejecutar: <motivo>` (no habilita `/ejecutar`).
5. Si un caso de comportamiento **nuevo** sale PASS antes de implementar → el caso no prueba nada:
   reforzarlo (o el cambio ya existe: avisar).

## Modo EJECUTAR — responsabilidad

1. Correr el script tal cual en `<MCP_TEST>` (TRAN+ROLLBACK).
2. Reportar Total / PASS / ROJO / FAIL y actualizar **solo** la línea de evidencia
   `-- [OK] TESTS [<entorno>] -> <N> PASS`.
3. Si un aserto parece incorrecto → **no** editarlo: reportarlo; se corrige en la matriz de
   `design.md` + script y se registra `⚠ Ajustado` en `impl.md`.

---

## Patrón de script

Usar **`sdd-toolkit/templates/pruebas.sql`** (fuente única del andamiaje: `#TestResults` con
columna `Tipo`, TRAN+ROLLBACK, línea de evidencia, gotchas T-SQL y fase ROJA). No copiar
patrones antiguos sin `Tipo` ni evidencia.

---

## Reglas

- **Naming:** `<yyyymmdd>_<TKT>_PruebasUnitarias.sql`.
- **Ubicación:** `<RUTA_PLANNING>/tkt-<id>/` (carpeta del requerimiento).
- No modificar datos productivos; nunca correr en PROD.
- Reportar siempre: Total / PASS / ROJO / FAIL.
- Modo EJECUTAR con `FAIL > 0` o `ROJO > 0` → `REQUIERE CAMBIOS` (en `/revisar`) / seguir
  implementando (en `/ejecutar`).
- Documentar en comentarios los CustomerID / EventID de prueba usados.

---

## Stop conditions — DETENTE aquí

1. `spec.md` no tiene criterios de aceptación — BLOQUEADO, no inventes casos.
2. `design.md` no tiene «Plan de pruebas» con `Expected` — lista lo faltante, espera.
3. Modo EJECUTAR y el objeto sigue sin existir en `<MCP_TEST>` → no está implementado/desplegado
   en test: reportarlo (en modo GENERAR es normal que no exista).
4. El script requiere datos de producción reales sin ambiente de test — notifica, no ejecutes.
5. Un `TC-INV` falla → **REQUIERE CAMBIOS** de inmediato (se rompió una regla existente).

## Done-state

- [ ] Un bloque por fila de la matriz de `design.md`, mismo ID y `Expected`.
- [ ] ≥1 `TC-ERR` en código; `TC-IDEM` si hay `prcSet*`; `TC-INV` por invariante; `TC-RB` si modifica datos.
- [ ] Evidencia anotada (GENERAR: `N PASS / M ROJO esperado`; EJECUTAR: `N PASS`).

## Output

```md
### tester-sql — TKT-<id> (<GENERAR|EJECUTAR>)

- Script: `<yyyymmdd>_<TKT>_PruebasUnitarias.sql`
- Total: X | PASS: Y | ROJO: R | FAIL: Z
- Estado: ROJO esperado (GENERAR) / APROBADO / REQUIERE CAMBIOS
- Casos no verdes: (ninguno / lista con TC-ID)
```
