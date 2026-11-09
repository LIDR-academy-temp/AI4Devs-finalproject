# FE-DS-001 — Design: Implementación del Design System Pantone

| Campo          | Valor                                     |
|----------------|-------------------------------------------|
| **Ticket**     | FE-DS-001                                 |
| **Fase**       | design-ready                              |
| **Autor**      | afonseca@nice.com.mx                      |
| **Fecha**      | 2026-10-22                                |

---

## 1. Decisiones de diseño

### ADR-DS-001: Tokens centralizados en `@theme` de Tailwind v4
Los tokens de color, tipografía y radio se definen **únicamente** en `Web/src/index.css` dentro del bloque `@theme`. Ningún componente usa hex literals ni clases de color de Tailwind por defecto (slate, gray, blue, indigo). Todo pasa por los tokens semánticos.

### ADR-DS-002: Mapeo semántico sobre la paleta Pantone
En lugar de nombrar tokens por color (`--color-blue-600`), se usan nombres funcionales (`--color-primary`, `--color-surface`). Esto desacopla el diseño del valor hex y facilita un futuro dark mode.

### ADR-DS-003: Inter como tipografía primaria
Se carga `Inter` vía `<link>` en `index.html` (Google Fonts) con peso 400, 500, 600, 700. Fallback: `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`.

---

## 2. Tokens — `Web/src/index.css`

```css
@import 'tailwindcss';

@theme {
  /* ── Paleta Pantone ── */
  --color-surface:          #DAE2E6;
  --color-surface-alt:      #F0F4F6;

  --color-primary-dark:     #274C77;
  --color-primary:          #6096BA;
  --color-primary-light:    #A3CEF1;
  --color-primary-50:       #EBF3FA;

  --color-neutral-900:      #1E1E1E;
  --color-neutral-700:      #4A4A4A;
  --color-neutral:          #8B8C89;
  --color-neutral-300:      #B0B0AE;
  --color-neutral-200:      #C6C5C1;
  --color-neutral-100:      #E8E7E4;

  /* ── Funcionales ── */
  --color-success:          #2E7D52;
  --color-success-light:    #D4EDDA;
  --color-warning:          #C48A1A;
  --color-warning-light:    #FFF3CD;
  --color-danger:           #C0392B;
  --color-danger-light:     #F8D7DA;

  /* ── Tipografía ── */
  --font-sans: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

  /* ── Radios ── */
  --radius-sm:  0.375rem;
  --radius-md:  0.5rem;
  --radius-lg:  0.75rem;
  --radius-xl:  1rem;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--font-sans);
  background-color: var(--color-surface);
  color: var(--color-neutral-900);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Carga de Inter en `Web/index.html`
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## 3. Mapeo de clases: antes → después

### 3.1 Colores de fondo

| Antes                          | Después                    | Uso                            |
|--------------------------------|----------------------------|--------------------------------|
| `bg-slate-50`, `bg-gray-50`   | `bg-surface`               | Fondo general de la app        |
| `bg-white`                     | `bg-white` (sin cambio)    | Cards, modals, dropdowns       |
| `bg-gray-100`, `bg-slate-100` | `bg-surface-alt`           | Fondo alternativo, table rows  |
| `bg-gray-200`, `bg-slate-200` | `bg-neutral-100`           | Hover subtle                   |
| `bg-primary-600`              | `bg-primary`               | Botones primarios              |
| `bg-primary-700`              | `bg-primary-dark`          | Header, sidebar, hover buttons |
| `bg-primary-50`, `bg-primary-100` | `bg-primary-50`        | Active sidebar item bg         |
| `bg-blue-500/600/700`         | `bg-primary` / `bg-primary-dark` | Botones, links             |
| `bg-indigo-600/700`           | `bg-primary` / `bg-primary-dark` | Botones, focus rings       |
| `bg-red-50`, `bg-red-100`     | `bg-danger-light`          | Alerta de cuotas vencidas      |
| `bg-red-600`                  | `bg-danger`                | Badge notificación, btn danger |
| `bg-green-100/200/600/700`    | `bg-success` / `bg-success-light` | Badges pagado          |
| `bg-amber-100`, `bg-yellow-100`, `bg-orange-100` | `bg-warning-light` | Badges pendiente     |
| `bg-sky-100`, `bg-emerald-100`| `bg-primary-50` / `bg-success-light` | Tags info          |

### 3.2 Colores de texto

| Antes                                     | Después                | Uso                        |
|-------------------------------------------|------------------------|----------------------------|
| `text-slate-900`, `text-gray-900`         | `text-neutral-900`     | Texto principal            |
| `text-slate-700`, `text-gray-700`         | `text-neutral-700`     | Texto secundario fuerte    |
| `text-slate-600`, `text-gray-600`         | `text-neutral`         | Texto secundario           |
| `text-slate-500`, `text-gray-500`         | `text-neutral`         | Labels, captions           |
| `text-slate-400`, `text-gray-400`         | `text-neutral-300`     | Placeholders, disabled     |
| `text-primary-700/800`, `text-indigo-600` | `text-primary-dark`    | Headings, emphasis         |
| `text-primary-600`, `text-blue-600`       | `text-primary`         | Links, valores de card     |
| `text-red-500/600/700/800/900`            | `text-danger`          | Errores, alertas           |
| `text-green-700/800`, `text-emerald-800/900` | `text-success`     | Confirmaciones             |
| `text-amber-700/800/900`, `text-yellow-600/800`, `text-orange-700` | `text-warning` | Warnings     |
| `text-sky-800`                            | `text-primary`         | Info tags                  |
| `text-danger-500/600`                     | `text-danger`          | Errores (ya casi correcto) |
| `text-success-500/700`                    | `text-success`         | OK (ya casi correcto)      |

### 3.3 Bordes

| Antes                                 | Después              | Uso                   |
|---------------------------------------|----------------------|-----------------------|
| `border-slate-200/300`, `border-gray-200/300` | `border-neutral-200` | Cards, inputs, dividers |
| `border-slate-100`, `border-gray-100` | `border-neutral-100` | Bordes sutiles        |
| `border-red-200`                      | `border-danger`      | Alerta cuotas         |
| `border-indigo-600`                   | `border-primary`     | Tab activa            |

### 3.4 Rings / Focus

| Antes                              | Después                       |
|------------------------------------|-------------------------------|
| `ring-blue-500`, `ring-indigo-400/500` | `ring-primary-light`      |
| `focus:ring-*`                     | `focus:ring-2 ring-primary-light` |

---

## 4. Cambios por archivo

### 4.1 `Web/index.html`
- Agregar `<link>` para Google Fonts Inter.

### 4.2 `Web/src/index.css`
- Reemplazar bloque `@theme` completo con los tokens de §2.
- Actualizar estilos de `body`.

### 4.3 `Web/src/App.css`
- Eliminar variables CSS legacy (`--accent`, `--accent-bg`, etc.) si no se usan.
- Limpiar estilos hero del template Vite si ya no aplican.

### 4.4 `Web/src/shared/components/AppShell.tsx`
```diff
- <header className="border-b bg-white">
+ <header className="bg-primary-dark shadow-sm">

