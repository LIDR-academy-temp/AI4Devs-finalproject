# Agregar un tema nuevo (< 30 min)

1. Crear `Web/src/styles/themes/_mi-tema.css` con todos los tokens del contrato (`_theme-contract.css`).
2. Importarlo en `Web/src/index.css` después de `_theme-contract.css`.
3. Agregar la entrada en `THEMES` de `Web/src/features/theme/ThemeContext.tsx`.
4. Los componentes consumen `var(--color-*)` / clases Tailwind (`bg-surface`, `text-primary`, …) sin cambios.

Tokens obligatorios: superficies, primarios, sidebar/header, escala neutral, semánticos (success/warning/danger) y sombras si el tema las redefine.
