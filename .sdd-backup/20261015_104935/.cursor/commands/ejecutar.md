﻿# ejecutar

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Implementa una tarea basada en una spec SDD aprobada.

Este comando ejecuta cambios reales usando los agentes especializados y siguiendo las reglas del proyecto.

---

## Objetivo

Aplicar cambios mínimos, seguros y auditables basados en un requerimiento en estado:

```txt
LISTO PARA EJECUTAR
```

---

## Entrada requerida — Graph

Debe existir la carpeta del requerimiento con:

```txt
<RUTA_PLANNING>\tkt-<id>\
├── _index.md    ← con estado LISTO PARA EJECUTAR
├── spec.md      ← especificación
└── design.md    ← diseño técnico
```

Leer `_index.md` → `spec.md` (criterios) → `design.md` (orden de implementación).

---

## Flujo obligatorio

1. Leer `_index.md` → validar estado `LISTO PARA EJECUTAR`.
2. Leer `spec.md` → criterios de aceptación y alcance.
3. Leer `design.md` → orden de implementación y archivos.
4. **Validar dependencias**: si `_index.md` tiene "Depende de" con requerimientos listados → verificar que cada uno esté en estado `ARCHIVADO` o `LISTO PARA PR`. Si alguno está pendiente → alertar y pedir confirmación.
5. **Crear/verificar ramas Git según config** — **OBLIGATORIO si el requerimiento toca API/backend** (controllers, endpoints, DTOs en `<RUTA_REPO_API>`). No implementar código API sin rama `TKT-{id}` activa.

   **Algoritmo:**
   1. Leer `sdd-toolkit/sdd.config.yaml` → `targets`.
   2. Si `spec.md` o `design.md` mencionan API, controller, endpoint o archivos bajo `<RUTA_REPO_API>` → **siempre** invocar `git-api` (Modo 1) antes del paso 6, aunque `design.md` no tenga sección `## backend:<name>`.
   3. Para cada instancia en cualquier target: verificar que `git.enabled: true`.
   4. Si `git.enabled: true` y la instancia está en scope (sección en `design.md` **o** alcance API detectado en paso 2) → invocar el agente git del target:
      - Target `backend` o `database` → `git-api`
      - Target `frontend` → `git-frontend`
      - Target `mobile` → `git-mobile`
      con los valores del config (`repo`, `git.base_branch`, `git.branch_format`).
   5. Repetir para todas las instancias que califiquen (puede haber más de una en proyectos futuros).

   Si ninguna instancia tiene `git.enabled: true` con instancia en scope → omitir este paso sin error.
6. Ejecutar agentes especializados necesarios.
7. Implementar cambios mínimos. Seguir la tabla "Orden de implementación" de
   `design.md` paso por paso; ejecutar la Verificación de cada fila antes de
   continuar a la siguiente. Si una verificación falla, tratarlo como Ajuste
   durante implementación (sección "Iteración fluida" más abajo) — no como
   fallo silencioso.
   Al completar cada paso: actualizar su columna `Estado` en la tabla de `design.md`:
   - `✓ Hecho` — verificación pasó tal como estaba planeado
   - `⚠ Ajustado` — el paso cambió respecto al design original (documentar en `impl.md`)
8. **FASE PROBAR — paso DURO, no se salta (Unidad 7, shift-left).** El test va
   ANTES o junto a la implementación, nunca después "si da tiempo":
   - **SP de negocio** (`CREATE OR ALTER PROCEDURE` de lógica: comisiones, pedidos,
     inventario, afiliación, cálculos): generar PRIMERO el `<yyyymmdd>_<TKT>_Pruebas*.sql`
     desde `sdd-toolkit/templates/pruebas.sql` con **≥1 caso NEGATIVO/de error
     obligatorio** y characterization si es legacy. El hook `check-tests-green`
     **bloquea** implementar el SP si no existe su `*Pruebas*.sql` hermano.
   - Correr el suite en `<MCP_TEST>` (TRAN+ROLLBACK) y **anotar la evidencia**
     `-- [OK] TESTS [<entorno>] → <N> PASS`. Sin esa anotación el hook rechaza el script.
   - **Mutation en paths críticos** (lógica de negocio/financiera/gates): 3 mutantes
     manuales T-SQL (WHERE, operador, umbral) / Stryker.NET kill-rate ≥ 80 % en C#.
     Si un mutante sobrevive → falta un test; agregarlo antes de avanzar.
   - Paso adversarial en SP de negocio: aplicar `abogado-del-diablo` sobre los tests.
   - Si hay DDL: `Assert.Contains` en `<REPO_SQL>.Tests/`. Si hay endpoints: `<TKT>_api_tests.http`.
   - Ver `rules/pipeline-test.md` y `18_guard_tdd.mdc`.
