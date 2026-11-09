# Plataforma — React + TypeScript

## Antes

- Inspeccionar `package.json`, versión React, framework (Vite/Next/Remix), router, estado (Redux, Zustand, Context, React Query), styling y testing.
- Buscar componentes y patrones de la aplicación antes de añadir un UI kit o reemplazar CSS.
- Preferir TypeScript y tipos existentes; separar lógica/visual solo cuando contribuya a mantenimiento.

## Implementación

- Componentes pequeños por responsabilidad, props semánticas y estado local donde proceda.
- No duplicar estado derivado; considerar loading/error/empty/success desde la API real.
- No añadir `useEffect` para computaciones que deben ocurrir durante render.
- Keys estables para listas; cuidar memoización solo donde aporte según medición.
- Formularios: biblioteca existente y validación coherente con backend sin cambiar contratos.
- Accesibilidad: HTML semántico + foco, keyboard, labels y ARIA solamente donde corresponda.
- Layout: móviles con navegación apropiada, tablas empresariales con overflow intencional y buena densidad.
- Motion: CSS o solución existente. `prefers-reduced-motion` y feedback no basado solo en animación.

## Verificaciones

Ejecutar solo scripts definidos en el proyecto (por ejemplo `npm run build`, `pnpm test`, `npm run lint`) y registrar resultados. No asumir que existen.

## Para artefactos aislados

Si se pide `bundle.html`, leer `references/03-web-artifacts.md` y decidir explícitamente si el HTML realmente puede ser autónomo. No publicar mock como integración real.
