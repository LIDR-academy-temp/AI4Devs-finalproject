# Spec — FE-UX-006 (ligero)

> [← index](_index.md)

## 0. Documentos de entrada

| Documento | Fuente |
|-----------|--------|
| Contexto requerimiento | Ítems **Could** de [[FE-UX-001]] (modo oscuro, onboarding) + paridad toast en flujos **residente** acordados post [[FE-UX-005]] |
| Contexto técnico | [specs/frontend.md](../../specs/frontend.md), patrones [[FE-UX-003]] / [[FE-UX-004]] |
| Mockup | N/A (reutiliza shell existente) |

## 1. Objetivo

Documentar e implementar en un ticket separado de [[FE-UX-005]]:

1. **B — Residente/detalle:** sustituir banners de error de **carga** por `useQueryErrorToast` en pantallas acordadas; cards móvil en estado de cuenta.
2. **C — FE-UX-001 Could:** toggle claro/oscuro persistente, onboarding primera visita, contraste usable en shell y admin.

## 2. Alcance

### In

| ID | Descripción |
|----|-------------|
| B1 | `useQueryErrorToast` en: `HomePage`, `TicketsPage`, `EstadoCuentaPage`, `JuntaDetallePage`, `AnuncioDetallePage`, `EncuestaDetallePage`, `AdminEncuestaDetallePage`, `ResultadosEncuestaPage` |
| B2 | `EstadoCuentaPage`: tabla desktop + `AdminMobileCardList` + `CuotaAdminMobileCard` (sin registrar pago) |
| C1 | `themePreference.ts`, `ThemeProvider`, `initThemeFromStorage` en `main.tsx`, toggle en `UserMenu` |
| C2 | Tokens `html.dark` en `index.css`; overrides shell (`app-shell.css`), admin Bootstrap (`bootstrap-pantone.css`), `cq-admin.css` |
| C3 | `OnboardingWelcome` en `HomePage`, clave `localStorage` `cq-onboarding-v1` |
| T1 | Tests: `themePreference.test.ts`, `OnboardingWelcome.test.tsx`; stubs `stubTheme` + `stubToast` en `setup.ts` (con `vi.unmock` en `ToastContext.test.tsx`) |

### In (fase 2 — mismo ticket)

| ID | Descripción |
|----|-------------|
| B3 | Listados residente: `AnunciosPage`, `EncuestasPage`, `JuntasPage`, `ArchivosPage`, `NuevoTicketPage`, `PerfilPage` (carga), `MisMascotasPage`, `MisVehiculosPage`, `AreasYReservacionesPage` (carga + éxito reserva toast) |

### In (fase 4 — auth + encuesta residente)

| ID | Descripción |
|----|-------------|
| B4 | `LoginPage` / `CambiarPasswordPage`: card `login.css`, `PasswordField`, errores de servidor → `useQueryErrorToast` (sin banner rojo) |
| B5 | `EncuestaDetallePage`: superficies `bg-surface-alt` en preguntas; carga/envío con toast; empty genérico en error de carga |
| C4 | `login.css`: overrides `html.dark` para card, inputs y skip link |

### In (fase 5 — modales residente)

| ID | Descripción |
|----|-------------|
| B6 | Errores de mutación (`formError` / `serverError`) → toast en mascotas, vehículos, reservaciones y perfil; validación de campo sigue inline |

### Out
- WMS / `DB-005` / `SqlSchemaCompat` — fuera de FE-UX-006 (infra BD/API).
- Tema editable en runtime (FE-THEME-001 roadmap).

## 3. Criterios de aceptación

| CA | Criterio |
|----|----------|
| CA-B1 | Error de API en pantallas B1 → toast + UI mínima (empty/reintentar), sin `AlertBanner` de listado/carga |
| CA-B2 | Estado de cuenta en viewport móvil muestra cards de cuota |
| CA-C1 | Toggle en menú usuario persiste tema; recarga conserva preferencia |
| CA-C2 | Modo oscuro: sidebar, tabs admin, métricas y dropdown usuario legibles (contraste) |
| CA-C3 | Primera visita home muestra onboarding; Omitir/Entendido no vuelve a mostrar |
| CA-B3 | Listados B3: error de carga → toast; reintentar donde el hook expone `refetch`/`reload` |
| CA-T1 | `npm test` en verde |

## 4. Trazabilidad

- Origen: follow-up explícito para no mezclar con delta cerrado de [[FE-UX-005]].
- Referencia UX-001: C2 modo oscuro, C3 onboarding (antes “diferido” en `specs/frontend.md`).