- <div className="... px-4 py-3 md:px-6">
+ <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">

- <Link ... className="... text-primary-700 ...">
+ <Link ... className="cursor-pointer text-lg font-bold text-white hover:text-primary-light">

- <span className="... text-slate-600 ...">
+ <span className="hidden text-sm text-white/80 sm:inline">

- <button ... className="... border-slate-300 ... text-slate-700 hover:bg-slate-100">
+ <button ... className="cursor-pointer rounded-md border border-white/30 px-3 py-1.5 text-sm text-white hover:bg-white/10">
```

### 4.5 `Web/src/shared/components/AppSidebar.tsx`
```diff
- <nav ... className="... border-r border-slate-200 bg-white ...">
+ <nav ... className="flex w-56 shrink-0 flex-col gap-1 bg-primary-dark p-3">

- className="cursor-not-allowed ... text-slate-400"
+ className="cursor-not-allowed rounded-md px-3 py-2 text-sm text-white/30"

  active:
- 'bg-primary-50 font-medium text-primary-700'
+ 'bg-white/15 font-medium text-white border-l-3 border-primary-light'

  inactive:
- 'text-slate-700 hover:bg-slate-50'
+ 'text-white/70 hover:bg-white/10 hover:text-white'
```

### 4.6 `Web/src/pages/LoginPage.tsx`
```diff
- <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-8">
+ <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-8 bg-surface">

  Envolver form en card:
+ <div className="rounded-xl bg-white p-8 shadow-lg">

- <h1 className="text-xl font-semibold text-primary-700">
+ <h1 className="text-2xl font-bold text-primary-dark">

- className="rounded border border-slate-300 px-3 py-2"
+ className="rounded-md border border-neutral-200 px-3 py-2 focus:ring-2 focus:ring-primary-light focus:border-primary outline-none"

