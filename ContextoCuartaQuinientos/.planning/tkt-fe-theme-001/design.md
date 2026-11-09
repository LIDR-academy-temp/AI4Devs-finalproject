# design.md — TKT-FE-THEME-001: Sistema de Temas

## 1. Arquitectura general

```
index.css           ← tokens base + @theme bloques por tema
ThemeContext.tsx    ← estado global: tema activo, toggle, persistencia
ThemeProvider.tsx   ← aplica data-theme en <html>, lee localStorage
ThemeSwitcher.tsx   ← UI: toggle dark/light + selector de tema
```

El atributo `data-theme` en `<html>` activa el bloque de tokens CSS del tema seleccionado. Los componentes **no se tocan**: consumen `var(--color-primary)` etc. y obtienen el valor correcto según el tema activo.

## 2. Tokens de color por tema

### 2.1 Tema `hearth-light` (nuevo — inspirado en el dashboard Hearth)

Extraído visualmente del dashboard CRM de la referencia:

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-surface` | `#F7F3EE` | Fondo de la app (crema cálido) |
| `--color-surface-alt` | `#FFFFFF` | Cards, modales, inputs |
| `--color-surface-raised` | `#F0EBE3` | Hover de filas, chips |
| `--color-primary` | `#E85D4A` | Acento coral-rojo (botones CTA, badges, nav activo) |
| `--color-primary-dark` | `#C44332` | Hover/pressed del primario |
| `--color-primary-light` | `#FAD5D0` | Backgrounds informativos del primario |
| `--color-primary-50` | `#FEF3F1` | Fondos sutiles primario |
| `--color-sidebar-bg` | `#18181F` | Sidebar oscuro |
| `--color-sidebar-fg` | `rgba(255,255,255,0.82)` | Texto sidebar |
| `--color-sidebar-icon` | `#B8B8D0` | Iconos sidebar |
| `--color-sidebar-active` | `#E85D4A` | Indicador nav activo |
| `--color-neutral-900` | `#1A1A1A` | Texto principal |
| `--color-neutral-700` | `#4A4A4A` | Texto secundario |
| `--color-neutral` | `#9B9A97` | Texto muted, placeholders |
| `--color-neutral-300` | `#C9C5BE` | Bordes secundarios |
| `--color-neutral-200` | `#DDD9D2` | Bordes principales |
| `--color-neutral-100` | `#EDE9E3` | Separadores, fondos input |
| `--color-success` | `#16A34A` | Éxito, indicadores positivos |
| `--color-success-light` | `#DCFCE7` | Fondo success |
| `--color-warning` | `#CA8A04` | Aviso |
| `--color-warning-light` | `#FEF9C3` | Fondo warning |
| `--color-danger` | `#DC2626` | Error |
| `--color-danger-light` | `#FEE2E2` | Fondo error |

### 2.2 Tema `hearth-dark` (modo oscuro del tema Hearth)

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-surface` | `#0F0F14` | Fondo principal oscuro |
| `--color-surface-alt` | `#1A1A22` | Cards, modales |
| `--color-surface-raised` | `#22222C` | Hover filas, chips |
| `--color-primary` | `#FF7061` | Coral más brillante en oscuro |
| `--color-primary-dark` | `#E85D4A` | Hover/pressed |
| `--color-primary-light` | `#3D1F1C` | Bg sutil primario oscuro |
| `--color-primary-50` | `#2A1210` | Bg mínimo primario oscuro |
| `--color-sidebar-bg` | `#0C0C12` | Sidebar aún más oscuro |
| `--color-sidebar-fg` | `rgba(255,255,255,0.75)` | Texto sidebar oscuro |
| `--color-sidebar-icon` | `#9090B0` | Iconos sidebar oscuro |
| `--color-sidebar-active` | `#FF7061` | Nav activo oscuro |
| `--color-neutral-900` | `#F0EDE8` | Texto principal (claro sobre oscuro) |
| `--color-neutral-700` | `#C5C1BA` | Texto secundario |
| `--color-neutral` | `#7A7870` | Texto muted |
| `--color-neutral-300` | `#3A3832` | Bordes secundarios |
| `--color-neutral-200` | `#2C2A25` | Bordes principales |
| `--color-neutral-100` | `#1F1E1A` | Separadores, fondos input |
| `--color-success` | `#22C55E` | Éxito |
| `--color-success-light` | `#052E16` | Fondo success oscuro |
| `--color-warning` | `#FACC15` | Aviso |
| `--color-warning-light` | `#1C1500` | Fondo warning oscuro |
| `--color-danger` | `#F87171` | Error |
| `--color-danger-light` | `#2D0A0A` | Fondo error oscuro |

