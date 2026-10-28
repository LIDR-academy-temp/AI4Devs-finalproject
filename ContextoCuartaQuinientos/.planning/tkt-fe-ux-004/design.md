[← index](_index.md) | [spec](spec.md)

# design.md — FE-UX-004: Admin móvil (cards) + toasts pilotos

## Estrategia técnica

**Decisión:** composición en capas — (1) ocultar solo el bloque tabla en `< md` vía clase en `AdminFilterableTable`; (2) lista móvil hermana que recibe **el mismo array** `filteredRows` que alimenta `<tbody>`; (3) hook `useQueryErrorToast` para errores de query de listado; mutaciones ya usan `useToast` donde aplique.

**Alternativas descartadas**

| Alternativa | Por qué no |
|-------------|------------|
| CSS `display:none` global a `.table-responsive` en admin | Ocultaría tablas dentro de paneles/modales |
| Duplicar `useClientTableFilter` para móvil | Rompe INV-1 |
| Librería responsive table (react-table) | Sobreingeniería; patrón Casas ya estable |
| Solo scroll horizontal (status quo) | No cumple spec / AC9 diferido |

### Escalera de decisión

| Capacidad | Peldaño | Objeto | Evidencia |
|-----------|---------|--------|-----------|
| Cards móvil reutilizables | 4 | `AdminMobileCard` + `AdminMobileCardList` | Extiende kit PAT-001 sin nueva dep |
| Ocultar tabla en móvil | 4 | prop `tablePaneClassName` / clase fija `cq-admin-table-pane` en `AdminFilterableTable` | Cambio mínimo 1 componente compartido |
| Toast error listado | 3 | `useQueryErrorToast(message)` | Reutiliza `ToastContext` (FE-UX-003) |

## frontend:Web

| Artefacto | Acción | Notas |
|-----------|--------|-------|
| `shared/components/admin/AdminMobileCard.tsx` | crear | Card clickeable, `min-height` 48px área activa, `role="button"` si `onActivate` |
| `shared/components/admin/AdminMobileCardList.tsx` | crear | `rows`, `getRowKey`, `renderCard`, `emptyFilterMessage` |
| `shared/components/admin/AdminFilterableTable.tsx` | modificar | Envolver `table-responsive` con `cq-admin-table-pane` |
| `shared/hooks/useQueryErrorToast.ts` | crear | `useEffect` → `toast.error` cuando `error` truthy; opcional `enabled` |
| `styles/cq-admin.css` | modificar | `@media (max-width: 767.98px) { .cq-admin-table-pane { display: none; } }` |
| `features/admin/casas/renderCasaMobileCard.tsx` | crear | Título: condominio + número; meta: dirección, propietario |
| `features/admin/usuarios/renderUsuarioMobileCard.tsx` | crear | Título: nombre; meta: correo, perfil, activo |
| `features/admin/tickets/renderTicketMobileCard.tsx` | crear | Título: `#id` + asunto; badge estado |
| `pages/AdminCasasPage.tsx` | modificar | cards + toast listado; quitar banner dismissible listado |
| `pages/AdminUsuariosPage.tsx` | modificar | idem; `actionError` de página → toast (no form) |
| `pages/AdminTicketsPage.tsx` | modificar | cards + toast listado; quitar banner listado |
| `shared/components/admin/index.ts` | modificar | export nuevos componentes |
| Tests | modificar/crear | ver plan pruebas |

**Contrato API:** ninguno (solo UI).

### Layout por pantalla (piloto)

```
card-body
├── loading / empty (sin cambio)
└── cuando hay datos:
    ├── AdminFilterableTable  → tabla visible md+
    └── AdminMobileCardList (className d-md-none) → filteredRows
```

**Tickets:** `onActivate` en card → `setSelectedId(ticketId)` (mismo que click fila). Panel lateral sin cambio.

**Casas / Usuarios:** `onActivate` → `openEdit(row)`; fila activa `cq-row-active` reflejada con prop `active` en card.

### Toasts — reglas

| Origen | Tratamiento |
|--------|-------------|
| `error` hook listado (`useCasasAdmin`, `usePadronUsuarios`, `useTicketsAdmin`) | `useQueryErrorToast(error)`; eliminar `dismissedError` + banner superior |
| `formError`, `deleteError` en panel/dialog | **mantener** alert inline |
| Éxito create/update/delete | `toast.success` en pilotos donde hoy no hay feedback o solo banner (Casas/Usuarios); Tickets ya OK en mutaciones panel |
| `casasError` en Usuarios (select casas) | toast o alert en panel create — **mantener** alert en panel si es carga del form |

