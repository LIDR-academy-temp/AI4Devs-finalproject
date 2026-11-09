# 01 — UX Designer: decisiones operativas

## Objetivo

Conseguir que cada persona entienda **qué puede hacer, qué pasó y cuál es el siguiente paso**, con fricción razonable y sin errores evitables.

## Inspección de flujo

1. Perfil del usuario y tarea principal (captura rápida, consulta, aprobación, supervisión, cliente final).
2. Entrada: ¿desde dónde llega y qué contexto conserva?
3. Acción primaria inequívoca; secundarias de menor jerarquía.
4. Visibilidad del estado: cargando, procesando, completado, parcial, fallido, sin conexión.
5. Prevención de errores: formato, valores válidos, deshacer, confirmación de operaciones destructivas.
6. Recuperación: mensaje útil, conserva campos, propone reintento o acción siguiente.
7. Salida: usuario sabe si guardó, descartó o dejó pendientes.

## Decidir página / panel / modal

- **Modal**: confirmación o decisión corta y bloqueante, sin mucha edición ni navegación.
- **Panel lateral**: detalle rápido o edición contextual sin perder la tabla/lista original.
- **Página**: tarea extensa, jerárquica o compartible por URL; flujos con muchos pasos y necesidad de navegación.
- **Inline**: acciones repetidas pequeñas (cantidad, estado, etiqueta) con confirmación accesible.

No forzar diálogos encadenados. Mantener el contexto y foco al abrir/cerrar overlays.

## Formularios

- Labels visibles, ayudas cuando evitan errores, requerido/opcional coherentes.
- Agrupar por significado; orden de tabulación igual al flujo visual.
- Validar al momento apropiado, no saturar con errores antes de interacción.
- Indicar errores específicos junto al campo y resumen si hay varios.
- No borrar respuestas tras un error de servidor; mostrar estado de guardado.
- Acciones destructivas diferenciadas y protegidas.

## Accesibilidad como UX base

- Control accionable por teclado/dispositivos alternativos.
- Foco lógico y visible; rutas claras para cancelar/salir.
- Textos y datos legibles, no solo por color; etiquetas descriptivas.
- Movimiento reducido para efectos opcionales.
- Consultar `05-accessibility.md` para comprobaciones por plataforma.

## Auditoría UX

| Heurística | Pregunta concreta | Evidencia |
|---|---|---|
| Estado del sistema | ¿Sabe que la petición sigue activa? | Loading, tiempo, mensaje |
| Consistencia | ¿Se repite el mismo patrón de acciones? | Comparación de pantallas |
| Control del usuario | ¿Puede deshacer/cancelar? | Prueba del flujo |
| Prevención | ¿Puede cometer errores previsibles? | Casos extremos |
| Reconocimiento | ¿Ve opciones sin memorizarlas? | Navegación/etiquetas |
| Recuperación | ¿El error explica cómo actuar? | Microcopy real |

## Microcopy

- Botones con verbos y objetos concretos: "Guardar cambios" en vez de "Aceptar" cuando corresponda.
- Error útil: "No se pudo guardar la cantidad. Reintenta; tus cambios siguen aquí".
- Vacío: "Aún no hay registros con estos filtros" + acción para limpiar filtros.
- No usar mensajes de éxito si la API aún no confirmó persistencia.

## Salida

Definir flujo actual, problema, solución, variantes, estados, criterio de aceptación y riesgos. No afirmar resultados de investigación con usuarios si solo se hicieron heurísticas.