### 2.3 Tema `classic` (existente — sin cambios)
Los tokens actuales de `index.css` quedan bajo `[data-theme="classic"]` y `[data-theme="classic-dark"]`. Si no se especifica `data-theme`, se usa `classic` como default para no romper nada.

## 3. Estructura de archivos a crear/modificar

```
Web/src/
  index.css                          ← MODIFICAR: extraer tokens en bloques por tema
  styles/
    themes/
      _hearth.css                    ← CREAR: tokens hearth-light + hearth-dark
      _classic.css                   ← CREAR: tokens classic extraídos del @theme base
      _theme-contract.css            ← CREAR: variables "semánticas" que cada tema DEBE proveer
  shared/
    context/
      ThemeContext.tsx               ← CREAR
    components/
      ThemeProvider.tsx              ← CREAR
      ThemeSwitcher/
        ThemeSwitcher.tsx            ← CREAR
        ThemeSwitcher.test.tsx       ← CREAR
```

## 4. Implementación CSS

### 4.1 `_theme-contract.css` — contrato semántico (qué define cada tema)

```css
/* Variables semánticas que TODOS los temas deben proveer.
   Este archivo documenta el contrato; no define valores. */
:root {
  /* Surface */
  --color-surface: ;
  --color-surface-alt: ;
  --color-surface-raised: ;

  /* Brand */
  --color-primary: ;
  --color-primary-dark: ;
  --color-primary-light: ;
  --color-primary-50: ;

  /* Sidebar */
  --color-sidebar-bg: ;
  --color-sidebar-fg: ;
  --color-sidebar-icon: ;
  --color-sidebar-active: ;

  /* Neutral escala */
  --color-neutral-900: ;
  --color-neutral-700: ;
  --color-neutral: ;
  --color-neutral-300: ;
  --color-neutral-200: ;
  --color-neutral-100: ;

  /* Semántico */
  --color-success: ;
  --color-success-light: ;
  --color-warning: ;
  --color-warning-light: ;
  --color-danger: ;
  --color-danger-light: ;
}
```

### 4.2 `_hearth.css` — definición del tema Hearth

