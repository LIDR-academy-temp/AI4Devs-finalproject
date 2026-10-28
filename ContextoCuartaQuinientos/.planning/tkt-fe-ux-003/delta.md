# Delta: tkt-fe-ux-003-ux-polish-deferred

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Toasts globales: `ToastProvider` en `main.tsx`, API `useToast()` (`success` / `error` / `show`), auto-dismiss y cierre manual; animación `slideInDown`.
- Resolución de ruta: `routeCrumbs.ts` + `useRouteCrumbs()` (menú SGR o `APP_NAV`).
- `ModuleTitle` en header desktop (`lg+`).
- Sidebar: grupos con toggle acordeón (sidebar expandido), clase `cq-nav-group--active` si hay ítem activo.

## Comportamiento modificado

- **(Antes):** `Breadcrumbs` solo `APP_NAV`; labels SGR ausentes en rutas dinámicas.
- **(Después):** crumbs desde `useNavegacion().items` cuando el menú API está poblado.

- **(Antes):** `AdminTicketsPage` alert Bootstrap local para feedback.
- **(Después):** `useToast()` para asignar/cambiar estado.

- **(Antes):** `SidebarGroup` siempre muestra todos los ítems con etiqueta estática.
- **(Después):** cabecera de grupo colapsable; grupos abiertos por defecto; reabre grupo con ruta activa al navegar.

## Comportamiento eliminado

- Alert dismissible inline de éxito/error en `AdminTicketsPage` (sustituido por toast global).

## Objetos SQL afectados

N/A.

## Endpoints API afectados

N/A.

## Para el reviewer

- **Qué se hizo:** Polish UX diferido de FE-UX-001 (toasts, contexto de ruta, sidebar).
- **Por qué:** FE-UX-003 / cierre de diferidos documentados en delta FE-UX-001.
- **Riesgo:** Bajo — solo `Web/`.
- **Qué probar:** Admin tickets (toast); breadcrumbs móvil; `ModuleTitle` en `lg+`; acordeón sidebar; `npm test`.
- **Rollback:** Revertir commits en `Web/`.

## Aprendizajes

- Provider de toast sin dependencia externa basta para piloto; migrar pantallas de forma incremental.

## Decisiones (ADR)

| Fecha | Decisión | Alternativa descartada | Motivo |
|-------|----------|------------------------|--------|
| 2026-10-27 | Toast React context propio | Sonner / react-hot-toast | Sin nueva dep; control total de estilos `@theme` |
| 2026-10-27 | Grupos sidebar abiertos por defecto | Solo grupo activo visible | Descubrimiento + tests de navegación admin |
