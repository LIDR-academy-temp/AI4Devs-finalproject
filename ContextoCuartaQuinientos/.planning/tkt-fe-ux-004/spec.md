[← index](_index.md)

# FE-UX-004 — Admin móvil (cards) + toasts en CRUD

> **Tipo:** Feature  
> **Generado:** `/definir` 2026-10-27

## 0 — Documentos de entrada

| Documento | Fuente |
|-----------|--------|
| Contexto requerimiento | [[FE-UX-001]] `delta.md` (diferidos AC9, M5 parcial); [[FE-UX-003]] `spec.md` Won't |
| Contexto técnico | [specs/frontend.md](../../specs/frontend.md), [PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md), `AdminFilterableTable.tsx` |
| Diseño visual | [[FE-UX-001]] `design.md` (tablas → cards &lt;768px); [ui-referencia-visual.md](../../referencia/ui-referencia-visual.md) |

## User story

Como **administrador en móvil**, quiero **ver listados como tarjetas legibles y recibir feedback de operaciones con toasts**, para **usar el portal sin scroll horizontal en tablas y sin banners que ocupan la pantalla**.

## Contexto / problema

- Tras [[FE-UX-003]], el shell móvil (crumbs, drawer) está resuelto; los **listados admin** siguen en `table-responsive` ([[FE-PAT-002]]).
- [[FE-UX-001]] AC9 pedía lectura usable en móvil; el cierre aceptó scroll horizontal como mínimo — **cards apiladas** quedó diferido.
- `useToast` existe y se usa en `AdminTicketsPage` para éxito de operación; la mayoría de `Admin*` aún muestra **errores de listado** con `alert alert-danger` dismissible arriba del layout.
- **Errores de formulario** en `AdminSidePanel` deben seguir inline (`alert` en panel) — no sustituir por toast.

## Alcance (MoSCoW)

### Must

- **M1** — Patrón reutilizable **lista móvil**: en viewport `< md` (768px), ocultar tabla y mostrar **cards** derivadas de las mismas filas ya filtradas por `useClientTableFilter` (sin segunda fuente de datos).
- **M2** — Piloto en **3** pantallas patrón split: `AdminCasasPage`, `AdminUsuariosPage`, `AdminTicketsPage` (referencia Casas + ticket ya con toast).
- **M3** — En esas 3 pantallas: errores de **carga/listado** y **éxito** de mutaciones que hoy usan banner dismissible de página → `toast.error` / `toast.success`; mantener errores de **formulario en panel** como están.
- **M4** — Tests: unit del mapper card (si aplica) + ajuste tests de página (viewport móvil o render de lista card); regresión desktop (tabla visible).

### Should

- Extender cards móvil + toasts de página al resto de `Admin*` que usan `AdminFilterableTable` (Anuncios, Encuestas, Archivos, Juntas, Visitas, Vehículos, Mascotas, Almacén, etc.).
- Documentar en `specs/frontend.md` el contrato del componente y breakpoint.

### Could

- `FinanzasAdminPage` / pantallas sin `AdminFilterableTable` (layout distinto).
- Modo oscuro, tour onboarding ([[FE-UX-001]] C2/C3).

### Won't

- Cambios API/SQL.
- Reemplazar `ConfirmDialog` o alerts **dentro** del side panel por toast.
- Rediseño completo de `AdminListToolbar` en móvil.

## Instancias en scope

| Target | Impacto |
|--------|---------|
| `frontend:Web` | Nuevo componente(s) admin; 3+ páginas; estilos `cq-admin.css`; tests Vitest |

## Invariantes

| # | Regla | Fuente |
|---|--------|--------|
| INV-1 | Filtro cliente único (`useClientTableFilter`) — cards muestran el mismo subconjunto que la tabla | PATRON_CRUD_ADMIN |
| INV-2 | Sin `window.confirm` / `prompt` | specs/frontend.md |
| INV-3 | Desktop `md+`: tabla actual sin regresión visual | FE-UX-001 design |
| INV-4 | `useToast` solo bajo `ToastProvider` | FE-UX-003 |

## Criterios de aceptación

- [ ] **CA-1 [M]** — **Dado** viewport 375px en Casas con datos **Cuando** abro listado **Entonces** veo cards apiladas (sin tabla visible) con campos clave (ej. identificador, estado) y acción primaria (ej. editar/seleccionar fila).
- [ ] **CA-2 [M]** — **Dado** filtro global activo en Usuarios **Cuando** escribo en búsqueda **Entonces** el conteo y las cards reflejan el mismo filtrado que en desktop.
- [ ] **CA-3 [M]** — **Dado** fallo de carga en Tickets **Cuando** la query falla **Entonces** aparece `toast.error` y no queda banner dismissible de página para ese error.
- [ ] **CA-4 [M]** — **Dado** asignación exitosa en Tickets **Cuando** la API responde OK **Entonces** `toast.success` (comportamiento actual preservado o mejorado).
- [ ] **CA-5 [M]** — **Dado** viewport ≥768px en las 3 pilotos **Cuando** listo **Entonces** tabla + filtros columna visibles como hoy.
- [ ] **CA-6 [M]** — **Dado** error de validación en formulario lateral Casas **Cuando** guardo inválido **Entonces** el error sigue visible **en el panel**, no solo en toast.
- [ ] **CA-R1 [M]** — **Dado** suite Vitest **Cuando** `npm test` **Entonces** pasa sin reducir cobertura de las 3 pilotos.

## Reutilización

- `AdminFilterableTable` / `useClientTableFilter` — extender o envolver, no duplicar motor de filtro.
- `ToastContext` — [[FE-UX-003]].
- Estilos `cq-admin-page`, cards tipo `card` Bootstrap scoped.

## Definition of Ready

- [x] Independent — depende de [[FE-UX-003]] **ARCHIVADO**
- [x] Negotiable — Should = rollout resto admin
- [x] Valuable — AC9 móvil real
- [x] Estimable — patrón + 3 pilotos acotados
- [ ] Small — talla **L** si se incluye Should completo → **Must solo = M**
- [x] Testable — CA verificables

## Preguntas abiertas

- (ninguna bloqueante) Orden Should: por dominio en tickets hijos vs un solo PR grande — decidir en `/diseñar`.

## Pasada adversarial (abogado del diablo)

| # | Objeción | Mitigación en spec |
|---|----------|-------------------|
| A1 | Cards duplican columnas y se desincronizan de la tabla | Misma iteración `filteredRows`; componente único de render |
| A2 | 16 pantallas en un ticket → scope creep | Must = 3 pilotos; Should explícito y opcional en tiempo |
| A3 | Toast para error de red pierde persistencia vs banner | Toast con mensaje claro; error de listado re-disparable al refetch |
| A4 | Tickets no usa split Casas — layout distinto | Piloto Tickets solo toast + cards si tabla propia; `(asumido)` diseño alinea markup en `/diseñar` |
| A5 | Touch targets en cards &lt; 44px | CA-1 + design: min-height área clic en fila/card |

**Veredicto:** spec aprobable para `/diseñar` con Must acotado a 3 pilotos.
