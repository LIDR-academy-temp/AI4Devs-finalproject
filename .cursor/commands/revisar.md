# revisar

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Verifica una implementación SDD contra la spec, criterios de aceptación, pruebas y auditorías.

Este comando NO implementa features nuevas. Solo valida, detecta desviaciones y actualiza el estado.

---

## Objetivo

Confirmar que la implementación cumple con:

- user story refinada
- alcance definido
- criterios de aceptación
- **pruebas unitarias T-SQL** (patrón `#TestResults` — agente `tester-sql`)
- **pruebas de contrato C# xUnit** (artefactos SQL — `<REPO_SQL>.Tests/`)
- **pruebas de API** (endpoints <PROYECTO_API> — archivos `.http`)
- reglas del proyecto
- auditorías obligatorias

---

## Entrada requerida — Graph

Debe existir la carpeta del requerimiento con:

```txt
<RUTA_PLANNING>\tkt-<id>\
├── _index.md    ← con estado EN REVISIÓN
├── spec.md      ← criterios de aceptación y alcance
├── design.md    ← plan técnico y plan de pruebas
└── impl.md      ← implementación realizada
```

Leer `_index.md` → `spec.md` (criterios) → `design.md` (plan de pruebas) → `impl.md` (qué se hizo).

---

## Flujo obligatorio

1. Leer `_index.md` → validar estado `EN REVISIÓN`.
1.5. **Frescura del VERDE:** obtener por MCP el hash actual de cada objeto del sello
   (`SELECT CONVERT(varchar(64), HASHBYTES('SHA2_256', OBJECT_DEFINITION(OBJECT_ID('<schema.objeto>'))), 2)`) y correr
   `python sdd-toolkit/tools/sello.py verificar --tkt-dir <carpeta> --fase verde --obj <schema.objeto>=<HASH> ...`.
   `VIEJO` → el código cambió después de las pruebas: re-correr el suite antes de revisar
   (nunca aprobar sobre un VERDE viejo). `SIN SELLO` → tratar como VERDE no verificado.
2. Leer `spec.md` → criterios de aceptación y alcance.
3. Leer `design.md` → plan técnico y plan de pruebas.
4. Leer `impl.md` → implementación realizada y ajustes.
4.5. **Verificación de completitud** (antes de tests y auditoría — detener aquí si falla):
   Chequear tres dimensiones:
   - **Completitud**: ¿cada CA `[M]` de `spec.md` tiene un resultado explícito en `impl.md`?
   - **Corrección**: ¿`impl.md` implementa exactamente lo del `spec.md`, sin scope creep?
   - **Coherencia**: ¿los objetos/archivos de `impl.md` coinciden con los declarados en `design.md`?

   Si ≥1 dimensión falla: documentar los gaps en `impl.md` (agregar sección `## Gaps pre-revisión`),
   cambiar estado a `REQUIERE CAMBIOS` en `_index.md` y devolver al implementador.
   **No ejecutar tests ni auditorías sobre un `impl.md` incompleto.**
5. Comparar implementación vs spec + design.
6. **Ejecutar ciclo de pruebas completo:**
   a. Invocar `tester-sql` (modo EJECUTAR) → re-correr el suite de la fase TEST (si hay SQL).
   b. Ejecutar C# xUnit si hay artefactos DDL (`dotnet test <REPO_SQL>.Tests`).
   c. Invocar `api-tester` → generar/verificar `.http` y ejecutar pruebas de API (si hay endpoints).
7. Ejecutar auditorías:
   - `auditor-sql` si hubo SQL
   - `auditor-codigo` si hay C#/JS/Python (no aplica a Flutter puro)
   - Si el cambio incluye Dart/Flutter → ejecutar `auditor-flutter`; stop si devuelve **RIESGOSO**
   - `auditor-seguridad` si hay endpoints o SQL con input externo
