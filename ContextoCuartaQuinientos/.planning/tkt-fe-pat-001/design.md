[← spec](spec.md) | [← index](_index.md)

# design.md — FE-PAT-001

## 1. ADRs

| ID | Decisión |
|----|----------|
| ADR-PAT-1 | Carpeta `Web/src/shared/components/admin/` para patrones; páginas importan desde ahí. |
| ADR-PAT-2 | `SectionHero`: `rounded-lg border bg-white p-6 shadow-sm` + badge pill `bg-primary-50 text-primary-dark`. |
| ADR-PAT-3 | Alertas: borde semántico (`border-danger` + `bg-danger-light`) alineado a tokens existentes. |
| ADR-PAT-4 | ConfirmDialog: estado local + portal opcional; mismo z-index que modales actuales (`z-50`). |

## 2. Mapa Web_diseño → React

| MVC (Web_diseño) | Componente React |
|------------------|------------------|
| `cq-reserva-hero` + badge pill | `SectionHero` |
| `alert alert-success/danger` | `AlertBanner` |
| Modal Bootstrap | `FormModal` |
| Tabla + acciones fila | `AdminDataTable` + slots |
| Árbol menús (solo referencia visual) | SGR-FE-001 (`TreeList` futuro) |

## 3. Orden de implementación

| Paso | Entregable | Depende |
|------|------------|---------|
| 1 | `PageHeader`, `AlertBanner`, `EmptyState` | — |
| 2 | `FormModal`, `ConfirmDialog` | 1 |
| 3 | `AdminDataTable` + skeleton | 1 |
| 4 | Piloto `AdminCasasPage` | 1–3 |
| 5 | Tests Vitest componentes | 1–2 |
| 6 | `impl.md` + actualizar `ui-referencia-visual.md` (tabla patrones) | 4 |

## 4. Plan de pruebas

| ID | Tipo | Descripción |
|----|------|-------------|
| T-1 | Componente | FormModal abre/cierra, submit llama handler |
| T-2 | Componente | ConfirmDialog confirma/cancela |
| T-3 | Página | AdminCasasPage alta casa (mock apiPost con Authorization) |
| T-4 | Build | tsc + vite build |

## 5. Contenido configurable

Solo literales de marco UI en componentes; mensajes de error de API vienen de `problem.detail`.

## 6. Migración CRUD admin (canónico post FE-PAT-002)

**No usar solo esta lista** para pantallas lista+formulario. Fuente única:

- [PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md)
- [tkt-fe-pat-002/design.md](../tkt-fe-pat-002/design.md) §8–§9
- Código: `AdminCasasPage.tsx`

Este ticket (FE-PAT-001) aporta **kit** (`ConfirmDialog`, `FormModal`, `EmptyState`, …). El layout split + tabla filtrable es **FE-PAT-002**.
