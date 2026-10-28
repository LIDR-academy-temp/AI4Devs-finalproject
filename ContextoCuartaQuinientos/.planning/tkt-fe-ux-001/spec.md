[← index](_index.md) | [design →](design.md)

# spec.md — FE-UX-001: Rediseño UX Integral — Navegación, Responsividad y Sección de Usuario

> **Tipo:** Feature (transversal UI/UX)
> **Prioridad:** Alta
> **Autor:** afonseca@nice.com.mx
> **Fecha:** 2026-10-23
> **Prerrequisitos:** FE-DS-001 (Design System ✅), FE-SHELL-001 (Shell + Sidebar ✅)

---

## 1. User Story

**Como** usuario del portal CuartaQuinientos (residente o administrador),
**quiero** una interfaz dinámica con navegación clara, menús organizados por contexto, sección de usuario con accesos rápidos, y diseño responsive que funcione en móvil y escritorio,
**para** encontrar cualquier función sin esfuerzo, sentir que uso una aplicación moderna y profesional, y operar cómodamente desde cualquier dispositivo.

---

## 2. Contexto / Problema

| Aspecto | Estado actual | Problema |
|---------|--------------|----------|
| **Sidebar** | Lista plana de 11-13 links sin agrupar ni íconos | Difícil escanear; todos los ítems tienen la misma jerarquía visual; no hay categorías lógicas |
| **Navegación móvil** | Sidebar fija de 224px siempre visible | En pantallas < 768px el sidebar se come el espacio del contenido; no hay hamburger ni drawer |
| **Sección de usuario** | Solo nombre + botón "Cerrar sesión" en header | Sin acceso rápido a perfil, cambiar contraseña, notificaciones ni rol visible del usuario |
| **Header** | Minimalista: logo + nombre + bell + logout | No transmite identidad; sin breadcrumbs ni contexto de ubicación |
| **Dinamismo visual** | Cards estáticas sin transiciones | La app se siente "muerta"; sin feedback visual al interactuar, sin estados animados |
| **Página de inicio** | Solo título + cards de resumen | Sin saludo personalizado, accesos rápidos, ni vista de actividad reciente |
| **Login** | Card funcional pero básica | Sin branding fuerte, sin ilustración ni elemento visual que transmita identidad condominial |

### Fuentes

| Tipo | Fuente |
|------|--------|
| Requerimiento | Solicitud directa del usuario: "web dinámica, usabilidad, colores, responsiva, menús, sección de usuario" |
| Técnico | `AppShell.tsx`, `AppSidebar.tsx`, `appNavigation.ts`, `index.css` @theme (FE-DS-001) |
| Design System | FE-DS-001 completado: paleta Pantone, tokens, tipografía Inter |
| Referencia skill | `frontend-design-master`: módulos 01-UX, 04-Motion, 05-Accessibility, 11-Calibration |

---

## 3. Contrato de dirección visual (frontend-design-master §11)

```
Audiencia + tarea principal:    Residentes y administradores de condominio; consulta de estado,
                                 gestión de tickets, pagos y comunicación vecinal.
Marca/patrón visual ya presente: Paleta Pantone FE-DS-001 (Metallic Blue / Silver Lake / Chinese White),
                                 Inter, tokens semánticos en @theme.
Design read:                    Portal administrativo con identidad condominial — profesional,
                                 accesible, cálido, no corporativo frío.
Variance / Motion / Density:    V=4 / M=4 / D=6 — panel administrativo con toque residencial;
                                 microinteracciones funcionales, densidad media-alta en admin.
Dos decisiones a preservar:     (1) Paleta Pantone y tokens de FE-DS-001; (2) Estructura de rutas
                                 y lógica de perfiles Admin/Residente.
Dos decisiones a evitar:        (1) Hero sections o scroll narrativo tipo landing; (2) Animaciones
                                 pesadas que distraigan de tareas operativas.
```

**Modo de calibración:** `EVOLVE` — reorganización acotada sobre la estructura existente; no overhaul.

---

## 4. Alcance (MoSCoW)

### 4.1 Must Have

#### M1 — Sidebar con íconos y agrupación lógica
- Íconos SVG/Lucide junto a cada ítem del menú para escaneo visual rápido.
- Agrupación por categoría con separadores o headers de grupo:
  - **Residente:** Inicio · Mi Cuenta (Perfil, Estado de cuenta) · Mi Comunidad (Anuncios, Encuestas, Juntas, Archivos, Áreas comunes) · Mis Registros (Tickets, Vehículos, Mascotas)
  - **Admin:** Inicio · Gestión (Tickets, Residentes, Casas, Finanzas) · Comunidad (Anuncios, Encuestas, Juntas, Archivos) · Registro (Visitas, Vehículos, Mascotas, Almacén)
