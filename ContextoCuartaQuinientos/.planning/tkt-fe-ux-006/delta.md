# Delta: tkt-fe-ux-006-resident-dark-onboarding

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- **Tema:** `Web/src/shared/lib/themePreference.ts`, `Web/src/features/theme/ThemeContext.tsx`; toggle «Modo claro/oscuro» en `UserMenu`; `OnboardingWelcome` (3 pasos) en `HomePage`.
- **Residente móvil:** cards de cuotas en `EstadoCuentaPage` (`CuotaAdminMobileCard` sin `onRegistrarPago`).
- **Tests:** `themePreference.test.ts`, `OnboardingWelcome.test.tsx`; `Web/src/test/stubTheme.ts`.

## Comportamiento modificado

- **Errores de carga (residente/admin lectura):** banners/`alert-danger` sustituidos por `useQueryErrorToast` + mensaje/reintentar en: `HomePage`, `TicketsPage`, `EstadoCuentaPage`, `JuntaDetallePage`, `AnuncioDetallePage`, `EncuestaDetallePage`, `AdminEncuestaDetallePage`, `ResultadosEncuestaPage`.
- **Modo oscuro:** tokens en `index.css` (`html.dark`); gradientes shell fijos (no usan `primary-dark` invertido); overrides Bootstrap bajo `html.dark .cq-admin-page`; empty states y formularios admin con variables CQ.
- **Menú usuario:** dropdown usa `bg-surface-alt` y texto `neutral-900` (legible en ambos temas).
- **Tests:** `setup.ts` importa `stubTheme` y `stubToast`; `ToastContext.test.tsx` hace `vi.unmock`; ajustes `EncuestaDetallePage`, `EstadoCuentaPage`, `AnuncioDetallePage`, `HomePage` (onboarding dismiss en tests).
- **Documentación:** `specs/frontend.md` — modo oscuro y onboarding ya no listados como diferidos FE-UX-001.

## Comportamiento eliminado

- `AlertBanner` / `alert-danger` como patrón principal de **error de carga** en las páginas del alcance B1.

## Objetos SQL afectados

N/A.

## Endpoints API afectados

N/A.

## Para el reviewer

- **Qué se hizo:** Cierre Could FE-UX-001 (tema + onboarding) + paridad toast residente acordada; fix contraste oscuro.
- **Por qué:** Ticket separado de FE-UX-005 para no reabrir delta archivado.
- **Riesgo:** Bajo — solo `Web/` y contexto.
- **Qué probar:** Toggle tema → sidebar, `/admin/almacen` tabs, dropdown usuario; home onboarding (borrar `cq-onboarding-v1`); error red en tickets/encuesta → toast.
- **Rollback:** Revertir commits `Web/` + `.planning/tkt-fe-ux-006` + entradas en graph/specs.

## Aprendizajes

- No reutilizar `--color-primary-dark` invertido en gradientes del shell: rompe sidebar/header.
- Dropdown con `bg-white` + tokens de texto pensados para fondo oscuro → ilegible; usar superficies semánticas.
- `stubToast` global en `setup.ts` exige `vi.unmock` en tests del provider real.

## Decisiones (ADR)

| Fecha | Decisión | Alternativa descartada | Motivo |
|-------|----------|------------------------|--------|
| 2026-10-27 | Ticket FE-UX-006 vs ampliar delta 005 | Reabrir FE-UX-005 | 005 ya ARCHIVADO en SDD |
| 2026-10-27 | Gradientes shell con hex fijos | `var(--color-primary-dark)` en dark | Contraste navegación |

## Comportamiento modificado (fase 2 — listados residente)

- **Listados y módulos residente:** `useQueryErrorToast` en Anuncios, Encuestas, Juntas, Archivos (carga + descarga), Nuevo ticket (catálogos), Perfil (carga), Mis mascotas/vehículos (lista + delete), Áreas/reservaciones (áreas + reservas); éxito de reserva → `toast.success`.
- **Superficies:** cards/listas residente usan `bg-surface-alt` / tokens neutros (mejor en modo oscuro).

## Comportamiento modificado (fase 3 — superficies + previews)

- Tarjetas residente/admin en home: `QuickAccessCard`, `ResumenResidenteCards`, `ResumenAdminCards` → `bg-surface-alt`.
- `PerfilRegistroCard`: toast en `error` del preview; superficie semántica.
- `NotificationBell` / dropdown: toast en fallo de carga + panel con tokens de superficie.
- Toasts neutros (`ToastContext` default), `FormModal`, `OnboardingWelcome` alineados a modo oscuro.
- Detalle junta, estado de cuenta (KPIs), cards mascotas/vehículos/áreas.

## Comportamiento modificado (fase 4 — login + encuesta)

- **`LoginPage`:** error de autenticación → `useQueryErrorToast` (paridad con `CambiarPasswordPage`).
- **`CambiarPasswordPage`:** títulos alineados a tokens de card en modo oscuro.
- **`EncuestaDetallePage`:** fieldsets con superficie semántica; error de carga sin duplicar detalle en `EmptyState` (toast lleva el mensaje).
- **`login.css`:** card e inputs legibles bajo `html.dark`.

## Comportamiento modificado (fase 5 — modales residente)

- **`MisMascotasPage` / `MisVehiculosPage` / `AreasYReservacionesPage`:** `formError` de guardar/validar → `useQueryErrorToast` (solo con modal abierto).
- **`PerfilPage`:** `serverError` al guardar → toast (sin `AlertBanner`).

## Diferido

- `formError` en paneles admin CRUD — se mantienen inline (FE-PAT-002).
- Validación Zod de campos en modales — sigue inline junto al control (`errors.*`).
