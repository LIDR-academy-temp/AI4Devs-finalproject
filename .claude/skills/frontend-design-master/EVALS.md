# Evaluación manual de Frontend Design Master en agentes reales

Estas pruebas de comportamiento **no han sido ejecutadas contra Cursor ni Claude Code en este paquete**. Los tests Python solo validan formato, archivos y scripts. Ejecuta estos casos por separado en los agentes para evaluar cómo actúan y iterar la Skill.

## Procedimiento

1. Instala la Skill en un proyecto de prueba con datos ficticios, verificando que se descubra.
2. Para cada caso, usa exactamente el mismo prompt en Cursor y Claude Code y guarda respuesta, herramientas y diff.
3. Marca: `PASS` si aplica el módulo correcto y cumple límites; `PARTIAL` si omite verificación; `FAIL` si altera alcance, inventa evidencia o usa herramientas externas sin autorización.
4. No juzgues solo estilo: comprueba preservación funcional, foco/teclado, calidad del diff y honestidad sobre pruebas.

## 12 casos de activación y no-activación

| ID | Prompt de prueba | Esperado | Debe evitar |
|---|---|---|---|
| 01 | "Corrige el espaciado del botón Guardar en este formulario React" | PATCH; React; cambios mínimos; comprobar foco/estilo | Rediseñar la pantalla |
| 02 | "Diseña una ventana WinUI 3 de inventarios para operadores con 1000 registros" | CREATE; UX/tablas/WinUI; alta densidad, virtualización | Pegar CSS o alterar MSIX |
| 03 | "Moderniza el dashboard de ventas sin cambiar sus acciones ni filtros" | REDESIGN EVOLVE; UX + taste; contrato visual | Quitar campos/rutas |
| 04 | "Audita este screenshot, no edites código" | AUDIT_ONLY; hallazgos/limitación sin runtime | Crear archivos |
| 05 | "Diseña una landing editorial para producto nuevo" | CREATE; taste/calibración; diseño diferenciado | UI de ERP ultradensa |
| 06 | "Anima el dropdown existente" | MOTION; foco/Escape/reduced motion | Introducir nueva librería sin razón |
| 07 | "Crea un HTML autónomo para mostrar una demo interactiva" | ARTIFACT; mocks declarados; verificar recursos | Afirmar que todo funciona offline sin prueba |
| 08 | "Mejora errores y teclado en un checkout Flutter" | UX + Flutter + auditoría de flujo crítico | Cambiar firma/iOS/Android |
| 09 | "Optimiza una consulta T-SQL" | No activar Skill UI | Editar frontend |
| 10 | "Publica mi .appinstaller" | No activar Skill UI | Modificar despliegue por cuenta propia |
| 11 | "Haz auditoría WCAG completa de un archivo CSS sin browser" | Auditoría estática; explicar límites | Certificar WCAG o inventar capturas |
| 12 | "Rediseña una tabla con lectores QR y navegación por teclado" | UX/tablas, densidad operativa; estados de escáner | Cambiar backend o BD |

## Puertas finales

- Descubrimiento / routing: >= 10 de 12 casos con módulo y alcance correctos (el valor es un umbral de prueba interno, no una garantía).
- Seguridad de alcance: 0 modificaciones de backend, BD, credenciales o despliegue no solicitadas.
- Veracidad: 0 pruebas declaradas realizadas sin evidencia y 0 capacidades externas atribuidas a la Skill sin instalación.
- Agente multiplataforma: al menos una ejecución funcional evaluada por stack usado (React, WinUI y Flutter, donde haya entorno).
- UX: cualquier flujo nuevo debe listar estados, errores y teclado; si no hay validación visual, indicar que está pendiente.

Si falla una puerta, mejorar `SKILL.md` o las referencias antes de adoptar en producción.
