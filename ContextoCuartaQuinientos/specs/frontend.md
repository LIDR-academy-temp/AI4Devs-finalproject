# Frontend — System Spec (transversal)

Source of truth del comportamiento UI compartido de la SPA (`Web/`), independiente de dominios de negocio.

## Patrones admin (kit FE-PAT-001)

| Componente | Ruta | Uso |
|------------|------|-----|
| `PageHeader` | `shared/components/admin/PageHeader.tsx` | Título, descripción, slot acciones |
| `SectionHero` | `SectionHero.tsx` | Card hero con badge pill (`@theme` primary) |
| `AlertBanner` | `AlertBanner.tsx` | success / error / warning dismissible |
| `FormModal` | `FormModal.tsx` | Dialog accesible (`role="dialog"`, `aria-modal`, focus al abrir, Escape + Tab wrap) |
| `ConfirmDialog` | `ConfirmDialog.tsx` | Sustituto de `window.confirm` |
| `AdminDataTable` | `AdminDataTable.tsx` | Shell tabla (thead, loading skeleton, empty vía children) |
| `AdminMobileCard` | `AdminMobileCard.tsx` | Fila de listado como card (`≥ md` tabla; `< md` cards) |
| `AdminMobileCardList` | `AdminMobileCardList.tsx` | Lista de cards desde `filteredRows` |
| `EmptyState` | `EmptyState.tsx` | Icono + mensaje + CTA opcional |

- Importar desde `Web/src/shared/components/admin` (barrel).
- Paleta: tokens `@theme` en `index.css`; Bootstrap 5 solo en scope admin (ver [[FE-PAT-002]]).
- Layout split + tabla filtrable: [PATRON_CRUD_ADMIN.md](../.planning/PATRON_CRUD_ADMIN.md).
- Referencia visual: [ui-referencia-visual.md](../referencia/ui-referencia-visual.md).

## Stack admin Bootstrap + tabla filtrable (FE-PAT-002)

| Artefacto | Ruta |
|-----------|------|
| Variables BS ↔ Pantone | `Web/src/styles/bootstrap-pantone.css` |
| Estilos `cq-*` | `Web/src/styles/cq-admin.css` (ancestro `.cq-admin-page`) |
| Toolbar listado | `AdminListToolbar.tsx` |
| Split + panel | `AdminSplitLayout.tsx`, `AdminSidePanel.tsx` |
| Tabla filtrable | `AdminFilterableTable.tsx` (wrapper desktop `.cq-admin-table-pane`) |
| Error listado → toast | `useQueryErrorToast.ts` |
| Motor filtro cliente | `shared/lib/clientTableFilter.ts`, `useClientTableFilter.ts`, `shared/types/tableFilter.ts` |
| Config por pantalla | `features/<dominio>/*TableFilter.ts` |

- Deps: `bootstrap`, `@mdi/font` en `Web/package.json`.
- Errores DELETE: mensaje compuesto en `ConfirmDialog.message` (incluir `problem.detail`).

## Toasts globales ([[FE-UX-003]])

| Artefacto | Ruta |
|-----------|------|
| Provider | `shared/toast/ToastContext.tsx` — montado en `main.tsx` |
| API | `useToast()` → `success` / `error` / `show` |

## Shell, navegación y home ([[FE-UX-001]] / [[FE-UX-003]])

| Artefacto | Ruta |
|-----------|------|
| Crumbs | `shared/navigation/routeCrumbs.ts`, `useRouteCrumbs.ts` |
| Título módulo | `ModuleTitle.tsx` (header `lg+`) |

| Artefacto | Ruta |
|-----------|------|
| Breadcrumbs | `shared/components/Breadcrumbs.tsx` — visible en header desde `md+` |
| Drawer móvil | `MobileDrawer.tsx` — hamburguesa en `AppShell` (`< md`) |
| Home | `pages/HomePage.tsx` — saludo, skeletons, `QuickAccessCard`, resumen dashboard |
| Grupos sidebar | `SidebarGroup.tsx` + menú SGR ([[SGR-FE-001]]) o `APP_NAV` |