- Sidebar colapsable a íconos en escritorio (toggle visible).
- Estado activo claro: fondo `bg-white/15`, borde izquierdo `primary-light`, ícono resaltado.

#### M2 — Navegación responsive (móvil)
- En viewport < 768px: sidebar oculto por defecto.
- Botón hamburguesa en header que abre sidebar como drawer overlay con backdrop oscuro.
- Cierre al tocar fuera, al seleccionar ítem, o con botón X.
- Transición suave slide-in desde la izquierda (200-300ms ease-out).
- El contenido principal ocupa 100% del ancho en móvil.

#### M3 — Menú de usuario en header
- Avatar/iniciales del usuario + nombre + indicador de rol (badge "Admin" o "Residente").
- Click/tap abre dropdown con:
  - **Mi Perfil** → `/perfil`
  - **Cambiar contraseña** → `/cambiar-password`
  - **Notificaciones** → scroll al panel o ruta futura
  - Separador
  - **Cerrar sesión** → logout
- Dropdown se cierra al hacer click fuera o al seleccionar opción.
- En móvil: el menú de usuario puede integrarse al drawer o ser dropdown estándar.

#### M4 — Homepage mejorada
- Saludo personalizado: "Buenos días, {nombre}" con hora del día.
- Cards de resumen con íconos descriptivos (tickets, pagos, notificaciones).
- Sección "Accesos rápidos" con las 4-6 acciones más usadas según perfil.
- Los accesos son links estilizados como cards compactas con ícono + label + flecha.

#### M5 — Microinteracciones y dinamismo
- Transiciones CSS en sidebar: hover (scale sutil + bg change), collapse (width con transition 200ms).
- Cards con hover elevado (`shadow-sm` → `shadow-md`, 150ms).
- Botones con feedback: hover, active (scale 0.98), focus-visible ring.
- Loading skeletons en vez de solo texto "Cargando…" para cards del dashboard.
- Toast de notificaciones con entrada/salida animada (slide-in desde arriba, fade-out).

#### M6 — Responsive general
- Todas las páginas de listado: tabla en desktop → cards apiladas en móvil.
- Formularios: 2 columnas en desktop → 1 columna en móvil.
- Padding/margin ajustados: `p-4` en móvil, `p-8` en desktop.
- Texto truncado con ellipsis donde sea necesario en móvil.
- `meta viewport` ya existe; verificar que ningún componente rompa el scroll horizontal.

### 4.2 Should Have

#### S1 — Breadcrumbs contextuales
- Barra bajo el header: `Inicio > Tickets > Nuevo ticket`.
- Generados desde la ruta actual + labels de `appNavigation.ts`.
- Último segmento sin link (texto plano), anteriores como links.

#### S2 — Indicadores de sección activa
- Header que muestra el nombre del módulo actual (ej: "Gestión de Tickets").
- Sidebar con grupo expandido automáticamente cuando se navega a una ruta del grupo.

#### S3 — Login con identidad visual
- Ilustración SVG sutil o patrón geométrico en fondo (fuera del card).
- Nombre del condominio más prominente con tipografía diferenciada.
- Transición fade-in al cargar la página.

### 4.3 Could Have

#### C1 — Sidebar con collapse persistente
- Guardar preferencia de sidebar colapsado/expandido en `localStorage`.

#### C2 — Modo oscuro
- Tokens alternativos en `@theme` con `prefers-color-scheme: dark`.
- Toggle en menú de usuario.

#### C3 — Onboarding tour
- Tooltip guiado para primer login mostrando las secciones principales.

### 4.4 Won't Have (esta iteración)

- Cambios en API/backend.
- Cambios en lógica de autenticación o permisos.
- Rediseño de formularios individuales (solo responsive).
- PWA / offline support.
- Internacionalización.

---

## 5. Instancias en scope

| Target | Impacto |
|--------|---------|
| `Web/src/shared/components/AppShell.tsx` | Header con menú de usuario, breadcrumbs, hamburguesa móvil |
| `Web/src/shared/components/AppSidebar.tsx` | Refactor completo: íconos, grupos, collapse, drawer móvil |
| `Web/src/shared/navigation/appNavigation.ts` | Agregar íconos, grupos, orden; mantener filtro por perfil |
| `Web/src/pages/HomePage.tsx` | Saludo, accesos rápidos, skeleton loading |
| `Web/src/pages/LoginPage.tsx` | Branding visual mejorado |
| `Web/src/index.css` | Animaciones/keyframes base, utilities responsive |
| `Web/src/shared/components/` | Nuevos: `UserMenu.tsx`, `Breadcrumbs.tsx`, `SkeletonCard.tsx`, `MobileDrawer.tsx` |
| Todas las páginas `*Page.tsx` | Ajustes responsive (tablas → cards en móvil) |

