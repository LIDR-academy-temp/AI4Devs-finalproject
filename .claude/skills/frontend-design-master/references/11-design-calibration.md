# 11 — Calibración visual: Taste adaptado sin imponer estética

Este módulo traduce criterios de dirección visual a **decisiones comprobables**. No ejecuta la Taste Skill original ni presupone herramientas de captura.

## Controles orientativos (1 a 10)

| Control | 1–3 | 4–6 | 7–10 |
|---|---|---|---|
| `DESIGN_VARIANCE` | composición convencional, estable | ritmo editorial equilibrado | exploración asimétrica cuando hay libertad de marca |
| `MOTION_INTENSITY` | prácticamente sin movimientos | microinteracciones por estados | movimiento expresivo SOLO para productos que lo justifican |
| `VISUAL_DENSITY` | narrativa espaciosa | formularios y dashboards intermedios | captura y tablas operativas de alta densidad |

**No son valores de librería ni constantes de CSS**: son parámetros para orientar decisiones. No exponerlos al usuario salvo que lo solicite o resulte útil para alinear expectativas.

## Inferir el perfil desde el problema

| Contexto | Variance | Motion | Density | Nota |
|---|---:|---:|---:|---|
| ERP, logística, inventario, atención a clientes | 2 | 2 | 8 | Priorizar datos, teclado, rapidez y errores recuperables |
| Panel administrativo general | 3 | 3 | 7 | Jerarquía por tareas y filtros |
| Ecommerce y app de cliente | 5 | 4 | 5 | Marca, descubrimiento, conversión responsable |
| Landing editorial / marketing | 7 | 5 | 3 | Identidad visual con estructura flexible |
| Prototipo de producto sin branding | 4 | 3 | 5 | Decisiones reversibles, sin identidades inventadas |

Estos puntos de partida **no sobrescriben** tokens, requisitos de accesibilidad, restricciones corporativas o preferencias expresas. Se ajustan a los datos reales del proyecto y no convierten la interfaz en una landing por defecto.

## Contrato de dirección (antes de cambios visuales amplios)

Completar en 5 líneas, sin inventar research con usuarios:

```text
Audiencia + tarea principal:
Marca/patrón visual ya presente:
Design read (una frase con razón funcional):
Variance / Motion / Density (1-10) + porqué:
Dos decisiones a preservar y dos a evitar:
```

## Procedimiento de rediseño

1. Elegir `PRESERVE` (retoques), `EVOLVE` (reorganización acotada) o `OVERHAUL` (solo con alcance/autorización explícitos).
2. Inventariar rutas, nombres de campos, accesos, estados, mensajes, atajos y componentes que **no pueden desaparecer**.
3. Definir propuesta en wireframe lógico primero: áreas, jerarquía, densidad y acciones.
4. Traducir a tokens existentes; si no existen, proponer tokens mínimos en `08-design-system-tokens.md`.
5. Probar con contenido realista (datos ficticios si son sensibles): texto largo, 0, 1 y 1000 filas; estados de carga/error; permisos.
6. Comparar el resultado con el contrato, y corregir desalineaciones antes de agregar decoración.

## Reglas anti-output genérico (condicionales, no dogmas)

- Evitar hero/gradientes/tarjetas repetidas cuando no sirven a tareas administrativas.
- Evitar rehacer toda la identidad por cambiar una tabla o botón.
- No privilegiar simetría o asimetría automáticamente: elegir según la tarea.
- No forzar fuentes externas, efectos pesados, scroll narrativo ni animaciones que ralenticen el trabajo.
- No presentar una captura ficticia como una revisión visual real.

**Salida mínima:** contrato de diseño aplicado, decisiones visibles, pantallas/estados evaluados y observaciones de QA. Si no hubo render, señalarlo.