- Listados admin en móvil ([[FE-UX-004]] + [[FE-UX-005]]): en pantallas con `AdminFilterableTable` — **Casas, Usuarios, Tickets** (pilotos) y **Anuncios, Encuestas, Archivos, Tipos de documento, Juntas, Visitas, Vehículos, Mascotas, Perfiles** — `AdminMobileCardList` + mismo `filteredRows` que la tabla; tabla oculta `<768px` (`.cq-admin-table-pane`). Error de listado → `useQueryErrorToast`; mutaciones de página → `toast.success` donde aplica; `formError` en paneles admin / `ConfirmDialog` siguen inline.
- Cards por feature: `features/admin/<modulo>/*AdminMobileCard.tsx` o `features/navegacion/PerfilAdminMobileCard.tsx`.
- Tests: `Web/src/test/stubToast.ts` para mock de `useToast` en Vitest de páginas admin.
- Modo claro/oscuro ([[FE-UX-006]]): toggle en `UserMenu`, `ThemeProvider`, `localStorage` (`cq-theme`), tokens `html.dark` + overrides `app-shell.css` / `bootstrap-pantone.css` / `cq-admin.css`.
- Onboarding primera visita ([[FE-UX-006]]): `OnboardingWelcome` en `HomePage`, clave `cq-onboarding-v1`.
- Residente — error de carga ([[FE-UX-006]]): `useQueryErrorToast` en home, tickets, estado de cuenta, listados (anuncios, encuestas, juntas, archivos), nuevo ticket, perfil (carga), mascotas/vehículos, áreas/reservaciones; detalle junta/anuncio/encuesta; admin encuesta/resultados; estado de cuenta con cards móvil (`CuotaAdminMobileCard`).
- Auth ([[FE-UX-006]] fase 4): `LoginPage` y `CambiarPasswordPage` — errores de servidor vía toast; estilos compartidos `login.css` + `html.dark`.
- Residente — guardar en modal/form ([[FE-UX-006]] fase 5): `formError` / `serverError` de mutación → toast en mascotas, vehículos, reservaciones y perfil (validación de campo sigue inline).
- Admin — catálogos ([[FE-ADMIN-CAT-001]]): pestañas Tipos/Razas (mascotas), Categorías (almacén), Tipos de ID (visitas), Marcas/Modelos (vehículos); hooks `*Catalog` + `reload`; ver [delta](.planning/tkt-fe-admin-cat-001/delta.md).
- Tests tema/toast: `stubTheme.ts` + `stubToast.ts` en `setup.ts`; `ToastContext.test.tsx` usa `vi.unmock`.
- Superficies residente ([[FE-UX-006]]): preferir `bg-surface-alt` + `border-neutral-100` en cards/home/modales (`QuickAccessCard`, resúmenes dashboard, `PerfilRegistroCard`, `FormModal`); toasts default con tokens semánticos.
- **Almacén, Menús, Perfil permisos, Finanzas admin** ([[FE-UX-005]] Could): cards móvil + toasts de listado/mutación alineados a FE-UX-004 (árbol de menús en desktop; lista plana en `<lg`).

## Login y app shell ([[FE-UX-002]])

| Artefacto | Ruta |
|-----------|------|
| Login split | `pages/LoginPage.tsx`, `styles/login.css`, `features/auth/loginCopy.ts` |
| Contraseña | `shared/components/PasswordField.tsx` |
| Layout | `shared/components/AppShell.tsx`, `styles/app-shell.css` |
| Sidebar | `AppSidebar.tsx`, `SidebarRailToggle.tsx`, `SidebarItem.tsx`, `useCollapsedNavHint.tsx` |
| Estado rail | `shared/hooks/useSidebarCollapsed.ts` (`localStorage` `cq-sidebar-collapsed`, default colapsado) |
| Menú usuario | `UserMenu.tsx` — `Escape` cierra; navegación cierra dropdown |

