# Arquitectura Firmadoc

Documentación de arquitectura complementaria al [readme.md](../../readme.md) (sección 2). Sirve para entregables que piden **C4**, **decisiones (ADR)** y carpeta `docs/`.

## Contenido

| Documento | Nivel C4 | Descripción |
|---|---|---|
| [c4-context.md](c4-context.md) | **C1 — Context** | Actores, sistemas vecinos y alcance de Firmadoc |
| [c4-containers.md](c4-containers.md) | **C2 — Containers** | Servicios desplegables (API, widget, panel, agente, BD) |
| [c4-components.md](c4-components.md) | **C3 — Components** | Módulos principales dentro del backend |
| [c4-code.md](c4-code.md) | **C4 — Code** | Paquetes y carpetas de referencia (no diagrama exhaustivo) |

## Otros artefactos relacionados

| Artefacto | Ubicación |
|---|---|
| Contrato HTTP (OpenAPI 3.1) | [../openapi.yaml](../openapi.yaml) |
| Modelo de datos (ER) | [readme §3.1](../../readme.md#31-diagrama-del-modelo-de-datos) |
| Despliegue e infra | [readme §2.4](../../readme.md#24-infraestructura-y-despliegue) |
| Seguridad | [readme §2.5](../../readme.md#25-seguridad) |
| **ADR** (decisiones) | [../adr.md](../adr.md) |
| Backlog Jira | [../jira-backlog.md](../jira-backlog.md) |

## Cómo mantenerlo

- Cambios de arquitectura **estructural**: actualizar el diagrama C2/C3 correspondiente y, si aplica, una entrada **D-NN** en [adr.md](../adr.md).
- Cambios de API: primero [openapi.yaml](../openapi.yaml), luego código.
- Decisiones cerradas en desarrollo: [AGENTS.md](../../AGENTS.md); las históricas y su porqué: ADRs.