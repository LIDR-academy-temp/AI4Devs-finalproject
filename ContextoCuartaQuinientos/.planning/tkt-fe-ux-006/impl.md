# Impl — FE-UX-006

> [← index](_index.md) | [delta →](delta.md)

## Resumen

Implementación ya aplicada en repo `Web/` (sin design.md — reutiliza patrones existentes).

## Archivos principales

| Área | Rutas |
|------|--------|
| Tema | `shared/lib/themePreference.ts`, `features/theme/ThemeContext.tsx`, `main.tsx`, `index.css` |
| Shell oscuro | `styles/app-shell.css`, `styles/bootstrap-pantone.css`, `styles/cq-admin.css` |
| Onboarding | `shared/components/OnboardingWelcome.tsx`, `HomePage.tsx` |
| Usuario | `shared/components/UserMenu.tsx`, `shared/components/SidebarItem.tsx` |
| Residente B | `pages/{Home,Tickets,EstadoCuenta,JuntaDetalle,AnuncioDetalle,EncuestaDetalle,Anuncios,Encuestas,Juntas,Archivos,NuevoTicket,Perfil,MisMascotas,MisVehiculos,AreasYReservaciones}Page.tsx`, `AdminEncuestaDetallePage.tsx`, `ResultadosEncuestaPage.tsx` |
| Tests | `test/stubTheme.ts`, `test/setup.ts`, `*.test.tsx` actualizados |

## Verificación

```powershell
cd Web
npm test -- --run
node_modules\.bin\tsc --noEmit
```

| Shell | `QuickAccessCard`, `Resumen*Cards`, `NotificationBell`, `ToastContext`, `FormModal`, `OnboardingWelcome` |
| Perfil | `PerfilRegistroCard.tsx` + test |

**Fase 4:** `LoginPage.tsx`, `CambiarPasswordPage.tsx`, `EncuestaDetallePage.tsx`, `login.css`; tests `LoginPage.test.tsx`.

Última corrida documentada: ver Vitest en repo (fase 4 + suite admin).

## Auditoría

- auditor-sql: N/A
- auditor-codigo: no re-auditado formalmente en cierre ligero; cambios acotados a UI/tests.

## Nota

Fix WMS (`DB-005`, `SqlSchemaCompat`, `AdminAlmacenPage` lazy préstamos) puede ir en el mismo PR de rama pero **no** forma parte del alcance de este spec.