8. Detectar desviaciones.
9. Si hay hallazgos corregibles → `corrector-revision`.
10. Reauditar si hubo correcciones.
11. Actualizar `impl.md` con verificación final.
11.5. **Reporte de APIs para Front — AUTOMÁTICO (no se pide).** Si el requerimiento
    creó o modificó endpoints (sección `backend:<instancia>` en `design.md`, o
    `Controllers/` / DTOs en "Archivos modificados" de `impl.md`) **y** el resultado
    es `LISTO PARA PR`, generar en el mismo turno `TKT-<Numero>-APIS.md` en
    `<RUTA_PLANNING>\tkt-<id>\` desde `sdd-toolkit/templates/apis.md`:
    - **Solo** APIs creadas o modificadas — no vistas, SPs ni objetos internos.
    - Redactado para un Front sin contexto previo del proyecto ni del ticket.
    - Por endpoint: descripción, método (GET/POST/DELETE), header `Parameters` /
      body de ejemplo y **respuesta JSON real**: obtenerla ejecutando el SP/endpoint
      en `<MCP_TEST>` (o del `.http` ya corrido en el paso 6c) — nunca inventada.
      Si se modificó un endpoint existente, documentar el JSON vigente completo.
    - Variante A (CRUD, varios verbos) / Variante B (acción única). Catálogos → valores
      base. Respuesta atípica (FOR JSON anidado, paginación, doble parseo) →
      `⚠️ Nota de consumo`. Tabla resumen de endpoints al final.
    - Si ya existe `TKT-<Numero>-APIS.md` (re-revisión) → actualizarlo, no duplicar.
    - Resultado `REQUIERE CAMBIOS`/`RIESGOSO` → no generarlo todavía (el contrato aún
      puede cambiar); anotar en Pendientes "APIS.md se genera al aprobar".
    - Sin endpoints en scope → no generar; anotar "APIS.md: No aplica (sin endpoints)".
11.6. **Sello de revisión** (solo si `LISTO PARA PR`). Si los pasos 9–10 corrigieron código →
    re-correr el suite (0 ROJO / 0 FAIL) y re-sellar `verde` antes. Luego registrar
    `python sdd-toolkit/tools/sello.py registrar --tkt-dir <carpeta> --fase revisar --obj <schema.objeto>=<HASH> ...`.
12. Actualizar `_index.md` con nuevo estado y log (fila `APIs Front` en la tabla Graph si se generó).

---

## Stop conditions — DETENTE aquí

Para el flujo completo si ocurre cualquiera de estas condiciones:

1. `_index.md` no tiene estado `EN REVISIÓN` → indicar estado actual, no revisar.
2. `impl.md` no existe → no hay implementación que revisar; devolver a `/ejecutar`.
3. `tester-sql` devuelve `Failed > 0` en un TC-INV → bloqueo duro, no aprobar sin decisión explícita del usuario.
4. `auditor-sql` o `auditor-codigo` devuelven **RIESGOSO** → bloqueo duro, estado `RIESGOSO` en `_index.md`.
5. Criterios Must `[M]` sin cobertura de test verificada → no emitir `LISTO PARA PR`.
6. `*Pruebas*.sql` sin caso negativo, sin evidencia de ejecución, paths críticos sin mutation, o con `Expected` distinto a la matriz de `design.md` sin `⚠ Ajustado` justificado en `impl.md` → bloqueo duro, no emitir `LISTO PARA PR` (ver Pruebas — Bloqueos duros).

## Done-state

`/revisar` está completo cuando se cumple todo:

- [ ] `impl.md` actualizado con sección "Verificación final".
- [ ] `_index.md` actualizado al estado resultante con log.
- [ ] Todos los criterios Must `[M]` verificados o escalados con justificación.
- [ ] `tester-sql`: Failed = 0 (o justificado y registrado) — si hubo SQL.
- [ ] `frontend-tester`: tests Vitest + Playwright generados y ejecutados sin errores — si hubo frontend.
- [ ] `flutter-tester`: tests flutter test generados y ejecutados sin errores — si hubo mobile.
- [ ] `auditor-sql`: **APROBADO** (si hubo SQL).
- [ ] `auditor-codigo`: **APROBADO** (si hay C#/JS/Python).
- [ ] `auditor-flutter`: **APROBADO** — si hubo Dart/Flutter en scope.
- [ ] `auditor-seguridad`: **APROBADO** (si hubo endpoints o SQL con input externo).
- [ ] `Expected` del script = matriz de `design.md` (o `⚠ Ajustado` justificado en `impl.md`).
- [ ] Sello `verde` FRESCO al iniciar y sello `revisar` registrado (si `LISTO PARA PR`).
- [ ] `TKT-<Numero>-APIS.md` generado/actualizado con JSON real (si hubo endpoints y quedó `LISTO PARA PR`) — automático, paso 11.5.

## Agentes

| Agente | Cuándo invocar |
|--------|----------------|
| `tester-sql` | Siempre que haya SP / vista / función nueva o modificada |
| `api-tester` | Siempre que haya endpoints nuevos o modificados en <PROYECTO_API> |
| `frontend-tester` | Siempre que haya componentes / hooks / vistas frontend en scope |
| `flutter-tester` | Siempre que haya pantallas / widgets Flutter en scope |
| `auditor-sql` | Siempre que haya SQL |
| `auditor-codigo` | Si hay código SQL/C#/JS/Python (no aplica a Flutter puro) |
| `auditor-flutter` | Siempre que haya código Dart/Flutter en scope (condicional mobile) |
| `auditor-seguridad` | Siempre que haya endpoints o SQL con input externo |
| `corrector-revision` | Si auditoría devuelve `REQUIERE CAMBIOS` |

---

## Pruebas obligatorias

### 1. Pruebas unitarias T-SQL (`tester-sql`)

Invocar al agente `tester-sql` en **modo EJECUTAR** con el TKT-ID: re-corre el script de la fase
TEST sin regenerarlo ni tocar `Expected` (si falta → `/test`, no inventarlo aquí). IDs de caso:
`TC-INV`, `TC-ERR`, `TC-IDEM`, `TC-CHAR`, `[ROJO]` (los `TC-01` del patrón de abajo son ilustrativos).
El agente:
- Lee `spec.md` y `design.md` → extrae casos del plan de pruebas.
- Genera o verifica el script `<yyyymmdd>_<TKT>_PruebasUnitarias.sql`.
- El script usa el patrón `#TestResults`:

```sql
DROP TABLE IF EXISTS #TestResults;
CREATE TABLE #TestResults (
    TestID   INT IDENTITY(1,1),
    Grupo    NVARCHAR(100),
    TestName NVARCHAR(400),
    Expected NVARCHAR(100),
    Actual   NVARCHAR(100),
    Passed   BIT,
    Notes    NVARCHAR(500)
);

-- TC-01: <descripción del criterio de aceptación>
INSERT INTO #TestResults (Grupo, TestName, Expected, Actual, Passed, Notes)
SELECT
    '<grupo>',
    'TC-01: <descripcion>',
    '<esperado>',
    CAST(<expresion real> AS NVARCHAR(100)),
    CASE WHEN <expresion real> = <esperado> THEN 1 ELSE 0 END,
    NULL;

-- ... más casos ...

-- Resumen
SELECT TestID, Grupo, TestName, Expected, Actual,
       CASE Passed WHEN 1 THEN N'✓ PASS' ELSE N'✗ FAIL' END AS Result, Notes
FROM #TestResults ORDER BY TestID;

SELECT COUNT(*) AS Total, SUM(CAST(Passed AS INT)) AS Passed,
       COUNT(*) - SUM(CAST(Passed AS INT)) AS Failed
FROM #TestResults;
```

**Cobertura mínima:**
- 1 caso por cada criterio de aceptación de `spec.md`
- Happy path del objeto principal
- Edge cases del plan de pruebas de `design.md`
- Regresión: casos que fallaban antes del fix (si aplica)
- Null / valores límite

**Naming:** `<yyyymmdd>_<TKT>_PruebasUnitarias.sql`
**Ubicación:** `.planning/tkt-<id>/` o carpeta del dominio si es reutilizable.

---

### 2. Pruebas de contrato C# xUnit (`<REPO_SQL>.Tests/`)

Aplica cuando hay DDL nuevo (tablas, vistas, SPs).

Crear o actualizar `<Entidad>SqlContractTests.cs` con `Assert.Contains` para:
- `CREATE TABLE / CREATE OR ALTER VIEW / CREATE OR ALTER PROCEDURE`
- Columnas críticas y sus tipos
- Constraints, llaves foráneas e índices nombrados
- Condiciones de `WHERE` en vistas y parámetros en SPs

Ejecutar: `dotnet test <REPO_SQL>.Tests`

**Regla bloqueante:** No aprobar si `dotnet test` falla.

---

### 3. Pruebas de API (`.http` files)

Aplica cuando hay endpoints nuevos o modificados en <PROYECTO_API>.

Crear `<TKT>_api_tests.http` en la carpeta del requerimiento:

```http
### GET — <descripción>
GET {{host}}/<dominio>/<Controller>/<Action>
Content-Type: application/json
UserID: {{userId}}
Authorization: {{token}}
Environment: {{env}}
WindowName: TestWindow

{"ColumnNames": "*", "FiltroOpcional": "valor"}

### POST válido — <descripción>
POST {{host}}/<dominio>/<Controller>/<Action>
Content-Type: application/json
UserID: {{userId}}
Authorization: {{token}}
Environment: {{env}}
WindowName: TestWindow

{"CampoRequerido": "valor", "OtroCampo": 1}

### POST inválido — validar ErrorID > 0
POST {{host}}/<dominio>/<Controller>/<Action>
Content-Type: application/json
UserID: {{userId}}
Authorization: {{token}}
Environment: {{env}}
WindowName: TestWindow

{}
```

Variables en `tools/api-tests/http-client.env.json`:

```json
{
  "dev": {
    "host": "http://localhost:5000",
    "userId": "1",
    "token": "dev-token",
    "env": "DEV"
  }
}
```

**Validaciones mínimas por endpoint:**

| Caso | Esperado |
|------|----------|
| GET con datos | `"success": true`, resultados no vacíos |
| POST válido | `"success": true`, `ErrorID = 0` |
| POST inválido (sin campos requeridos) | `"success": false`, `ErrorID > 0`, mensaje descriptivo |
| DEL válido | `"success": true`, registro eliminado |

**Regla bloqueante:** No aprobar si hay endpoints críticos sin `.http` de prueba.

---

### QA — Checklist de calidad

Verificar antes de aprobar:

```md
- [ ] Happy path: flujo principal funciona end-to-end
- [ ] **Caso negativo/de error explícito** (anti-Test-Theater) + evidencia `-- [OK] TESTS`
- [ ] Edge cases: casos límite cubiertos en pruebas
- [ ] Null handling: campos nulos no rompen la lógica
- [ ] Regresión: objetos existentes no afectados
- [ ] **Mutation en paths críticos**: mutantes cazados (T-SQL 3 / Stryker.NET ≥80%) o N/A justificado
- [ ] Permisos: esquema / EXEC / SELECT correcto
- [ ] Consistencia de datos: no quedan registros huérfanos
- [ ] ErrorID/ErrorMessage: éxito = 0/'', error = >0/<mensaje>
- [ ] Performance: no hay full table scans evidentes en tablas grandes
```

---

## Estados permitidos

Cambiar a uno de estos estados en `_index.md`:

```txt
LISTO PARA PR
REQUIERE CAMBIOS
REQUIERE DECISIÓN
RIESGOSO
```

---

## Validaciones obligatorias

### Criterios de aceptación

Cada criterio debe quedar como:

```md
- [x] Cumplido: ...
- [ ] Pendiente: ...
- [ ] No aplica: ...
```

**Aprobación por nivel MoSCoW** (si la spec clasifica el alcance):

| Nivel pendiente | ¿Puede aprobar? |
|---|---|
| Must `[M]` incumplido | **NO** — nunca |
| Should `[S]` incumplido | Solo si fue recortado vía `/escalar` y consta en `_index.md` |
| Could `[C]` no hecho | Sí — ni siquiera se reporta como pendiente |

### Auditorías

Debe existir resultado de:

```txt
auditor-codigo
```

Y si hubo SQL:

```txt
auditor-sql
```

### Pruebas — Bloqueos duros

- No aprobar si `tester-sql` devuelve `Failed > 0` sin justificación.
- No aprobar si `dotnet test <REPO_SQL>.Tests` falla.
- No aprobar si hay endpoints críticos sin prueba `.http`.
- No aprobar si criterios de aceptación sin cobertura de test.
- **No aprobar si el `*Pruebas*.sql` no tiene ≥1 caso NEGATIVO/de error** (anti-Test-Theater) ni evidencia `-- [OK] TESTS [..] → N PASS`.
- **No aprobar si un `Expected` del script difiere de la matriz "Plan de pruebas" de `design.md`** sin `⚠ Ajustado` justificado en `impl.md` (asertos congelados desde la fase TEST: el código se adapta al test, no al revés).
- **No aprobar si hay paths críticos (lógica de negocio/financiera/gates) sin mutation** (3 mutantes T-SQL / Stryker.NET kill-rate ≥ 80 %) o justificación registrada.

---

## Reglas