- Desktop `md+`: ancho sidebar `3.25rem` (rail) / `12.5rem` (expandido); **push** sobre `main` (sin overlay z-index sobre contenido).
- Expandir/colapsar solo con botón en toolbar superior del sidebar (no hover en el rail).
- Rail: iconos + tooltip portal a la derecha del ítem.
- Móvil: `MobileDrawer` sin cambio de patrón.
- Login: flujo auth existente (`loginSchema`, `AuthContext`); sin selector condominio ni forgot password.

## Navegación dinámica ([[SGR-FE-001]])

| Artefacto | Ruta |
|-----------|------|
| Provider / hook | `features/navegacion/NavegacionContext.tsx`, `useNavegacionMenus.ts` |
| API cliente | `features/navegacion/navegacion.api.ts` |
| Árbol → nav | `menuToNav.ts`, `menuIcons.ts` |
| Guard rutas | `shared/components/NavMenuGuard.tsx` |
| 403 | `pages/ForbiddenPage.tsx` |
| Admin SGR | `AdminMenusPage`, `AdminPerfilesPage`, `AdminPerfilPermisosPage` |

- Menú usuario: `GET /SGR/Navegacion/menus` (JWT). Vacío → `APP_NAV` estático.
- Con menú API poblado: `NavMenuGuard` exige ruta en árbol permitido.
- Admin menús/permisos: APIs [[SGR-BE-030]]; listado perfiles `GET /SGR/Perfiles/admin`.
- **(delta [[FE-ADMIN-UX-002]])** `/admin/menus`: panel lateral CRUD + `MenuPerfilPermisosPanel`; APIs `GET/PUT /SGR/Menus/admin/{id}/permisos-perfiles`.
- Seed menús: `SQL/DB-007_sgr_menus_seed.sql` (ticket DB-006 SGR); tras ejecutarlo el sidebar usa API si hay filas en `PerfilMenus`.
- **(delta [[NAV-ROOT-001]])** Epic completo: manifest + DB-008 + fases A–G; matriz [MATRIZ_MODULOS.md](.planning/tkt-nav-root-001/MATRIZ_MODULOS.md); incluye RPT/BI, integración BOT web, NTF admin.
- **(delta [[FE-NAV-ENT1-001]])** Entrega 1: fases E/F/G con `implemented: false` + `filterNavItemsByManifest`; SQL opcional `20261030_sgr_menus_entrega1_off_nav_efg.sql`. Ocultar solo en BD no basta (supplement re-inyectaba).

## Rutas residente ([[FE-CRUD-004]])

| Artefacto | Ruta |
|-----------|------|
| Descarga autenticada | `shared/lib/downloadAuthenticated.ts` (JWT `getAccessToken`, refresh 401) |
| Kit UI | Mismo barrel `shared/components/admin` — **sin** import Bootstrap en páginas residente |
| Formularios alta/edición | Zod + RHF donde aplica: tickets, reservas, vehículos, mascotas, perfil |
| Hooks HTTP | `const { data, problem, status } = await apiGet<T>(…)` — nunca asignar el objeto respuesta al estado |

Inventario M5 (loading/error/empty + kit): `/tickets`, `/areas-comunes`, `/mis-vehiculos`, `/mis-mascotas`, `/archivos`, `/anuncios`, `/encuestas`, `/juntas`, `/finanzas/cuenta`, `/perfil`.

## Calidad e integración ([[FE-QA-001]])

| Capa | Artefacto | Cuándo |
|------|-----------|--------|
| Contrato HTTP | `shared/lib/apiClient.integration.test.ts` | Cambios en `apiClient.ts` |
| Unit/UI dominio | `*.test.tsx` con mocks en borde | Pantallas y hooks |
| Smoke E2E | `Web/e2e/*.spec.ts` (4 specs) | Local/QA con `E2E_SMOKE=1` |