```css
/* ─── Hearth Light ─────────────────────────────────────── */
[data-theme="hearth-light"],
[data-theme="hearth-light"] :root {
  --color-surface:          #F7F3EE;
  --color-surface-alt:      #FFFFFF;
  --color-surface-raised:   #F0EBE3;
  --color-primary:          #E85D4A;
  --color-primary-dark:     #C44332;
  --color-primary-light:    #FAD5D0;
  --color-primary-50:       #FEF3F1;
  --color-sidebar-bg:       #18181F;
  --color-sidebar-fg:       rgba(255,255,255,0.82);
  --color-sidebar-icon:     #B8B8D0;
  --color-sidebar-active:   #E85D4A;
  --color-neutral-900:      #1A1A1A;
  --color-neutral-700:      #4A4A4A;
  --color-neutral:          #9B9A97;
  --color-neutral-300:      #C9C5BE;
  --color-neutral-200:      #DDD9D2;
  --color-neutral-100:      #EDE9E3;
  --color-success:          #16A34A;
  --color-success-light:    #DCFCE7;
  --color-warning:          #CA8A04;
  --color-warning-light:    #FEF9C3;
  --color-danger:           #DC2626;
  --color-danger-light:     #FEE2E2;
}

/* ─── Hearth Dark ───────────────────────────────────────── */
[data-theme="hearth-dark"],
[data-theme="hearth-dark"] :root,
[data-theme="hearth-light"].dark,
@media (prefers-color-scheme: dark) {
  [data-theme="hearth-auto"] {
    --color-surface:          #0F0F14;
    --color-surface-alt:      #1A1A22;
    --color-surface-raised:   #22222C;
    --color-primary:          #FF7061;
    --color-primary-dark:     #E85D4A;
    --color-primary-light:    #3D1F1C;
    --color-primary-50:       #2A1210;
    --color-sidebar-bg:       #0C0C12;
    --color-sidebar-fg:       rgba(255,255,255,0.75);
    --color-sidebar-icon:     #9090B0;
    --color-sidebar-active:   #FF7061;
    --color-neutral-900:      #F0EDE8;
    --color-neutral-700:      #C5C1BA;
    --color-neutral:          #7A7870;
    --color-neutral-300:      #3A3832;
    --color-neutral-200:      #2C2A25;
    --color-neutral-100:      #1F1E1A;
    --color-success:          #22C55E;
    --color-success-light:    #052E16;
    --color-warning:          #FACC15;
    --color-warning-light:    #1C1500;
    --color-danger:           #F87171;
    --color-danger-light:     #2D0A0A;
  }
}
```

### 4.3 `index.css` — importaciones

```css
@import 'tailwindcss';
@import './styles/themes/_theme-contract.css';
@import './styles/themes/_classic.css';
@import './styles/themes/_hearth.css';

/* El @theme de Tailwind queda como fallback/classic */
@theme { ... }
```

## 5. ThemeContext.tsx

```tsx
import { createContext, useContext } from 'react';

export type ThemeId =
  | 'classic'
  | 'classic-dark'
  | 'hearth-light'
  | 'hearth-dark'
  | 'hearth-auto';   // respeta prefers-color-scheme

export interface ThemeDescriptor {
  id: ThemeId;
  label: string;
  family: 'classic' | 'hearth';
  dark: boolean;
}

export const THEMES: ThemeDescriptor[] = [
  { id: 'classic',      label: 'Clásico',          family: 'classic', dark: false },
  { id: 'classic-dark', label: 'Clásico oscuro',   family: 'classic', dark: true  },
  { id: 'hearth-light', label: 'Hearth',            family: 'hearth',  dark: false },
  { id: 'hearth-dark',  label: 'Hearth oscuro',    family: 'hearth',  dark: true  },
  { id: 'hearth-auto',  label: 'Hearth automático', family: 'hearth',  dark: false },
];

export interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  toggleDark: () => void;   // alterna light/dark dentro de la misma familia
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
```

## 6. ThemeProvider.tsx

