---
name: validar-entrega
description: Usar antes de comitear cualquier cambio de código en este repo (AI4Devs Proyecto Final — AgendaYa). Corre la validación completa y revisa que readme.md/prompts.md sigan coherentes con el código antes de pedir confirmación de commit.
---

# Validar entrega (AgendaYa)

Checklist a seguir antes de comitear cualquier cambio de código en esta rama:

1. **`npm run validate`** (lint + typecheck + tests) — debe pasar en limpio.
2. **`npm run build`** — nunca basta con `npm run dev`. Varios bugs reales de este proyecto (flags experimentales de `cacheComponents`, páginas que deberían ser dinámicas y Next.js prerenderizaba como estáticas) solo aparecieron en el build de producción, nunca en modo dev.
3. **Si el cambio toca algo relevante para el curso** (stack, modelo de datos, API, historias de usuario, seguridad, arquitectura): actualiza la sección correspondiente de `readme.md` en el mismo paso, no "después". Revisa en particular que no queden referencias desactualizadas (nombres de variables de entorno, rutas, decisiones ya cambiadas).
4. **Si el cambio salió de un prompt real del usuario** (no una decisión tuya sola): agrégalo a `prompts.md` siguiendo el formato existente — `**Prompt N — <título>:**`, la cita textual si aplica, qué se generó, y un párrafo de *Criterio humano* explicando qué se revisó o decidió manualmente.
5. **Verifica manualmente en el navegador** el flujo que tocaste (no solo que compile): usa el built-in browser, prueba el camino feliz y al menos un caso límite.
6. **Proceso del curso**: rama `feature/entrega-N-rm` o `final-project-rm` (nunca Pull Requests — es rama + Typeform). El Typeform es responsabilidad del usuario, nunca lo completes ni lo menciones como si fuera tu tarea.
7. **Nunca comitees sin que el usuario lo confirme explícitamente en el chat**, aunque la validación haya pasado — pregunta primero.

Este checklist es el mismo que se siguió manualmente (y dos veces se encontraron bugs reales en el paso 2 y desincronizaciones reales en el paso 3) durante la Entrega 2; está aquí para no tener que redescubrirlo en la Entrega Final.
