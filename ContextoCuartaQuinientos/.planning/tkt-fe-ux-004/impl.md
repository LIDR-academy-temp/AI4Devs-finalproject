[← index](_index.md) | [design](design.md)

# impl.md — FE-UX-004

## Ajustes durante implementación

- Ninguno.

## Implementación realizada

- Kit: `AdminMobileCard`, `AdminMobileCardList`, `useQueryErrorToast`, clase `cq-admin-table-pane` + CSS móvil.
- Pilotos: Casas, Usuarios, Tickets con cards hermanas de `filteredRows` y toasts de listado/mutación.
- Errores de formulario en panel sin cambio.

## Archivos modificados

- `Web/src/shared/components/admin/*` (FilterableTable, MobileCard*, index)
- `Web/src/shared/hooks/useQueryErrorToast.ts`
- `Web/src/styles/cq-admin.css`
- `Web/src/features/admin/{casas,usuarios,tickets}/*MobileCard.tsx`
- `Web/src/pages/Admin{Casas,Usuarios,Tickets}Page.tsx`
- Tests asociados

## Auditoría SQL

- N/A

## Auditoría general

- **Estado:** APROBADO (alcance UI; hooks con tests; sin secretos; form errors en panel preservados)

## Scripts de prueba

- T-SQL: N/A
- Vitest: **214/214** passed (2026-10-27)
- API `.http`: N/A

## Resultado contra criterios de aceptación

- [x] CA-1 — cards móviles Casas
- [x] CA-2 — filtro global compartido tabla/cards
- [x] CA-3 — error listado Tickets → toast
- [x] CA-4 — éxito mutación Tickets (existente)
- [x] CA-5 — tabla desktop sin cambio estructural
- [x] CA-6 — formError en panel Casas
- [x] CA-R1 — suite Vitest verde

## Validación

- `tsc --noEmit`: OK
- `vite build --mode development`: OK

## Verificación final

### Criterios de aceptación (spec Must)

- [x] **CA-1** — Cards móviles Casas (`CasaAdminMobileCard` + `AdminMobileCardList`).
- [x] **CA-2** — Mismo `filteredRows` / filtro global Usuarios (tests + código).
- [x] **CA-3** — Error listado Tickets → `mockToastError` / sin banner página.
- [x] **CA-4** — Mutaciones Tickets con `toast.success` (tests preservados).
- [x] **CA-5** — Tabla desktop: `cq-admin-table-pane` oculta solo &lt; md.
- [x] **CA-6** — `formError` en panel Casas (test delete dialog + panel).
- [x] **CA-R1** — Vitest 214/214 (2026-10-27 `/revisar`).

### Should (fuera de cierre Must)

- [ ] Rollout resto `Admin*` — diferido (spec Should).
- [ ] `specs/frontend.md` — en `/completar`.

### Pruebas T-SQL (tester-sql)

- No aplica.

### Pruebas contrato C# xUnit

- No aplica.

### Pruebas API

- No aplica.

### Frontend (Vitest / build)

- `npm test`: **214/214** passed.
- `tsc --noEmit`: OK.
- `vite build --mode development`: OK.
- Matriz design: TC-HP-1..3, TC-ERR-1/2, TC-R-1/2 cubiertos por tests de página + `useQueryErrorToast.test.ts` + `AdminMobileCardList.test.tsx`.

### QA Checklist

- [x] Happy path listado + card tap (tests).
- [x] Error listado → toast (Casas, Tickets, Usuarios).
- [x] Regresión desktop (tabla en DOM; pane no afectado por CSS).
- [ ] Smoke manual 375px (3 pilotos) — recomendado pre-merge.

### Auditorías verificadas

- auditor-sql: No aplica
- auditor-codigo: **APROBADO** (revisión 2026-10-27: alcance Web; sin XSS nuevo; toast no sustituye formError)
- auditor-flutter: No aplica
- auditor-seguridad: No aplica (sin API/SQL)

### Desviaciones detectadas

- Ninguna respecto a Must.

### Pendientes

- APIS.md: No aplica (sin endpoints).
- Should: extender cards/toasts al resto admin.
- Smoke manual móvil.
