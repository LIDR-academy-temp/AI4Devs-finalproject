# 12 — Auditoría UX por tareas, evidencias y riesgo

Complementa `01-ux-design.md` y `05-accessibility.md` para auditorías profundas; **no se carga en cambios cosméticos pequeños**.

## Contexto que determina las prioridades

- Rol, experiencia y frecuencia de uso: operador experto con teclado vs. persona ocasional con móvil.
- Tarea principal y coste de error: captura, cobro, envío, edición masiva, consulta, aprobación.
- Restricciones: tiempo, dispositivos, conectividad, permisos, carga de datos, idiomas y accesibilidad.
- Medios disponibles para validar: código, demo ejecutable, navegador, capturas, test con usuarios.

## Recorrido por estados y escenarios

Para cada flujo crítico, trazar:

1. **Entrada:** navegación correcta, contexto previo, valores por defecto y permisos.
2. **Comprensión:** pregunta que resuelve la pantalla, acción primaria y datos suficientes para actuar.
3. **Acción:** teclado/tacto/ratón, validación, latencia, estados concurrentes, prevención de duplicados.
4. **Resultado:** confirmación del servidor, persistencia, historial, undo/cancelar cuando aplica.
5. **Recuperación:** errores reales y comunicados, pérdida de red, permisos insuficientes, conflicto de cambios.
6. **Salida:** navegación sin pérdida accidental de datos, conservación de filtros/contexto.

Escenarios mínimos por importancia: éxito, vacío, carga, error, sin permisos, texto largo, muchos resultados, zoom/texto escalado, teclado solo. Añadir estados como lectura de código de barras, offline o multiusuario únicamente cuando correspondan.

## Heurísticas accionables

- **Visibilidad:** mostrar si algo se está procesando y si terminó (no confundir click con persistencia).
- **Lenguaje:** objetos y acciones del dominio; no esconder términos técnicos en mensajes al cliente.
- **Control y reversibilidad:** deshacer cuando sea realista; confirmar destructivas con contexto suficiente.
- **Consistencia:** misma acción = mismo lugar, icono, microcopy y atajo en pantallas comparables.
- **Prevención:** constraints e instrucciones antes del error; no capturar valores inválidos silenciosamente.
- **Carga cognitiva:** minimizar decisiones y memoria a corto plazo; no ocultar filtros o acciones críticas.
- **Eficiencia:** atajos seguros para operadores expertos, sin perjudicar descubrimiento para novatos.
- **Accesibilidad:** nombre, foco, operación, tamaño y feedback para tecnologías asistivas.

## Hallazgos: formato obligatorio

```text
[SEVERIDAD] Hallazgo verificable (no gusto subjetivo)
Dónde: pantalla, archivo/línea o acción reproducible
Impacto: usuario afectado y consecuencias
Evidencia: captura real / reproducción / código / hipótesis sin probar
Corrección: recomendación específica y acotada
Criterio de aceptación: acción observable y resultado esperado
Referencia: heurística o WCAG SC exacto cuando corresponda
```

- **BLOQUEANTE** si impide completar tarea esencial, pierde datos o expone información sensible.
- **ALTA** si compromete significativamente la tasa de éxito, accesibilidad o recuperación.
- **MEDIA** si degrada consistencia, claridad o velocidad de uso.
- **BAJA** si es mejora editorial/visual sin impacto material.

## Evidencia honesta

- Inspección del código ≠ evaluación visual.
- Test automatizado de accesibilidad ≠ conformidad WCAG certificada.
- Heurística ≠ investigación de usuarios ni datos de conversión.
- Sin entorno ejecutable, producir hipótesis priorizadas + protocolo de comprobación.
