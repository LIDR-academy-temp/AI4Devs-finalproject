# Design

## Context

- `main` está protegida: exige pull request y los 8 trabajos del pipeline en verde ([ADR-0003](../../../docs/decisions/0003-pipeline-de-integracion-continua.md)).
- El responsable eligió el 7 de noviembre de 2026 la revisión de GitHub Copilot y la documentación viva dentro del repositorio.
- Copilot code review lee `.github/copilot-instructions.md`, los archivos `.github/instructions/*.instructions.md` con su campo `applyTo`, y también `CLAUDE.md`. Las instrucciones se toman de la rama del pull request, así que se pueden probar antes de fusionar.
- Hay 10 especificaciones principales en `openspec/specs`, con 5 cambios archivados en `openspec/changes/archive`.

## Goals / Non-Goals

**Goals:**

- Una segunda mirada sobre cada pull request, enfocada en las reglas de Weather Track y no en el estilo genérico.
- Una guía de las especificaciones que nunca quede vieja, porque se genera y el pipeline la controla.

**Non-Goals:**

- Que la IA apruebe o bloquee: la revisión de Copilot no es un control exigido.
- Un sitio público de documentación: la guía vive en el repositorio.
- Trazabilidad automática entre cada escenario y sus pruebas: queda como mejora posible.

## Decisions

### D1. Copilot revisa cada pull request a `main`, sin bloquear

El responsable agrega a la regla `main proteccion` la opción **Automatically request Copilot code review**, con **Review new pushes**. Copilot comenta sobre líneas concretas; no aprueba ni rechaza. Los comentarios se atienden o se descartan con un motivo, y la decisión es del responsable.

- **Por qué no exigirla:** una revisión de IA puede equivocarse o variar entre ejecuciones. Exigir su aprobación haría depender `main` de una opinión no determinista.
- **Por qué Copilot y no Claude en Actions:** no agrega secretos al repositorio, como exige `continuous-integration`, ni costo por uso fuera del plan del responsable.

### D2. Instrucciones en castellano, sin repetir CLAUDE.md

Copilot ya lee `CLAUDE.md`, con el stack, la arquitectura, las reglas del dominio y las de seguridad. Por eso:

- `.github/copilot-instructions.md` dice **cómo revisar**: en castellano, qué señalar primero (seguridad, reglas del dominio, contrato, migraciones), qué no comentar (estilo que ya controlan Ruff y oxlint) y cómo redactar cada comentario.
- `.github/instructions/` agrega criterios por zona, con `applyTo`:
  - `dominio.instructions.md` → `backend/app/dominio/**`: límites "menor o igual" y "mayor que", versión del método al cambiar pesos o cortes, sin dependencias de otras capas, unidades métricas.
  - `migraciones.instructions.md` → `backend/migraciones/**`: `upgrade` y `downgrade`, nunca editar una migración aplicada.
  - `flujos.instructions.md` → `.github/workflows/**`: sin secretos, sin `pull_request_target`, acciones por SHA, `contents: read`.
  - `api.instructions.md` → `backend/app/api/**`: contrato regenerado, respuestas uniformes que no revelen cuentas, validación de entradas, sin datos sensibles en los registros.
  - `frontend.instructions.md` → `frontend/src/**`: accesibilidad de los formularios, textos en castellano, sin secretos en el cliente.

### D3. Plantilla de pull request

`.github/pull_request_template.md` pide la tarea de OpenSpec, qué se verificó y una lista de control: pruebas, contrato, migración, documentación, sin `.env` ni credenciales, y comentarios de Copilot atendidos.

### D4. Documentación viva generada en el repositorio

`backend/herramientas/documentar_especificaciones.py`, solo con la biblioteca estándar, lee `openspec/specs/*/spec.md` y los cambios archivados, y escribe `docs/especificaciones/README.md`:

- Un índice con cada capacidad: propósito, cantidad de requisitos y de escenarios, y el último cambio archivado que la modificó, con su fecha.
- Una sección por capacidad con sus requisitos y la lista de escenarios, enlazados al archivo de la especificación.
- Una cabecera que avisa que el archivo se genera y no se edita a mano.

La salida es determinista: mismo orden y sin la fecha de generación, para que solo cambie cuando cambian las especificaciones. Con `--comprobar` no escribe: termina con error si el archivo difiere.

### D5. El control va en las pruebas del backend

Una prueba de pytest compara la guía versionada con la que genera el comando. El trabajo de backend del pipeline ya la corre, así que no se agrega un trabajo nuevo ni hay que tocar la regla de `main`.

## Risks / Trade-offs

- [El responsable no tiene un plan de Copilot que incluya la revisión automática] → La guía y las instrucciones siguen sirviendo para pedir la revisión a mano o con Claude Code. Se verifica antes de dar la tarea por hecha.
- [Copilot ignora alguna instrucción] → GitHub lo advierte. Los controles que importan siguen siendo los del pipeline; la revisión suma, no reemplaza.
- [Olvidar regenerar la guía] → La prueba falla con el comando exacto para regenerarla.

## Migration Plan

1. Se agregan las instrucciones, la plantilla, el generador y la guía.
2. El responsable activa la revisión automática en la regla de `main`.
3. Con su aprobación, un pull request de prueba desde una rama descartable muestra la revisión; se cierra sin fusionar y la rama se borra.

## Open Questions

Ninguna.
