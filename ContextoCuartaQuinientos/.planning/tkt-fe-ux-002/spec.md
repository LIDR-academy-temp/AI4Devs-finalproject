[← index](_index.md) | [design →](design.md)

# spec.md — FE-UX-002: Login y navegación (UX/UI)

## 0. Documentos de entrada

| Documento | Estado |
|-----------|--------|
| Contexto requerimiento | ✅ Queja explícita: login “muy simple”; sidebar/menú al hover se superpone mal |
| Contexto técnico | ✅ `LoginPage.tsx`, `AppShell`/`AppSidebar`, `UserMenu`, tokens `@theme`, `Web_diseño` login |
| Mockup | ⚠️ Paridad con `Web_diseño` login (split hero + card); no mockup nuevo — usar MVC como referencia visual |

## 1. User story

**Como** residente o administrador,  
**quiero** una pantalla de acceso con identidad clara y un menú lateral que no tape el contenido al expandirse,  
**para** confiar en el portal y trabajar sin distracciones ni clics perdidos.

## 2. Problema (estado actual)

| Área | Hoy | Dolor |
|------|-----|-------|
| **Login** | Card centrada, logo “C”, dos campos y CTA | Poca jerarquía, sin narrativa de valor, sin patrones de formulario reforzados (ver contraseña, ayudas) |
| **Sidebar desktop** | Rail que expande con `pointerenter` + `position` sticky y **sombra encima del `main`** (`z-index` 25) | Al pasar el mouse, el panel “flota” sobre el contenido; sensación de solapamiento y pérdida de área útil |
| **Menú usuario** | Dropdown `absolute` bajo avatar | Puede competir visualmente con sidebar expandido; sin `Escape` explícito documentado en AC |

### No objetivo (esta entrega)

- Selector de condominio en login (existe en MVC; SPA usa JWT sin ese paso — **fuera de alcance**).
- Recuperación de contraseña por correo (no hay ruta en SPA).
- Rebranding global / nuevos colores fuera de `@theme`.
- Admin Bootstrap (`cq-admin-page`).

## 3. Alcance Must

### M1 — Login (paridad visual controlada)

- Layout **dos columnas en `lg+`**: hero (copy + bullets) + card de formulario; **una columna** en móvil (hero compacto arriba o debajo según design).
- Copy de hero desde constantes en archivo de copy UI (marco), no catálogo back.
- Formulario: labels asociados, errores visibles, CTA con estados loading/disabled, **toggle mostrar contraseña**.
- Skip link “Saltar al contenido” (como MVC).
- Estilos en `Web/src/styles/login.css` (scoped con clase raíz `.cq-login-page`); **tokens** de `index.css`, sin nueva dependencia UI.
- Mantener flujo auth actual (`loginSchema`, `AuthContext`, redirect `from` / `cambiar-password`).

### M2 — Sidebar sin solapar contenido (desktop `md+`)

> **Implementado (design §3 iteración 2):** toggle explícito, sin hover en rail. Ver [delta.md](delta.md).

- Al expandir el rail, el **área principal se redimensiona** (flex/grid con ancho animado) — el sidebar **no** cubre texto del `main`.
- Rail colapsado por defecto; expandir/colapsar con **botón** (`SidebarRailToggle` arriba); preferencia `localStorage` `cq-sidebar-collapsed`.
- Tooltips en rail (portal); sin expand al hover.
- Móvil: sin cambio de patrón drawer (`MobileDrawer`).

### M3 — Menú usuario (header)

- Dropdown con cierre: click fuera, `Escape`, y al navegar.
- Posición: anclado al trigger, `z-index` por encima del contenido pero **por debajo** de modales admin; sin quedar oculto bajo header.
- Opcional mejora: foco trap ligero mientras abierto (solo si no rompe tests).

## 4. Criterios de aceptación

| ID | Criterio | Tipo |
|----|----------|------|
| CA-1 | Login `lg+` muestra hero + card; móvil usable sin scroll horizontal | Must |
| CA-2 | Toggle mostrar/ocultar contraseña funciona y es accesible (`aria-pressed` o `type` button) | Must |
| CA-3 | Sidebar expandido **no** incrementa `z-index` sobre `main`; el contenido visible se estrecha o el layout empuja | Must |
| CA-4 | Hover rápido entre iconos no hace parpadear el shell (delays documentados en design) | Must |
| CA-5 | `UserMenu`: `Escape` cierra; item activo navega y cierra | Must |
| CA-6 | `npm test`, `tsc -b`, `vite build` en verde | Must |
| CA-7 | Contraste y foco visible en login y menú (WCAG 2.2 AA objetivo en controles tocados) | Should |

## 5. Pasada adversarial (abogado del diablo)

| # | Objeción | Respuesta / decisión |
|---|----------|----------------------|
| A1 | “Push layout” mueve el contenido y puede desorientar | Aceptado: preferencia explícita del usuario vs overlay; animación ≤300 ms y `prefers-reduced-motion` respeta instantáneo |
| A2 | Delays en hover frustran usuarios rápidos | Delays solo al **cerrar**; apertura inmediata o ≤120 ms |
| A3 | Hero duplica marketing no pedido por negocio | Copy corto (3 bullets), alineado a `Web_diseño`; sin promesas de features inexistentes (sin “recuperar acceso” si no hay flujo) |
| A4 | Romper rail rompe FE-UX-001 | Evolución (EVOLVE): mismo rail, cambio de **modelo de layout** en `AppShell` |
| A5 | Menú dinámico SGR alarga sidebar | Scroll interno ya existe; validar con seed `DB-007` en smoke manual |

**Veredicto adversarial:** spec aprobable para diseño; riesgo medio en CA-3 (refactor layout).

## 6. Riesgos

- Regresión visual en tests de `AppSidebar` / `AppShell` si existen.
- Usuarios con `prefers-reduced-motion`: desactivar transiciones de ancho.

## 7. Fuera de alcance

- Forgot password, multi-condominio login, tema runtime (FE-THEME-001).