- No aprobar si hay `REQUIERE CAMBIOS`.
- No aprobar si hay `RIESGOSO`.
- No aprobar si faltan criterios de aceptación.
- No aprobar si faltan auditorías.
- No aprobar si el alcance cambió sin autorización.
- No agregar features nuevas.
- No ampliar alcance.
- Verificar `18_guard_tdd.mdc`: Red phase respetada, CHAR-x con paridad post-cambio (solo Refactor), ningún test alterado/borrado para pasar.

---

## Actualización obligatoria: impl.md

Agregar sección de verificación al final de `impl.md`:

```md
## Verificación final

### Criterios de aceptación

- [x] ...
- [ ] ...

### Pruebas T-SQL (tester-sql)

- Script: `<yyyymmdd>_<TKT>_PruebasUnitarias.sql`
- Resultado: X/Y passed
- Casos fallidos: (ninguno / lista)

### Pruebas contrato C# xUnit

- `dotnet test <REPO_SQL>.Tests`: PASS / FAIL / No aplica
- Tests nuevos: (lista)

### Pruebas API

- Archivo: `<TKT>_api_tests.http`
- Endpoints probados: (lista)
- Resultado: PASS / FAIL / No aplica

### QA Checklist

- [x] Happy path
- [x] Edge cases
- [ ] ...

### Auditorías verificadas

- auditor-sql: APROBADO / REQUIERE CAMBIOS / No aplica
- auditor-codigo: APROBADO / REQUIERE CAMBIOS / No aplica (Flutter puro)
- auditor-flutter: APROBADO / REQUIERE CAMBIOS / No aplica
- auditor-seguridad: APROBADO / BLOQUEAR / No aplica

### Desviaciones detectadas

- ...

### Pendientes

- ...
```

---

## Actualización obligatoria: _index.md

Agregar al Log de estados:

```md
| yyyy-mm-dd | EN REVISIÓN | LISTO PARA PR | /revisar | Verificación aprobada. Tests: X/Y |
```

Cambiar estado al resultado de la verificación.

Si se generó el reporte de APIs (paso 11.5), agregar a la tabla Graph:

```md
| APIs Front | [TKT-<Numero>-APIS.md](TKT-<Numero>-APIS.md) | /revisar | Creado |
```

---

## Helpers de despliegue SQL (<REPO_SQL>)

- Scripts reutilizables solo en `<REPO_SQL>/tools/sql-deploy/` (<PROYECTO_API> no aloja copias).
- No generar helpers `_mcp_*` / `_invoke_*` dentro de carpetas de requerimiento; salidas efímeras en `_mcp_payloads/` o junto al SQL y sin versionar.
- Preferir `sqlcmd` para DDL; MCP `execute_sql` solo para smoke corto.
- **Para SPs grandes via MCP**: fragmentar el script manualmente en bloques de ~3000 chars y ejecutar cada bloque por separado via `execute_sql`. El tool `mcp_deploy_frags.py` (automatiza este proceso) está planificado — mientras tanto usar fragmentación manual.

---

## Resultado esperado

Responder con:

```md
### Verificación SDD

- Carpeta: `.planning/tkt-<id>/`
- Artefacto actualizado: `impl.md`
- Estado: `LISTO PARA PR / REQUIERE CAMBIOS / REQUIERE DECISIÓN / RIESGOSO`

### Criterios de aceptación

- [x] ...
- [ ] ...

### Pruebas T-SQL (tester-sql)

- Script: `<yyyymmdd>_<TKT>_PruebasUnitarias.sql`
- Resultado: X/Y passed | No aplica

### Pruebas contrato C# xUnit

- `dotnet test <REPO_SQL>.Tests`: PASS / FAIL / No aplica

### Pruebas API

- Archivo: `<TKT>_api_tests.http`
- Resultado: PASS / FAIL / No aplica

### QA Checklist

- [x] Happy path
- [x] Edge cases
- [ ] ...

### Auditorías

- auditor-sql: APROBADO / No aplica
- auditor-codigo: APROBADO
- auditor-seguridad: APROBADO / No aplica

### APIs para Front

- `TKT-<Numero>-APIS.md`: Generado (N endpoints) / Pendiente (se genera al aprobar) / No aplica (sin endpoints)

### Pendientes

- ...

### Siguiente comando

`/completar` si está `LISTO PARA PR`.
```