9. Ejecutar auditorías obligatorias.
10. Ejecutar `corrector-revision` si aplica.
11. Reauditar.
12. Actualizar documentación/contexto si aplica.
13. Crear `impl.md` en la carpeta del requerimiento.
14. Actualizar `_index.md`: estado → `EN REVISIÓN`, marcar Impl como Creado, agregar log.

---

## Stop conditions — DETENTE aquí

Para el flujo completo si ocurre cualquiera de estas condiciones:

1. `_index.md` no tiene estado `LISTO PARA EJECUTAR` → indicar estado actual, no ejecutar.
2. `design.md` no existe o no tiene sección para la instancia en scope → no implementar SQL/API sin design.
3. Cualquier agente devuelve **RIESGOSO** → detener todo el flujo, no solo ese paso. Pedir revisión manual.
4. El alcance creció >30% respecto al design durante la implementación → detener, cambiar estado a `REQUIERE DECISIÓN`, usar `/escalar`.
5. Tras 3 ciclos de corrección persisten hallazgos Crítico/Mayor → estado `REQUIERE DECISIÓN`, escalar.
6. La tabla "Orden de implementación" de `design.md` suma estimado >400 líneas de cambio y no hay excepción documentada → usar `/escalar` para partir el requerimiento antes de abrir ramas. Un requerimiento = un work unit ≤ 400 líneas.
7. **Se intenta implementar un SP de negocio sin su `*Pruebas*.sql` (con caso negativo) en la carpeta** → el hook `check-tests-green` bloquea el Write. No es opcional: generar primero la fase PROBAR (paso 8). Nunca escribir la evidencia `-- [OK] TESTS` sin haber corrido el suite.

## Agentes permitidos

Usar solo cuando aplique:

**TDD (cuando aplica — ver `18_guard_tdd`):**
- desarrollador-tdd  ← si spec tiene CHAR-x, PBT-x, o design pide ciclo TDD; corre primero que el agente de implementación

**Backend / SQL:**
- desarrollador-api  ← si hay endpoints C# en scope
- desarrollador-sql  ← si hay SPs / vistas / tablas en scope
- git-api  ← verificar/crear rama en repo API antes de implementar

**Frontend:**
- desarrollador-react  ← si hay componentes / hooks / vistas en scope
- frontend-tester  ← generar tests Vitest + Playwright después de implementar
- git-frontend  ← verificar/crear rama en repo frontend antes de implementar

**Mobile:**
- desarrollador-flutter  ← si hay pantallas/widgets Flutter en scope
- flutter-tester  ← generar tests flutter test después de implementar
- git-mobile  ← verificar/crear rama en nice_app antes de implementar

**Auditoría (siempre):**
- auditor-codigo  ← para código SQL/C#/JS/Python (no Flutter)
- auditor-flutter  ← si hubo Dart/Flutter
- auditor-sql  ← si hubo SQL
- auditor-seguridad  ← si hay endpoints o input externo
- corrector-revision  ← si auditoría devuelve REQUIERE CAMBIOS

---

## Reglas obligatorias

- Respetar `08_guard_alcance.mdc`
- Respetar `18_guard_tdd.mdc` (Red phase, CHAR-x paridad, anti-sabotaje, mutation)
- Respetar arquitectura existente
- Aplicar cambios mínimos
- No modificar archivos fuera del alcance
- No agregar features no solicitadas
- No hacer refactors grandes
- No romper compatibilidad sin aprobación
- No cerrar tarea con auditorías fallidas

---

## Iteración fluida (sin volver a /diseñar)

Durante la implementación, si se descubre que el diseño o alcance necesita ajuste:

1. **Ajuste menor** (enfoque técnico distinto, archivo adicional, campo extra):
   - Actualizar directamente `design.md` (secciones Estrategia, Archivos, Orden).
   - Documentar el ajuste en `impl.md`:

   ```md
   ## Ajustes durante implementación

   - [fecha] Cambio: ... | Motivo: ...
   ```

   - Continuar implementando. No cambiar de estado.

