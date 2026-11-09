# spec — TKT-FE-PORTAL-LAYOUT-001: Recuadro unificado (portal ≠ admin)

## Objetivo

Las pantallas del menú (residente/trabajador) deben usar el mismo **contenedor visual** que admin: fondo `surface` + **card** blanca con sombra (`cq-admin-page`), no título/tablas flotando sobre el fondo crema.

## Alcance

- Componente `PortalPageLayout` (reutiliza tokens/bootstrap de `.cq-admin-page`).
- Migrar páginas bajo `AppShell` que hoy usan `<main className="mx-auto max-w-…">`.
- **Fuera:** `LoginPage`, `ForbiddenPage`, `CambiarPasswordPage`, `ValidarPasePage`, páginas `Admin*` (ya tienen `cq-admin-page`).

## AC

- AC-01: `/finanzas/cuenta`, `/notificaciones`, `/anuncios` muestran contenido dentro de card con sombra.
- AC-02: Misma apariencia en modo claro/oscuro (tokens existentes).
- AC-03: Admin sin doble recuadro (sin cambio estructural en `Admin*`).
