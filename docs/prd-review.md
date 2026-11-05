# Revisión adversarial del PRD

> Revisión de `docs/prd.md` en su primera versión (commit `5ae3990`), hecha con IA en el rol de revisor de producto adversarial (2026-11-04). Los hallazgos se priorizan por riesgo. La columna "Resolución" indica cómo quedó cada uno tras las correcciones (commit `d3cb5ae`).

**Prompt usado:** "Cambia de sombrero: sé un revisor de producto adversarial. Critica el PRD: ¿qué requerimientos están ambiguos o no se pueden probar? ¿Qué suposición, si resulta ser falsa, se trae abajo todo el MVP? ¿En dónde hay desviación del alcance escondida? ¿Qué métrica no hay forma de medir bien en la vida real? Priorízalo todo por nivel de riesgo."

**Lección:** esta revisión debió hacerse justo después del PRD y antes de la arquitectura; varios hallazgos obligaron a ajustar también historias, tickets y arquitectura.

## Crítico: puede tumbar el MVP

| Id | Hallazgo | Resolución |
| --- | --- | --- |
| C1 | No hay filtro por rol: una sincronización trae ofertas de contabilidad, ventas, etc., que pasan los filtros como `unknown`, llegan a la IA y rompen el presupuesto. | Filtro de roles por palabras clave en RF-20 y tope de ofertas por sincronización (RF-04b). |
| C2 | OBJ-1 no se puede medir: no se registra ninguna decisión, archivar era should-have y la revisión obligatoria de campos añade fricción. La línea base de 15 min es un supuesto. | Decisión `apply`/`skip` con `first_viewed_at` y `decided_at` (RF-07 must-have, RNF-14); revisión de campos opcional (RF-03); línea base medida con 5 ofertas antes del desarrollo. |
| C3 | El dolor "encontrar ofertas" quedaba casi sin resolver: solo una empresa importable. | El usuario confirmó que la recolección automática es tan importante como pegar. Se agregan adaptadores de Ashby y Lever y un agregador por búsqueda sujeto a spike (RF-04, RF-04a); nueva métrica OBJ-5. Después de dividir las historias, Lever pasó a should-have. |
| C4 | 28 h sin margen y sin contar la curva de aprendizaje de AdonisJS v7. | Tope aceptado de 36 h; orden de construcción y de recorte explícitos en el PRD (sección 11). |

## Alto: ambiguo o no comprobable

| Id | Hallazgo | Resolución |
| --- | --- | --- |
| A1 | Coincidencia de ubicación con texto libre no definida; remoto fuera de EE. UU. | Reglas de ubicación en la sección 6.1 del PRD. |
| A2 | Sin catálogo de seniority; niveles propios de big tech. | Enumeración cerrada y tabla de mapeo versionada (sección 6.1). |
| A3 | Comparación de salario (mínimo o máximo del rango, periodos). | Máximo del rango anualizado contra el mínimo del usuario (sección 6.1). |
| A4 | RF-28 usaba la preferencia de modalidad dentro del puntaje, pero la caché no la incluía. | Ajuste determinista fuera de la IA y de su caché (RF-28). |
| A5 | "Nunca se inventan" es absoluto e incomprobable; no había evals de extracción. | Golden set de extracción con meta ≥ 90 % y 0 salarios inventados (RF-02, RNF-08). |
| A6 | La evidencia citada podía ser inventada. | Verificación literal de cada fragmento (RF-24a). |
| A7 | Umbrales de las etiquetas no definidos. | Umbrales fijos en RF-24. |
| A8 | No estaba claro si un currículum nuevo recalcula todo. | Recalcular solo a pedido, mostrando cuántas ofertas (RF-14). |

## Medio: alcance escondido

| Id | Hallazgo | Resolución |
| --- | --- | --- |
| M1 | El Kanban con arrastre costaba ~2 h. | Selector de estado accesible (RF-33, must); arrastre como could-have (RF-33a). |
| M2 | Demasiada ingeniería para un usuario: caché de prompts, limitador de intentos, conversión de PDF. | Caché de prompts y limitador: could-have. PDF: should-have (RF-11); Markdown es la entrada del MVP. |
| M3 | "Sin actividad" no definido en RF-43. | Actividad = cambio de estado, nota o correo. |

## Medio: métricas no medibles

| Métrica | Hallazgo | Resolución |
| --- | --- | --- |
| OBJ-2 | 10 ofertas, mismo conjunto para ajustar y medir, mismo etiquetador. | ≥ 20 ofertas separadas en ajuste y prueba, etiquetadas antes de ver la IA, tolerancia ±1 nivel. |
| OBJ-3 | 100 % registradas: el denominador está fuera del sistema. | 0 seguimientos olvidados en 4 semanas, revisados contra el correo. |
| RNF-06 | < 20 s no medible en CI. | Percentil 90 < 30 s en logs de producción. |
| RNF-13 | "WCAG como referencia" no verificable. | `axe-core` en la prueba E2E sin violaciones `serious` o `critical`. |
| RNF-10 | "Dominio" sin delimitar. | Carpetas listadas en RNF-10. |

## Bajo

| Id | Hallazgo | Resolución |
| --- | --- | --- |
| B1 | Quien valida es quien construye; parte de la medición cae después de la entrega. | Sección 2.1 "Limitaciones de la validación" en el PRD. |
| B2 | Salario anual no sirve para contratos por hora. | Anualización en las reglas de salario (sección 6.1). |
