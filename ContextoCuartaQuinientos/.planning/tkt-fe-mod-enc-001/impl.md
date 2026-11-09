[← index](_index.md) | [← design](design.md)

# FE-MOD-ENC-001 — Implementación

## Ajustes durante implementación

- 2026-10-26: Cierre gaps `/revisar` — bandeja, detalle, resultados, Vitest bandeja.
- 2026-10-26: `/revisar` — tests `ResultadosEncuestaPage` + `AdminArchivosPage` (MemoryRouter).

## Implementación realizada

- **BE:** CRUD metadatos borrador, CRUD preguntas/opciones, `TiposPregunta`, publicar con `SIN_PREGUNTAS`, resolver `tipoPreguntaId`.
- **FE admin:** bandeja (filtro, KPI, edit/delete/publicar), detalle (CRUD pregunta/opción, ConfirmDialog), resultados (hero + barras).
- **FE residente:** sin cambios de código en este cierre; `EncuestasPage` / flujo responder ya cumplen R-1/R-2.

## Archivos principales

- `GraphApi/Controllers/ENC/Encuestas/EncuestasController.cs`
- `GraphApi/Repositories/ENC/CuartaEncuestasRepository.cs`
- `Web/src/pages/AdminEncuestasPage.tsx`
- `Web/src/pages/AdminEncuestaDetallePage.tsx`
- `Web/src/pages/ResultadosEncuestaPage.tsx`
- Tests: `AdminEncuestasPage.test.tsx`, `ResultadosEncuestaPage.test.tsx`

## Verificación final

### Criterios de aceptación

- [x] **CA-1:** Flujo admin metadatos → detalle → preguntas → publicar (manual + unit BE).
- [x] **CA-2:** Resultados con conteos/% (UI + contrato `GET .../resultados`).
- [x] **CA-3:** PUT metadatos/pregunta en borrador; reglas BE sobre respuestas (sin UI delete encuesta publicada).
- [x] **CA-4:** DELETE borrador con ConfirmDialog.
- [x] **CA-5:** Zod + `apiGet`/`apiPost`/`apiPut`/`apiDelete`; sin `window.confirm` en encuestas.

### Must / Residente

- [x] M-1 … M-6 (M-6: hero + barras; paridad visual `Web_diseño` no exacta).
- [x] R-1: `/encuestas` activas + badge «Ya respondiste» (`EncuestasPage.tsx`).
- [x] R-2: `/encuestas/:id` responder (sin cambio en TKT; smoke manual).

### Pruebas T-SQL (tester-sql)

- No aplica (Dapper, sin SP nuevo).

### Pruebas contrato C# xUnit

- `dotnet test --filter CuartaEncuestas`: **5/5 OK**

### Pruebas API

- Archivo: `FE-MOD-ENC-001_api_tests.http`
- Ejecución automatizada: **No** (sin JWT en runner); contrato documentado en `TKT-FE-MOD-ENC-001-APIS.md`

### Pruebas FE (Vitest)

- `npm test --run`: **180/180 OK**
- `tsc --noEmit`: OK

### QA Checklist

- [x] Happy path admin (código + tests bandeja/resultados)
- [x] Caso negativo publicar sin preguntas (unit BE)
- [x] ConfirmDialog en deletes/publicar
- [ ] E2E Playwright encuestas — no generado
- [ ] Tests Vitest `AdminEncuestaDetallePage` — pendiente opcional

### Auditorías verificadas

- **auditor-sql:** No aplica
- **auditor-codigo:** **APROBADO** — patrones Cuarta, sin `confirm` en módulo encuestas, tests verdes
- **auditor-seguridad:** **APROBADO** — mutaciones `[Authorize(Policy = SoloAdministrador)]`, queries parametrizadas en repository
- **auditor-flutter:** No aplica

### Desviaciones detectadas

- Rutas preguntas bajo `/ENC/Encuestas/...` (no `/ENC/Preguntas/...`).
- JSON camelCase en wire; mappers FE para tolerancia PascalCase.
- M-6 sin chips decorativos del mockup legacy; hero Bootstrap en lugar de `cq-reserva-hero`.

### Pendientes

- `[JsonPropertyName]` en DTOs ENC (opcional).
- Vitest detalle encuesta; E2E CA-1 residente.
- Ejecutar `.http` con JWT real en entorno dev.

### Sello VERDE

- SIN SELLO — sin objetos SQL.