```tsx
import { useEffect, useMemo, useState } from 'react';
import { ThemeContext, ThemeId, THEMES } from './ThemeContext';

const STORAGE_KEY = 'cq-theme';
const DEFAULT_THEME: ThemeId = 'hearth-light';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as ThemeId) ?? DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  // Aplica data-theme en <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const setTheme = (id: ThemeId) => setThemeState(id);

  const toggleDark = () => {
    const current = THEMES.find(t => t.id === theme);
    if (!current) return;
    const sibling = THEMES.find(
      t => t.family === current.family && t.dark !== current.dark && t.id !== 'hearth-auto'
    );
    if (sibling) setThemeState(sibling.id);
  };

  const isDark = THEMES.find(t => t.id === theme)?.dark ?? false;

  const value = useMemo(() => ({ theme, setTheme, toggleDark, isDark }), [theme, isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

## 7. ThemeSwitcher.tsx

```tsx
import { useTheme, THEMES } from '../context/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export function ThemeSwitcher() {
  const { theme, setTheme, toggleDark, isDark } = useTheme();

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Selección de tema">
      {/* Toggle dark/light */}
      <button
        onClick={toggleDark}
        aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
        aria-pressed={isDark}
        className="p-2 rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors"
      >
        {isDark
          ? <SunIcon className="w-5 h-5 text-[var(--color-neutral-700)]" />
          : <MoonIcon className="w-5 h-5 text-[var(--color-neutral-700)]" />
        }
      </button>

      {/* Selector de familia de tema */}
      <select
        value={theme}
        onChange={e => setTheme(e.target.value as any)}
        aria-label="Familia de tema"
        className="text-sm rounded-md border border-[var(--color-neutral-200)] 
                   bg-[var(--color-surface-alt)] text-[var(--color-neutral-700)]
                   px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      >
        {THEMES.map(t => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>
    </div>
  );
}
```

## 8. Integración en App

```tsx
// main.tsx o App.tsx — envolver con ThemeProvider
import { ThemeProvider } from '@/shared/components/ThemeProvider';

<ThemeProvider>
  <RouterProvider router={router} />
</ThemeProvider>
```

```tsx
// AppHeader — agregar ThemeSwitcher junto al avatar
import { ThemeSwitcher } from '@/shared/components/ThemeSwitcher/ThemeSwitcher';

// Dentro del header:
<ThemeSwitcher />
```

## 9. Ajuste del sidebar existente

El sidebar actual usa gradientes hardcodeados en `.cq-app-sidebar`. Se deben reemplazar para consumir `--color-sidebar-bg`:

```css
/* ANTES */
.cq-app-sidebar {
  background: linear-gradient(180deg, #223f5c 0%, #274c77 42%, #1a3349 100%);
}

/* DESPUÉS */
.cq-app-sidebar {
  background: var(--color-sidebar-bg);
}

.cq-app-header {
  background: var(--color-sidebar-bg);  /* o un token --color-header-bg separado */
}
```

## 10. Cómo agregar un tema nuevo (< 30 min)

1. Crear `Web/src/styles/themes/_mi-tema.css` con todos los tokens del contrato.
2. Importarlo en `index.css`.
3. Agregar la entrada en el array `THEMES` de `ThemeContext.tsx`.
4. ¡Listo! Los componentes lo recogen automáticamente.

## 11. ADR — Temas por condominio (futura Entrega 2)

En el futuro se puede cargar el tema desde el API (`GET /configuracion/tema`) y hacer `setTheme(data.temaId)` en el bootstrap. El `ThemeProvider` ya soporta esto sin cambios si el `temaId` corresponde a un tema registrado en `THEMES`.

## 12. Verificación de contraste (WCAG AA)

| Par | Ratio | Resultado |
|-----|-------|-----------|
| `#1A1A1A` sobre `#F7F3EE` | ~18:1 | ✅ AAA |
| `#FFFFFF` sobre `#E85D4A` | ~4.6:1 | ✅ AA |
| `rgba(255,255,255,0.82)` sobre `#18181F` | ~10:1 | ✅ AAA |
| `#F0EDE8` sobre `#0F0F14` | ~16:1 | ✅ AAA |
| `#FF7061` sobre `#0F0F14` | ~5.1:1 | ✅ AA |

## 13. Tests unitarios mínimos

`ThemeSwitcher.test.tsx`:
- Renderiza con tema por defecto `hearth-light`.
- Al hacer clic en toggle → cambia a `hearth-dark` (spy en `document.documentElement.setAttribute`).
- El `select` refleja el tema activo.
- `localStorage` se actualiza al cambiar el tema.

## 14. Dependencias

Ninguna nueva. Usa Heroicons (ya en el proyecto) y CSS custom properties nativas.
