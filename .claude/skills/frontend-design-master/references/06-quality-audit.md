# 06 — Auditoría de calidad obligatoria

## Aplicación

Al terminar una modificación de UI, auditar alcance afectado. Escalar intensidad al riesgo: cambios cosméticos admiten checklist breve; flujos críticos requieren más pruebas. Si el usuario pide solo auditoría, NO editar.

## Matriz

| Área | Verificación | Evidencia posible |
|---|---|---|
| Negocio | No se perdió flujo ni campo importante | Casos antes/después |
| UX | Acción principal, errores, vacío y recuperación claros | Flujo/captura |
| Visual | Marca, jerarquía, espaciado y densidad consistentes | Screenshot real si disponible |
| A11y | Teclado, foco, labels, contraste, lector de pantalla | Prueba y herramienta |
| Responsivo | Anchos relevantes, escalado, scroll y desbordamientos | Viewports/capturas |
| Estado | Loading, vacío, error, éxito, permisos y offline | Fixtures/casos |
| Motion | No induce confusión; reduced motion | Preferencias del SO/browser |
| Código | Lint/build/tests; sin imports rotos, sin dead code | Logs de comandos |
| Rendimiento | Cargas adecuadas, render y listas grandes | Profiler si está disponible |
| Seguridad | No se introdujeron secretos, XSS, datos reales en demo | Diff/review |
| Alcance | Solo archivos autorizados, sin cambios BD/servicios | `git diff --stat` |

## Severidad

- **BLOQUEANTE:** funcionalidad primaria inutilizable; exposición de datos; pérdida grave; inaccesible operación esencial.
- **ALTA:** frustración importante, error frecuente sin recuperación, falla importante de teclado o visualización.
- **MEDIA:** inconsistencia molesta, feedback poco claro o problema de estados secundarios.
- **BAJA:** ajuste de espaciado/copy/consistencia cosmética sin impacto relevante.

## Puertas de calidad proporcionales

- **Parche visual menor:** inspección de diff + accesibilidad afectada + build/lint si aplica.
- **Pantalla/flujo nuevo:** casos positivos/negativos + estados + responsive/escala + visual real cuando exista + código.
- **Flujo crítico (cobro, autorización, operaciones masivas):** bloquear aprobación si no se verifica integridad, permisos, cancelación/doble envío, errores y foco/teclado. La validación puede requerir QA humano.
- **Auditoría únicamente:** ningún archivo de producto debe ser modificado.

## Protocolo

1. Asegurar que el diff corresponde solo al alcance.
2. Compilar/lint/probar si el entorno permite comandos y es seguro ejecutarlos.
3. Probar casos representativos, negativos y extremos.
4. Verificar UX/visual/accesibilidad; registrar limitaciones si no existe captura o runtime.
5. Si hay hallazgos bloqueantes o altos, corregir dentro del alcance o informar claramente por qué quedan pendientes.
6. Entregar reporte breve usando `templates/audit-report.md`.

## Estados de prueba permitidos

`PASÓ`, `FALLÓ`, `NO EJECUTADO`, `NO APLICA`. Nunca usar `PASÓ` para una revisión basada solo en lectura de código si el ítem requiere ejecutar la UI.
