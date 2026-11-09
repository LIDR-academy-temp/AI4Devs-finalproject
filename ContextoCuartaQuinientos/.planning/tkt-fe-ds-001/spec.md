# FE-DS-001 — Design System: Paleta Pantone y Consistencia Visual

| Campo          | Valor                                     |
|----------------|-------------------------------------------|
| **Ticket**     | FE-DS-001                                 |
| **Dominio**    | Frontend / UX-UI                          |
| **Prioridad**  | Alta                                      |
| **Autor**      | afonseca@nice.com.mx                      |
| **Fecha**      | 2026-10-22                                |
| **Estado**     | spec-ready                                |

---

## 1. Problema

El sitio actual de CuartaQuinientos tiene una apariencia **plana, genérica y sin identidad visual**:

- **Colores inconsistentes**: se usan al menos 12 paletas distintas sin relación entre sí (`slate`, `gray`, `blue`, `indigo`, `green`, `emerald`, `red`, `amber`, `orange`, `yellow`, `sky`, `primary`). Cada página mezcla familias de color arbitrariamente.
- **Sin Design System definido**: no hay tokens centralizados de color, tipografía, espaciado ni radios. Cada componente elige sus propios valores.
- **Paleta `@theme` subutilizada**: solo define `primary-600/700`, `success-600`, `warning-600`, `danger-600` — el 80% de clases de color usan valores de Tailwind por defecto (`slate-*`, `gray-*`, `blue-*`, `indigo-*`) sin pasar por los tokens del tema.
- **Sin jerarquía visual clara**: headers, cards, sidebar, botones y badges carecen de una escala de énfasis coherente.

## 2. Objetivo

Implementar un **Design System basado en la paleta Pantone proporcionada** que unifique colores, tipografía, componentes y estados en toda la SPA, logrando:

- Identidad visual profesional y reconocible.
- Consistencia total: cualquier pantalla nueva se construye con los mismos tokens.
- Accesibilidad: contraste WCAG AA en todas las combinaciones texto/fondo.

## 3. Paleta de referencia (Pantone)

| Nombre            | Hex       | Rol semántico                                    |
|-------------------|-----------|--------------------------------------------------|
| Chinese White     | `#DAE2E6` | `surface` — fondos generales, bg de la app       |
| Metallic Blue     | `#274C77` | `primary-dark` — header, sidebar, headings, CTA  |
| Silver Lake Blue  | `#6096BA` | `primary` — botones primarios, links, hover       |
| Baby Blue Eyes    | `#A3CEF1` | `primary-light` — active states, highlights, tags |
| Philippine Gray   | `#8B8C89` | `neutral` — texto secundario, bordes, iconos      |
| Argent            | `#C6C5C1` | `neutral-light` — disabled, dividers, subtle bg   |

### Colores funcionales (mantener semántica existente, ajustar tono)

| Rol       | Hex       | Uso                          |
|-----------|-----------|------------------------------|
| Success   | `#2E7D52` | Pagos confirmados, badges OK |
| Warning   | `#C48A1A` | Cuotas por vencer, alertas   |
| Danger    | `#C0392B` | Errores, morosos, eliminar   |

## 4. Escala tipográfica

| Elemento         | Tamaño   | Peso     | Color token          |
|------------------|----------|----------|----------------------|
| h1 (página)      | 1.75rem  | 700      | `primary-dark`       |
| h2 (sección)     | 1.375rem | 600      | `primary-dark`       |
| h3 (card title)  | 1.125rem | 600      | `primary`            |
| body             | 0.9375rem| 400      | `neutral-900`        |
| caption / label  | 0.8125rem| 500 caps | `neutral`            |
| small / helper   | 0.75rem  | 400      | `neutral-light`      |