- className="... bg-primary-600 ... hover:bg-primary-700 ..."
+ className="... bg-primary ... hover:bg-primary-dark ... rounded-md"
```

### 4.7 Páginas admin (patrón repetido)
Todas las páginas admin (`AdminUsuariosPage`, `AdminTicketsPage`, `FinanzasAdminPage`, etc.):
- `text-primary-700/800` → `text-primary-dark`
- `bg-slate-50` → `bg-surface`
- `border-slate-200/300` → `border-neutral-200`
- `text-slate-500/600/700` → `text-neutral` / `text-neutral-700`
- `bg-indigo-600/700` → `bg-primary` / `bg-primary-dark`
- `ring-indigo-*` → `ring-primary-light`
- Tabs activas: `border-indigo-600 text-indigo-600` → `border-primary text-primary-dark`
- Botones en tabla: `bg-blue-*` → `bg-primary`

### 4.8 Dashboard cards
```diff
- <div className="rounded border bg-white p-4 shadow-sm">
+ <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">

- <p className="text-xs uppercase text-slate-500">
+ <p className="text-xs font-medium uppercase tracking-wide text-neutral">

- <p className="... text-primary-800">
+ <p className="... text-primary-dark font-semibold">
```

### 4.9 NotificationBell
```diff
- className="... text-slate-700 hover:bg-slate-100"
+ className="... text-white hover:bg-white/10"

- <p className="... text-primary-800">Notificaciones</p>
+ <p className="... text-primary-dark font-semibold">Notificaciones</p>
```

### 4.10 Badges de estado (`EstadoTicketBadge.tsx` y patrones similares)
Normalizar a tokens funcionales: `bg-success-light text-success`, `bg-warning-light text-warning`, `bg-danger-light text-danger`, `bg-primary-50 text-primary-dark`.

---

## 5. Contraste WCAG AA — Verificación

| Combinación                              | Ratio   | Cumple AA |
|------------------------------------------|---------|-----------|
| `#274C77` (primary-dark) sobre `#FFFFFF`  | 8.3:1   | ✅        |
| `#FFFFFF` sobre `#274C77` (sidebar)       | 8.3:1   | ✅        |
| `#6096BA` (primary) sobre `#FFFFFF`       | 3.4:1   | ✅ large  |
| `#274C77` sobre `#DAE2E6` (surface)       | 5.7:1   | ✅        |
| `#8B8C89` (neutral) sobre `#FFFFFF`       | 3.5:1   | ✅ large  |
| `#4A4A4A` (neutral-700) sobre `#FFFFFF`   | 7.7:1   | ✅        |
| `#C0392B` (danger) sobre `#FFFFFF`        | 4.6:1   | ✅        |
| `#2E7D52` (success) sobre `#FFFFFF`       | 4.9:1   | ✅        |
| `#C48A1A` (warning) sobre `#FFFFFF`       | 3.3:1   | ✅ large  |

> **Nota**: `primary` (#6096BA) y `neutral` (#8B8C89) cumplen solo para texto grande (≥18px o 14px bold). Para texto body pequeño se usa `primary-dark` o `neutral-700`.

---

## 6. Orden de ejecución

| Paso | Archivo(s)                          | Descripción                              |
|------|-------------------------------------|------------------------------------------|
| 1    | `index.html`                        | Agregar link Google Fonts Inter          |
| 2    | `index.css`                         | Reemplazar `@theme` con tokens completos |
| 3    | `App.css`                           | Limpiar legacy (hero, counter)           |
| 4    | `AppShell.tsx`                      | Header dark                              |
| 5    | `AppSidebar.tsx`                    | Sidebar dark                             |
| 6    | `LoginPage.tsx`                     | Card sobre surface                       |
| 7    | Dashboard cards                     | Tokens en ResumenAdmin/ResidenteCards    |
| 8    | `NotificationBell.tsx` + Dropdown   | Adaptar a header dark                    |
| 9    | Admin pages (batch)                 | Search & replace por mapeo §3            |
| 10   | Resident pages (batch)              | Search & replace por mapeo §3            |
| 11   | Badges + estados                    | Unificar a tokens funcionales            |
| 12   | Verificación visual + tests         | Confirmar tests verdes, revisar UI       |

---

## 7. Riesgo técnico: clases `primary-*` existentes

El `@theme` actual define `--color-primary-600` y `--color-primary-700`. Al redefinir el namespace `primary`, las clases `text-primary-700` etc. **dejarán de mapear al azul Tailwind original** y tomarán el nuevo valor. Esto es **deseable** — es exactamente la migración que buscamos. Las clases `primary-*` numéricas (`primary-50`, `primary-600`, `primary-700`) se reemplazan por las semánticas (`primary`, `primary-dark`, `primary-light`, `primary-50`).

---

## 8. Archivos NO modificados

- Lógica de hooks (`use*.ts`) — sin cambios.
- API clients (`apiClient.ts`, `apolloClient.ts`) — sin cambios.
- Schemas de validación (`*Schema.ts`) — sin cambios.
- Tests — se espera que pasen sin cambio (solo cambian clases CSS, no comportamiento).
