# TKT-FE-UX-001 — Rediseño UX Integral: Navegación, Responsividad y Sección de Usuario

| Campo     | Valor           |
|-----------|-----------------|
| Estado    | 📋 spec-ready / design-validated |
| Creado    | 2026-10-23      |
| Autor     | afonseca@nice.com.mx |
| Prerreqs  | FE-DS-001 ✅, FE-SHELL-001 ✅ |
| Rama      | (pendiente) feature/tkt-fe-ux-001-redesign-ux |

## Documentos

| Documento | Estado |
|-----------|--------|
| [spec.md](spec.md) | ✅ Completo |
| [design.md](design.md) | ✅ Completo |

## Resumen

Rediseño UX integral del portal CuartaQuinientos sobre la base del Design System Pantone (FE-DS-001) y el Shell (FE-SHELL-001). Incluye:

- **Sidebar con íconos y agrupación lógica** por categoría (Mi Cuenta, Mi Comunidad, Mis Registros / Gestión, Comunidad, Registro).
- **Sidebar colapsable** a solo-íconos con toggle en desktop.
- **Navegación responsive** con drawer overlay en móvil (< 768px).
- **Menú de usuario** en header con dropdown (perfil, password, logout, badge de rol).
- **HomePage mejorada** con saludo personalizado, cards con íconos, loading skeletons y accesos rápidos por perfil.
- **Microinteracciones CSS** (hover cards, button feedback, drawer transitions, toast animations).
- **Responsive global** para todas las páginas (tablas → cards en móvil).
- **Breadcrumbs contextuales** (should).
- **Login con branding visual** mejorado (should).

## Dependencia única nueva

`lucide-react` — iconografía tree-shakeable (~7.5KB gzip total estimado).

## Estimación

3-5 días · ~500-700 líneas nuevas · 8 componentes nuevos · 5 modificados
