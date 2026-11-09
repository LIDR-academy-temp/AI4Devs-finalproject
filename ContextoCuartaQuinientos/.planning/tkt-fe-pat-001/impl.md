# Impl: tkt-fe-pat-001

> [← index](_index.md) | [← design](design.md) | Siguiente: [delta →](delta.md)

## Ajustes durante implementación

- `FormModal`: focus trap solo al abrir (`useEffect` deps `[open]` + `onCloseRef`) — evita robar foco en cada keystroke del formulario.

## Implementación realizada

- Kit admin en `Web/src/shared/components/admin/` (7 componentes + barrel).
- Piloto `AdminCasasPage`: sin `prompt`/`confirm`; create/edit en `FormModal`, delete en `ConfirmDialog`.
- Tests Vitest: `PageHeader`, `FormModal`, `ConfirmDialog` + actualización `AdminCasasPage.test.tsx`.
- `design.md` §6 guía migración; `ui-referencia-visual.md` tabla patrones.

## Archivos modificados

- `Web/src/shared/components/admin/*` (nuevo)
- `Web/src/pages/AdminCasasPage.tsx`
- `Web/src/pages/AdminCasasPage.test.tsx`
- `ContextoCuartaQuinientos/referencia/ui-referencia-visual.md`
- `ContextoCuartaQuinientos/.planning/tkt-fe-pat-001/design.md`

## Auditoría SQL

- Estado: No aplica

## Auditoría general

- Estado: APROBADO (tras corrección F001–F004: Zod+RHF, delete error, tabla sin error, icono EmptyState)
- Hallazgos menores F005–F008: scroll lock modal, aria-describedby, tests extra → `/revisar` opcional

## Scripts de prueba creados

### T-SQL unitarias
- No aplica

### Contrato C# xUnit
- No aplica

### Vitest
- `Web/src/shared/components/admin/*.test.tsx`
- `Web/src/pages/AdminCasasPage.test.tsx` (T-3 delete flow)

## Resultado contra criterios de aceptación

- [x] CA-1 AdminCasasPage con patrones; sin `window.prompt`
- [x] CA-2 Modal a11y (`role="dialog"`, trap Tab/Escape, foco inicial)
- [x] CA-3 `npm test` (scope ticket), `tsc --noEmit`, `vite build`
- [x] CA-4 Guía migración en `design.md` §6

## Verificación final

### Criterios de aceptación

- [x] CA-1: `AdminCasasPage` — `PageHeader`, `SectionHero`, `FormModal`, `AlertBanner`, `ConfirmDialog`, `AdminDataTable`; sin `prompt`/`confirm`
- [x] CA-2: `FormModal` — `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape + Tab wrap, foco al abrir
- [x] CA-3: `npm test` 166/166, `tsc --noEmit`, `vite build` (2026-10-23)
- [x] CA-4: `design.md` §6 (10 pasos)

### Pruebas T-SQL (tester-sql)

- No aplica

### Pruebas contrato C# xUnit

- No aplica

### Pruebas API

- No aplica (sin cambio de endpoints)

### Vitest / matriz design T-1–T-4

| ID | Resultado |
|----|-----------|
| T-1 FormModal | PASS (`FormModal.test.tsx`) |
| T-2 ConfirmDialog | PASS (`ConfirmDialog.test.tsx`) |
| T-3 AdminCasasPage alta + delete | PASS (`AdminCasasPage.test.tsx`) |
| T-4 Build | PASS (`tsc` + `vite build`) |

### QA Checklist

- [x] Happy path alta casa (POST mock)
- [x] Error listado API (`AlertBanner`, tabla oculta)
- [x] Delete con `ConfirmDialog` (sin `window.confirm`)
- [ ] Edición PUT / POST error en modal / DELETE error — no en tests (mejora FE-CRUD-001)
- [x] Mutation / T-SQL — N/A (solo UI)

### Auditorías verificadas

- auditor-sql: No aplica
- auditor-codigo: APROBADO (post F001–F004 en `/ejecutar`)
- auditor-seguridad: No aplica (sin endpoints nuevos)
- auditor-flutter: No aplica

### Desviaciones detectadas

- **Should** `ResponsiveTable` y `/dev/patterns` no implementados (recorte explícito en spec §2 Should; no bloquea Must).

### Pendientes

- Rama dedicada `feature/fe-pat-001-admin-patterns` (repo en otra rama con trabajo paralelo).
- Menores a11y/UX: scroll lock en modal (F005), `aria-describedby` en confirm (F006), tests Escape/edit/error (F007–F008).
- `TKT-FE-PAT-001-APIS.md`: No aplica (sin endpoints).