**Font stack**: `'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
(Inter se carga vía CDN o self-hosted; fallback a system-ui).

## 5. Componentes base afectados

### 5.1 AppShell (Header)
- **Antes**: `bg-white border-b`, nombre en `text-primary-700`
- **Después**: `bg-primary-dark` (Metallic Blue), texto blanco, logo/nombre en blanco, botón "Cerrar sesión" en variante ghost blanca.

### 5.2 AppSidebar
- **Antes**: `bg-white border-r`, items en `text-slate-700`, active en `bg-primary-50 text-primary-700`
- **Después**: `bg-primary-dark` (Metallic Blue), items en blanco con opacity, active con `bg-primary/20` y borde izquierdo `primary-light`, hover con `bg-white/10`.

### 5.3 Cards de dashboard / datos
- **Antes**: `bg-white border rounded shadow-sm`, label en `text-slate-500`, value en `text-primary-800`
- **Después**: `bg-white rounded-lg shadow-sm border-neutral-200`, label en `text-neutral uppercase`, value en `text-primary-dark font-semibold`. Hover sutil con `shadow-md` y borde `primary-light`.

### 5.4 Botones
- **Primario**: `bg-primary text-white hover:bg-primary-dark` (Silver Lake → Metallic Blue).
- **Secundario**: `bg-transparent border-primary text-primary hover:bg-primary-light/20`.
- **Ghost**: `text-neutral hover:bg-surface`.
- **Danger**: `bg-danger text-white hover:bg-danger/80`.
- **Disabled**: `bg-neutral-light text-neutral cursor-not-allowed`.

### 5.5 Formularios (inputs, selects)
- Border: `border-neutral-300` → focus: `ring-2 ring-primary-light border-primary`.
- Label: `text-neutral-700 font-medium text-sm`.

### 5.6 Tablas (admin)
- Header: `bg-surface text-primary-dark font-semibold`.
- Filas alternas: `bg-white` / `bg-surface`.
- Bordes: `border-neutral-200`.

### 5.7 Badges / Tags de estado
- Pagado/Activo: `bg-success/10 text-success`.
- Pendiente: `bg-warning/10 text-warning`.
- Vencido/Error: `bg-danger/10 text-danger`.
- Info: `bg-primary-light/20 text-primary-dark`.

### 5.8 Notificaciones (Bell + Dropdown)
- Badge counter: `bg-danger text-white`.
- Panel: `bg-white shadow-xl rounded-lg border-neutral-200`.
- No leída: `bg-primary-light/10` con borde izquierdo `primary`.

### 5.9 Login Page
- Centrado con card: `bg-white rounded-xl shadow-lg` sobre fondo `bg-surface`.
- Logo/Título arriba del form en `text-primary-dark`.
- Botón CTA: botón primario full-width.

## 6. Criterios de aceptación

| #  | Criterio                                                                                      |
|----|-----------------------------------------------------------------------------------------------|
| AC1 | `index.css` define todos los tokens de la paleta en `@theme` — ningún componente usa colores hardcodeados fuera de tokens. |
| AC2 | Header y sidebar usan `primary-dark` (#274C77) como fondo; texto interno en blanco.          |
| AC3 | Todos los botones primarios usan `primary` (#6096BA) con hover a `primary-dark`.              |
| AC4 | Cards de dashboard tienen borde sutil, label en caps `neutral`, value en `primary-dark`.      |
| AC5 | Login page tiene fondo `surface` (#DAE2E6) con card centrada en `bg-white`.                   |
| AC6 | Font-family incluye Inter con fallback system-ui.                                             |
| AC7 | Contraste texto/fondo cumple WCAG AA (≥4.5:1 body, ≥3:1 large text) — verificado con herramienta. |
| AC8 | Cero clases `text-indigo-*`, `bg-indigo-*`, `text-blue-*`, `bg-blue-*` (reemplazadas por tokens). |
| AC9 | Tests existentes pasan sin cambio.                                                            |
| AC10| Cada página nueva generada por otros tickets consume los tokens del DS, no colores ad-hoc.     |

## 7. Fuera de alcance

- Modo oscuro (dark theme) — futuro ticket.
- Iconografía (se mantiene emoji/texto actual).
- Animaciones / transiciones complejas.
- Refactor de lógica de componentes — solo cambios visuales.

## 8. Riesgos

| Riesgo                                   | Mitigación                                              |
|------------------------------------------|---------------------------------------------------------|
| Romper estilos de páginas ya entregadas  | Búsqueda exhaustiva de clases → mapeo de reemplazo      |
| Contraste insuficiente en sidebar        | Validar combinaciones con WebAIM contrast checker        |
| Inter no carga (CDN bloqueado)           | Fallback a system-ui idéntico en `@theme`               |
