# Firmadoc — registro en Jira (proyecto SCRUM)

Documento de referencia para el backlog cargado en Atlassian. Los criterios de aceptación completos siguen en el [readme.md](../readme.md) (secciones 5 y 6).

## Enlaces

| Recurso | URL |
|---|---|
| Sitio | https://vergara-bruno.atlassian.net |
| Tablero | https://vergara-bruno.atlassian.net/jira/software/projects/SCRUM/boards/1 |
| Backlog | https://vergara-bruno.atlassian.net/jira/software/projects/SCRUM/boards/1/backlog |
| Épica Firmadoc | https://vergara-bruno.atlassian.net/browse/SCRUM-1 |

## Estructura en Jira

```
SCRUM-1  [Epic] Firmadoc MVP
├── SCRUM-2 … SCRUM-13   [Historia] HU1 – HU11 (+ HU1b)
├── SCRUM-14             [Tarea] Ticket 1 — backend
│   ├── SCRUM-15         [Subtask] 1a
│   ├── SCRUM-16         [Subtask] 1b
│   ├── SCRUM-21         [Subtask] 1d
│   └── SCRUM-22         [Subtask] 1c
├── SCRUM-17             [Tarea] Ticket 3
├── SCRUM-18             [Tarea] Ticket 5
├── SCRUM-19             [Tarea] Ticket 4
└── SCRUM-20             [Tarea] Ticket 2
```

## Historias de usuario

| ID | Clave | Título corto | Etiquetas | Estado (carga inicial) |
|---|---|---|---|---|
| HU1 | SCRUM-2 | Panel: cargar y firmar | `must-have`, `hito-1` | Finalizada |
| HU1b | SCRUM-4 | API integrador | `must-have`, `hito-1` | Finalizada |
| HU2 | SCRUM-3 | Token USB | `must-have`, `hito-2` | Por hacer |
| HU3 | SCRUM-6 | Webhook | `must-have`, `hito-1` | Por hacer |
| HU4 | SCRUM-5 | Auditoría visible | `must-have` | Por hacer |
| HU5 | SCRUM-7 | Firma propia / local | `must-have`, `hito-1` | Finalizada |
| HU6 | SCRUM-11 | Lote | `should-have` | Por hacer |
| HU7 | SCRUM-10 | Firma remota | `should-have` | Por hacer |
| HU8 | SCRUM-9 | Multifirma UI | `should-have` | Por hacer |
| HU9 | SCRUM-8 | Pendientes / listado | `should-have` | Por hacer |
| HU10 | SCRUM-12 | Verificación API | `should-have` | Por hacer |
| HU11 | SCRUM-13 | Rotación PKI | `should-have` | Por hacer |

## Tickets de implementación

| ID | Clave | Puntos (h) | Repo / notas | Estado (carga inicial) |
|---|---|---:|---|---|
| 1 | SCRUM-14 | 34 | Épica backend | En curso |
| 1a | SCRUM-15 | 7 | `intake`, admin upload | Finalizada |
| 1b | SCRUM-16 | 12 | `local_signing`, PAdES | Finalizada |
| 1c | SCRUM-22 | 9 | Hito 2 | Por hacer |
| 1d | SCRUM-21 | 6 | Auditoría + webhook | Por hacer |
| 2 | SCRUM-20 | 12 | `widget/` | En curso |
| 3 | SCRUM-17 | 7 | Alembic + seed | Finalizada |
| 4 | SCRUM-19 | 14 | `agent/` | En curso |
| 5 | SCRUM-18 | 8 | `frontend/` | Finalizada |

## Sprint

Al registrar el backlog se **inició SCRUM Sprint 1** con todas las claves anteriores (18-nov-2026 → 02-dic-2026). Revisar en Jira el sprint activo antes de planificar entregas nuevas.

## Mantenimiento

1. Cambiar estado en Jira al mergear un ticket OpenSpec.
2. Actualizar la tabla de estado en [readme.md §8](../readme.md#8-seguimiento-en-jira) y en este archivo si cambian las claves o el alcance.
3. No crear HUs en Jira que no existan en readme §5 sin antes actualizar el readme.