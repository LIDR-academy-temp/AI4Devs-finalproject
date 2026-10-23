# Sesiones con revisores (UAT)

Una sesión con revisores es una prueba de aceptación guiada: una o varias personas que conocen el proceso de reconciliación usan la aplicación con tareas concretas (importar un batch de muestra, revisar las validaciones, procesar y descargar) mientras se anota lo que pasa. No es una demo: quien revisa maneja la aplicación y quien la ha construido observa sin ayudar, salvo para desbloquear.

Reglas de las notas:

- **Sin nombres.** Los revisores aparecen como `R1`, `R2`…; no se anota nombre, cargo, correo ni ningún otro dato que permita identificarlos.
- **Sin datos reales.** Solo se usan el mundo sintético del seed y los archivos de [`data/samples/`](../../data/samples/). Si un revisor menciona un caso real (un proveedor, un merchant, un importe, un ID), se anota en abstracto ("un proveedor con dos cuentas"), nunca el dato.
- **Hechos, no soluciones.** La columna *Qué pasó* describe lo observado o lo que dijo el revisor; la solución se decide después, en la clasificación.

Cada sesión es un archivo `AAAA-MM-DD.md` en esta carpeta, copiado de [`plantilla.md`](plantilla.md). Tras la sesión, cada fila se clasifica:

| Clasificación | Significado |
|---|---|
| `viernes` | Se corrige antes de la Entrega 2 |
| `E3` | Pasa a un issue de la Entrega 3 (se anota el número) |
| `README` | No cambia el código: aclara o corrige la documentación |
| `descartar` | No se hará; se anota el motivo |

## Sesiones

| Fecha | Notas | Resultado |
|---|---|---|
| 2026-10-20 | [`2026-10-20-revision-interfaz.md`](2026-10-20-revision-interfaz.md) | Revisión de la interfaz con el líder del equipo. Valoración general buena del progreso y del resultado; doce observaciones resueltas en `ui-polish` (PR #91) y el resto a issues de la Entrega 3 o del roadmap. Esa sesión clasificó sus filas por destino (`ui-polish`, `Entrega 3`, `Roadmap`). |

Las sesiones previstas para el 15 y el 22 de octubre no se celebraron; la Entrega 2 se revisó solo en la del 20.
