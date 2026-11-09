# Referencia visual — portal admin (Web)

Fuente de verdad del look **antes** de skills externas (`emil-design-eng`, `ui-ux-pro-max`). Mockup del ticket manda si existe.

## Tokens

Archivo: `Web/src/index.css` (`@theme`).

| Token | Uso |
|-------|-----|
| `primary-600` / `primary-700` | CTAs, títulos de sección |
| `success-600`, `warning-600`, `danger-600` | estados semánticos |
| `slate-50` … `slate-900` | fondo, texto, bordes |
| `font-sans` | system stack |

No cambiar paleta ni tipografía vía “design system generator” sin ticket y mockup.

## Pantallas patrón

| Patrón | Archivo |
|--------|---------|
| Formulario (input + error + CTA) | `Web/src/pages/LoginPage.tsx` (rediseño planificado [[FE-UX-002]]) |
| Login referencia MVC | `Web_diseño/Web/Views/Login/Login.cshtml` + `.cq-login` en `site-redesign.css` |
| Shell / navegación | `Web/src/shared/components/AppShell.tsx` |
| Tabla densa admin | `Web/src/features/admin/finanzas/MorososTable.tsx` |
| Lista + badge | `Web/src/features/tickets/TicketsList.tsx` |
| Overlay modal | `Web/src/features/admin/finanzas/RegistrarPagoModal.tsx` |
| Patrones admin (FE-PAT-001) | `Web/src/shared/components/admin/` — `PageHeader`, `SectionHero`, `AlertBanner`, `FormModal`, `ConfirmDialog`, `AdminDataTable`, `EmptyState` |
| Tabla filtrable (FE-PAT-002, CA-8) | `AdminFilterableTable`, `useClientTableFilter`, `shared/lib/clientTableFilter.ts`; config por CRUD en `features/**/**TableFilter.ts` |
| Cabecera listado (CA-9) | `AdminListToolbar` — título + KPIs + filtro API + CTA; sin hero/listado duplicado |
| Shell app (header + nav) | `AppShell` + `app-shell.css`: push layout; sidebar rail **colapsado por defecto**; expandir/colapsar con botón superior (`SidebarRailToggle`); tooltips en rail; `UserMenu` con Escape |
| Piloto migración CRUD | `Web/src/pages/AdminCasasPage.tsx` |
| Bootstrap scoped (FE-PAT-002) | Import solo en `AdminCasasPage` + `Web/src/styles/bootstrap-pantone.css`, `cq-admin.css` |
| Referencia layout split | `Web_diseño/Web/Views/Catalogos/Casas.cshtml` |
| Tabla con filtros (genérico) | `useClientTableFilter` + `AdminFilterableTable` + `*TableFilter.ts` por dominio; estilos `cq-admin.css` |

### Clases recurrentes (copiar de Login)

- Input: `rounded border border-slate-300 px-3 py-2`
- Botón primario: `rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60 cursor-pointer`
- Botón secundario: `rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer`
- Error: `text-sm text-danger-600`

## Skills instaladas (local)

Desde la raíz del repo:

```powershell
npx skills@latest add emilkowalski/skills
npx skills@latest add nextlevelbuilder/ui-ux-pro-max-skill
```

Copia en `.agents/skills/` (ignorado por git). Reinstalar tras clonar.

| Cuándo | Skill |
|--------|--------|
| Ticket con mockup | `mockup-a-contexto` (`.cursor/skills`) |
| Checklist UX/a11y | `ui-ux-pro-max` |
| Edge cases de datos | `break-ui` |
| Motion nuevo | `review-animations` |
| Elegir librería UI | `pick-ui-library` |

**No usar** `design-system` de Pro Max para redefinir colores del portal.

## Ritual por ticket FE

1. Spec/design + mockup si hay UI.
2. Implementar alineado a esta referencia y `14_tech_react`.
3. Pasada `break-ui` en pantallas con listas/tablas/modales.
4. `npm test`, `tsc --noEmit`, `vite build`.

## Registro

- 2026-10-19 — Referencia visual + skills Emil/Pro Max + pasada break-ui inicial (Morosos, tickets, notificaciones, modal pago).
