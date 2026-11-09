# spec.md — TKT-FE-THEME-001: Sistema de Temas Intercambiables (Hearth + Modo Oscuro)

## 1. Contexto

El diseño actual de CuartaQuinientos usa una paleta azul-Pantone (navy/steel). Se solicita migrar hacia un sistema de temas CSS dinámico, inspirado en el dashboard CRM "Hearth" (fondo crema cálido, sidebar oscuro, acento coral-rojo), conservando la capacidad de:

- Cambiar de tema completo con una sola variable o clase en `<html>`.
- Soportar modo oscuro automático (prefers-color-scheme) y manual.
- Agregar temas futuros sin tocar componentes.

No se elimina la paleta actual; se convierte en el tema `"classic"` y coexiste con `"hearth"`.

## 2. Historias de usuario

| ID | Actor | Necesita | Para |
|----|-------|----------|------|
| TH-01 | Administrador | Ver la app en el tema cálido Hearth | Que la interfaz sea más amigable y moderna |
| TH-02 | Administrador | Activar modo oscuro | Trabajar de noche sin fatiga visual |
| TH-03 | Desarrollador | Cambiar de tema sin editar componentes | Mantener bajo costo de personalización |
| TH-04 | Desarrollador | Agregar un nuevo tema en < 30 min | Soportar branding por condominio en el futuro |

## 3. Alcance

### Incluye
- Definición de tokens CSS para los temas `hearth-light` y `hearth-dark`.
- El tema `classic` (existente) queda como opción sin romper nada.
- `ThemeProvider` React con persistencia en `localStorage`.
- `ThemeSwitcher` component (toggle Light / Dark + selector de tema).
- Actualización de `index.css` para usar arquitectura multi-tema.
- Documentación de cómo agregar un tema nuevo.

### No incluye
- Rediseño de componentes individuales (solo se les ajustan las variables).
- Temas por condominio desde backend (se deja puerta abierta en ADR).
- Cambios en el API o la BD.

## 4. Criterios de aceptación

- [ ] AC-01: Seleccionar "Hearth Light" cambia el fondo a `#F7F3EE`, sidebar a `#18181F` y acento a `#E85D4A` sin reload.
- [ ] AC-02: Seleccionar "Modo Oscuro" cambia a fondo `#0F0F14` y texto `#F0EDE8` sin reload.
- [ ] AC-03: La preferencia del usuario persiste al refrescar (localStorage).
- [ ] AC-04: `prefers-color-scheme: dark` activa el modo oscuro automáticamente si no hay preferencia guardada.
- [ ] AC-05: Todos los componentes existentes renderizan sin CSS roto al cambiar de tema (smoke test visual).
- [ ] AC-06: El contraste texto/fondo cumple WCAG AA (≥ 4.5:1) en los tres temas.
- [ ] AC-07: El `ThemeSwitcher` es accesible por teclado y tiene rol `button`/`listbox` correcto.

## 5. Definición de hecho

AC-01 a AC-07 verificados, sin errores de build (`npm run build` limpio), sin tests rotos en `npm test`.

## 6. Notas y restricciones

- Stack: React 18 + TypeScript + Vite + Tailwind CSS v4 (CSS `@theme`).
- Tailwind v4 usa CSS variables nativas; los tokens se definen en `@theme {}` y se referencian como `var(--color-*)`.
- La arquitectura de temas se implementa con `data-theme` en `<html>` y bloques `@layer` o selectores `[data-theme="hearth-light"]`.
- No usar `next-themes` ni librerías externas; sólo React context + CSS custom properties.
