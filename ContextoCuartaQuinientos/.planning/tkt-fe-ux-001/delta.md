# Delta: tkt-fe-ux-001-redesign-ux

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Shell autenticado con header (marca, breadcrumbs desktop, campana, menú usuario), sidebar agrupado con íconos Lucide y rail colapsable (toggle + `localStorage`).
- Drawer móvil (`< md`) con hamburguesa; contenido a ancho completo.
- `UserMenu`: avatar/iniciales, perfil, cambiar contraseña, notificaciones, cerrar sesión; cierre con click fuera y `Escape`.
- `HomePage`: saludo por hora, cards de resumen con íconos, accesos rápidos por perfil, skeletons en carga.
- `Breadcrumbs` generados desde ruta + `APP_NAV` (incl. `/403` → «Acceso denegado»).
- Microinteracciones: hover en cards de home/quick access; animación dropdown menú usuario (`slideInDown`).

## Comportamiento modificado

- **(Antes):** Sidebar plana sin grupos ni íconos; header mínimo.
- **(Después):** Navegación por grupos (estático + API SGR), íconos, estado activo, integración `NavMenuGuard`.

- **(Antes):** Home solo título + cards básicas.
- **(Después):** Saludo + quick access + skeletons + resumen dashboard.

- **Login / sidebar desktop:** entregado en [[FE-UX-002]] (hero+card, layout push, sin overlay sobre `main`).

## Comportamiento eliminado

- N/A (evolución incremental; hover-rail descartado en favor de toggle — ver FE-UX-002).

## Diferido (fuera de este cierre)

- Breadcrumbs visibles en viewport `< md`.
- Título de módulo en header + auto-expansión de grupo sidebar (S2).
- Tablas admin como cards apiladas en móvil (se mantiene `table-responsive` / scroll — AC9).
- Toasts globales animados (M5).
- Modo oscuro y tour onboarding (Could).

## Objetos SQL afectados

N/A.

## Endpoints API afectados

N/A (consumo existente `GET /SGR/Navegacion/menus` vía [[SGR-FE-001]]).

## Para el reviewer

- **Qué se hizo:** Rediseño transversal de navegación, shell, home y menú usuario; login/sidebar push en FE-UX-002.
- **Por qué:** FE-UX-001 spec (usabilidad, responsive, identidad).
- **Riesgo:** Bajo — solo `Web/`; sin cambio de contratos API.
- **Qué probar:** Login; toggle sidebar; drawer móvil; `UserMenu`; home ambos perfiles; breadcrumbs desktop; `npm test`.
- **Rollback:** Revertir commits Web en rama feature.

## Aprendizajes

- Tickets UX hermanos (FE-UX-001 vs FE-UX-002) conviene cerrar con **delta explícito** de qué ticket absorbió qué AC para evitar hubs eternos en «spec-ready».
- AC9 permite scroll horizontal: no bloquear cierre por falta de card-layout móvil si el spec lo admite.

## Decisiones (ADR)

| Fecha | Decisión | Alternativa descartada | Motivo |
|-------|----------|------------------------|--------|
| 2026-10-27 | Cerrar FE-UX-001 con alcance consolidado + diferidos documentados | Reabrir todo en un solo PR monolítico | Ya implementado vía SGR/CRUD/UX-002 |
| 2026-10-27 | Breadcrumbs solo `md+` | Barra duplicada en móvil | Prioridad espacio header móvil |