### Should (fuera del Must — orden sugerido post-PR)

1. Misma pareja tabla+cards en resto de `Admin*` con `AdminFilterableTable`.
2. Actualizar `specs/frontend.md` en `/completar`.
3. Opcional ticket hijo `FE-UX-004b` si el PR Must es grande.

## database / backend / integrations

No aplica.

## Contenido configurable

No aplica — textos toast son marco UI + `problem.detail` API existente.

## Valores nuevos y sus consumidores

No aplica.

## Orden de implementación

1. Estilos + `AdminFilterableTable` (`cq-admin-table-pane`).
2. `AdminMobileCard` / `AdminMobileCardList` + unit test lista vacía / keys.
3. `useQueryErrorToast` + unit test (mock `useToast`).
4. `AdminCasasPage` + mapper + tests (card visible con `matchMedia` mock o clase `d-md-none` + query por texto en card).
5. `AdminUsuariosPage` + mapper + tests.
6. `AdminTicketsPage` + mapper + tests (extender mock toast existente).
7. `tsc`, `npm test`, `vite build`.

**Rama:** `feature/fe-ux-004-admin-mobile-cards` (`git-frontend` Modo 1 en `/ejecutar`).

## Plan de pruebas (Vitest — fuente para implementación)

| ID | Tipo | Caso | Expected |
|----|------|------|----------|
| TC-HP-1 | Happy | Casas carga datos | Texto de dirección visible en card móvil (`render` con `window.matchMedia` width 375 o inspeccionar nodo `.cq-admin-mobile-card`) |
| TC-HP-2 | Happy | Usuarios filtro global "foo" | Cards count = 0 y mensaje filtro vacío coherente con tabla |
| TC-HP-3 | Happy | Tickets click card | Abre panel detalle (texto asunto / estado en panel) |
| TC-ERR-1 | Error | Casas API listado 500 | `toast.error` llamado; **no** `role="alert"` dismissible de página para error listado |
| TC-ERR-2 | Error | Casas guardar inválido en panel | Sigue `alert`/`formError` en panel (CA-6) |
| TC-R-1 | Regresión | Casas desktop (matchMedia 1024) | `table` visible con columnas thead |
| TC-R-2 | Regresión | Tickets asignar OK | `toast.success` (test existente preservado) |

**T-SQL / `/test`:** N/A — sin SQL ni endpoints nuevos.

## Riesgos y mitigación

| Riesgo | Mitigación |
|--------|------------|
| Panel split ocupa pantalla en móvil al abrir edición | Comportamiento actual `AdminSplitLayout`; no cambiar en este ticket |
| Toast duplicado en re-render | `useQueryErrorToast` depende de `error` string; no re-toast si mismo error sin cambio |
| Tests no simulan viewport | Usar `matchMedia` mock + assert en `.cq-admin-mobile-card` siempre en DOM (oculto en desktop vía CSS no impide query en JSDOM) |

## Rollback

Revertir commit Web; sin migración BD.

## Agentes

| Fase | Agente |
|------|--------|
| `/ejecutar` | `desarrollador-react`, `git-frontend` Modo 1 |
| `/revisar` | `frontend-tester` (si faltan tests), `auditor-codigo` |

## Pre-mortem

1. **Olvidar scope CSS** → tabla oculta en panel → clase solo en wrapper de `AdminFilterableTable`.
2. **Toast en formError** → viola CA-6 → checklist en PR por archivo.
3. **16 páginas en un PR** → Must limitado a 3 archivos de página.

## Pasada adversarial (design)

| # | Objeción | Respuesta |
|---|----------|-----------|
| D1 | `d-md-none` en lista pero tabla sigue en DOM en móvil | Tabla además `display:none` en `.cq-admin-table-pane` para no tab-trap |
| D2 | `useQueryErrorToast` spam al refetch | Solo dispara cuando `error` pasa de null → string |
| D3 | Cards sin filtros columna en móvil | Aceptado: toolbar global de `AdminFilterableTable` sigue visible encima de cards |
| D4 | Lectura en frío Tickets distinto a Casas | Mappers por feature; sin abstracción genérica mágica |

**Veredicto:** diseño ejecutable.

## Lectura en frío (implementador)

- **SCORE: 8/10**
- **AMBIGÜEDADES:** éxito toast en Casas/Usuarios — usar mensajes fijos ES cortos ("Casa actualizada", "Usuario creado") alineados a Tickets; no bloqueante.