---

## 6. Invariantes

| # | Regla | Fuente |
|---|-------|--------|
| INV-1 | No alterar rutas existentes ni agregar rutas nuevas (solo UI) | App.tsx contrato |
| INV-2 | Perfil/rol viene del JWT; no agregar lógica de permisos en UI | specs INV-1, CLAUDE.md |
| INV-3 | Tokens de FE-DS-001 son la paleta; no introducir colores fuera de @theme | FE-DS-001 AC1/AC8 |
| INV-4 | No instalar librerías de componentes UI interactivos (Headless UI, Radix, etc.) sin aprobación; librerías de íconos SVG tree-shakeable se permiten con ADR justificado (ver ADR-UX-001) | CLAUDE.md, skill §R3 |
| INV-5 | Tests existentes deben seguir pasando | Definición de hecho |
| INV-6 | No modificar APIs, servicios, hooks de datos ni lógica de negocio | skill §R4 |

---

## 7. Criterios de aceptación

| # | Criterio | Verificación |
|---|----------|-------------|
| AC1 | Sidebar muestra íconos junto a cada ítem y agrupa por categoría con separadores | Visual: inspección |
| AC2 | Sidebar se colapsa a solo-íconos con un toggle y la transición es suave (≤300ms) | Visual + DevTools |
| AC3 | En viewport < 768px: sidebar oculto, hamburguesa visible, drawer slide-in funcional | Responsive DevTools |
| AC4 | Drawer se cierra al tocar backdrop, seleccionar ítem o pulsar X | Interacción manual |
| AC5 | Header tiene menú de usuario con dropdown: perfil, password, logout, badge de rol | Visual + click |
| AC6 | HomePage muestra saludo con nombre + hora, cards con íconos, accesos rápidos por perfil | Visual con ambos perfiles |
| AC7 | Cards del dashboard tienen loading skeleton mientras cargan | Throttle network en DevTools |
| AC8 | Hover en cards produce elevación sutil; botones tienen feedback hover/active/focus | Interacción |
| AC9 | Todas las tablas de admin se ven correctamente en móvil (cards o scroll horizontal) | Responsive check |
| AC10 | `tsc --noEmit` + `vite build` sin errores | CLI |
| AC11 | Tests existentes pasan; los que validan componentes refactoreados (AppSidebar, AppShell) se actualizan para reflejar nuevas firmas/estructura, manteniendo cobertura equivalente | `npm test` tras actualizar tests |
| AC12 | Contraste WCAG AA mantenido en todos los componentes nuevos/modificados | Contrast checker |
| AC13 | En viewport 768-1024px el sidebar arranca colapsado (solo íconos) y se puede expandir con toggle; el contenido ocupa el espacio restante sin overflow horizontal | Responsive DevTools en 768px, 800px, 1024px |

---

## 8. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Romper layout de páginas existentes al cambiar AppShell/Sidebar | Media | Alto | Cambios incrementales; verificar cada página tras el refactor del shell |
| Sidebar colapsable compite con contenido en pantallas 768-1024px | Media | Medio | Breakpoint intermedio `lg` para auto-collapse; padding dinámico |
| Lucide/icons no disponibles o bundle grande | Baja | Medio | Usar subset mínimo con tree-shaking; alternativa: SVG inline manual |
| Drawer móvil con z-index conflictos (modals, dropdowns) | Media | Medio | Z-index escalonado documentado; testear con modals abiertos |
| Loading skeletons causan layout shift (CLS) | Baja | Bajo | Skeleton con dimensiones fijas matching la card final |

---

## 9. Estimación

| Componente | Esfuerzo |
|-----------|----------|
| Sidebar (íconos + grupos + collapse + drawer) | Alto |
| UserMenu dropdown | Medio |
| Homepage mejorada (saludo + accesos + skeletons) | Medio |
| Responsive tablas/formularios (todas las páginas) | Alto |
| Microinteracciones CSS | Bajo |
| Login branding | Bajo |
| Breadcrumbs (should) | Bajo |
| Testing y ajustes | Medio |
| **Total estimado** | **3-5 días** |