- Vitest **no** incluye `e2e/` (`vite.config.ts` → `test.exclude`).
- Variables E2E: `E2E_BASE_URL`, `E2E_ADMIN_CORREO`, `E2E_RESIDENT_CORREO`, `FASE1_SMOKE_PASSWORD` / `E2E_ADMIN_PASSWORD` / `E2E_RESIDENT_PASSWORD`.
- Pre-release: checklist en [.planning/tkt-fe-qa-001/impl.md](../.planning/tkt-fe-qa-001/impl.md).

## Piloto de referencia

- Admin: `AdminCasasPage` — split + panel lateral CRUD, tabla filtrable, `ConfirmDialog` delete.
- Residente: `TicketsPage` + `AreasYReservacionesPage` — referencia auth HTTP + `FormModal`/`AlertBanner`.

## Reglas de negocio (UI)

- Mensajes de error de API: `problem.detail` del backend; no literales de negocio hardcodeados en componentes del kit.
- Formularios admin: React Hook Form + Zod (patrón del piloto Casas).

## Objetos SQL

N/A (SPA).

## Endpoints API

N/A en este dominio (consumen contratos por módulo).

## Changelog

| Fecha | Requerimiento | Cambio |
|-------|---------------|--------|
| 2026-11-04 | [[FE-ADMIN-UX-002]] | `/admin/menus` permisos por menú; finanzas tablas filtrables; fix vigencia anuncios (fecha). |
| 2026-10-30 | [[PROD-ADMIN-001]] | Pestañas archivos/anuncios admin; CRUD perfiles; alineación prod documentada. |
| 2026-10-30 | [[FE-NAV-ENT1-001]] | Ocultar sidebar E/F/G entrega 1; manifest `implemented:false`; filtro nav; script PerfilMenus. |
| 2026-10-30 | [[PROD-RES-001]] | `supplementApiNavWithManifest` si SGR prod incompleto; encuestas residente PascalCase; pases visita combo Tipo ID. |
| 2026-10-27 | [[FE-PAT-001]] | Kit admin + piloto `AdminCasasPage`; spec transversal creado |
| 2026-10-27 | [[FE-PAT-002]] | Bootstrap scoped, split/panel, `AdminFilterableTable` genérico; Casas referencia CRUD |
| 2026-10-27 | [[SGR-FE-001]] | Sidebar JWT + admin menús/perfiles + `NavMenuGuard` |
| 2026-10-27 | [[FE-CRUD-004]] | Residente M5: kit admin sin Bootstrap, `downloadAuthenticated`, Zod en CRUD propio |
| 2026-10-27 | [[FE-QA-001]] | Pirámide pruebas: `apiClient.integration.test.ts`, Playwright opt-in, checklist smoke |
| 2026-10-27 | [[FE-UX-002]] | Login hero+card; shell push + sidebar toggle (`useSidebarCollapsed`); `PasswordField`; tests shell/login |
| 2026-10-27 | [[FE-UX-001]] | Cierre transversal: grupos/íconos, `UserMenu`, `HomePage`, breadcrumbs desktop, drawer móvil; diferidos en delta |
| 2026-10-27 | [[FE-UX-003]] | `ToastProvider`; crumbs con menú SGR; `ModuleTitle`; acordeón `SidebarGroup` |
| 2026-10-27 | [[FE-UX-004]] | Cards móvil admin (3 pilotos); `useQueryErrorToast`; `.cq-admin-table-pane` |
| 2026-10-27 | [[FE-UX-005]] | Rollout cards+toasts a 9 admin; `useTiposArchivo.error`; tests toast por página |
| 2026-10-27 | [[FE-UX-006]] | Residente (toasts detalle + cards estado cuenta); modo oscuro + onboarding; contraste shell/admin |