2. **Ajuste mayor** (alcance crece >30%, nuevo sistema afectado, riesgo nuevo):
   - Detener implementación.
   - Documentar el hallazgo en `impl.md`.
   - Cambiar estado a `REQUIERE DECISIÓN` en `_index.md`.
   - Usar `/escalar` para handoff al usuario.

**Principio:** Edita el artefacto donde estés, no saltes entre comandos innecesariamente.

---

## SQL obligatorio

Si hubo SQL:

1. Ejecutar `auditor-sql`
2. Si responde `REQUIERE CAMBIOS`:
   - ejecutar `corrector-revision`
   - reauditar
3. Si responde `RIESGOSO`:
   - detener implementación
   - pedir revisión manual

---

## Auditoría obligatoria

Después de implementar:

1. Ejecutar `auditor-codigo`
2. Si responde `REQUIERE CAMBIOS`:
   - ejecutar `corrector-revision`
   - reauditar
3. Si responde `RIESGOSO`:
   - detener implementación
   - pedir revisión manual

Máximo 3 ciclos de corrección automática.

---

## Done-state

`/ejecutar` está completo cuando se cumple todo:

- [ ] `impl.md` creado con todos los campos obligatorios.
- [ ] `_index.md` actualizado a `EN REVISIÓN` con log de estado.
- [ ] `auditor-sql` devolvió **APROBADO** (si hubo SQL).
- [ ] `auditor-codigo` devolvió **APROBADO** (si hay C#/JS/Python).
- [ ] `auditor-flutter` devolvió **APROBADO** (si hubo Dart/Flutter).
- [ ] Fase PROBAR: `*Pruebas*.sql` con ≥1 caso negativo + evidencia `-- [OK] TESTS [..] → N PASS`.
- [ ] Mutation en paths críticos: mutantes probados (T-SQL 3 / Stryker.NET ≥80%) o N/A justificado.
- [ ] Scripts de prueba creados: T-SQL + `.http` si aplica.
- [ ] Ningún hallazgo Crítico/Mayor pendiente sin resolución documentada.
- [ ] Rama git activa en la instancia correspondiente (si `git.enabled: true`).

## Formato obligatorio: impl.md

```md
# Impl: tkt-<id>-<slug>

> [← index](_index.md) | [← design](design.md) | Siguiente: [delta →](delta.md)

## Ajustes durante implementación

- (ninguno, o lista de ajustes al design)

## Implementación realizada

- ...

## Archivos modificados

- ...

## Auditoría SQL

- Estado:
- Hallazgos:
- Correcciones:

## Auditoría general

- Estado:
- Hallazgos:
- Correcciones:

## Scripts de prueba creados

### T-SQL unitarias
- Script: `<yyyymmdd>_<TKT>_PruebasUnitarias.sql`
- Casos: (lista TC-XX)

### Contrato C# xUnit
- Archivo: `<Entidad>SqlContractTests.cs` / No aplica
- `dotnet test`: pendiente `/revisar`

### API `.http`
- Archivo: `<TKT>_api_tests.http` / No aplica
- Endpoints: (lista)

## Resultado contra criterios de aceptación

- [ ] ...
- [ ] ...
- [ ] ...
```

---

## Actualización obligatoria: _index.md

Actualizar la tabla Graph:

```md
| Impl | [impl.md](impl.md) | /ejecutar | Creado |
```

Agregar al Log de estados:

```md
| yyyy-mm-dd | LISTO PARA EJECUTAR | EN REVISIÓN | /ejecutar | Implementación completada |
```

Cambiar estado a:

```md
## Estado

EN REVISIÓN
```

---

## Testing obligatorio

Ejecutar cuando aplique:

### Frontend (React+Vite)

```powershell
node_modules\.bin\tsc --noEmit
node_modules\.bin\vite build --mode development
```

### Mobile (Flutter)

```bash
flutter analyze
flutter test
```

### Backend

- build
- tests unitarios
- tests integración

### SQL

- validación estática
- SELECT previo
- revisión de impacto
- validación de duplicados
- validación de NULL

---

## Resultado esperado

Responder con:

```md
### Implementación ejecutada

- Carpeta: `.planning/tkt-<id>/`
- Artefacto creado: `impl.md`
- Estado: `EN REVISIÓN`

### Archivos modificados

- ...

### Resultado auditoría SQL

- ...

### Resultado auditoría general

- ...

### Correcciones automáticas

- ...

### Estado final

- APROBADO
- PARCIAL
- REQUIERE DECISIÓN
- RIESGOSO

### Siguiente comando

`/revisar`
```
