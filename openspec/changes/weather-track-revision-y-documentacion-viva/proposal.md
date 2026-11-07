# Proposal

## Why

La devolución de LIDR sobre la Entrega 1 pidió reforzar la fase de mantenimiento con IA (pendiente D5): revisión de pull requests asistida por IA y documentación viva a partir de las especificaciones de OpenSpec. Hoy el pipeline verifica cada cambio, pero ninguna revisión mira el diseño ni las reglas del proyecto, y las especificaciones solo se leen archivo por archivo, sin un panorama que muestre qué hace el sistema.

## What Changes

- **Revisión con Copilot:** cada pull request a `main` recibe una revisión automática de GitHub Copilot, también en cada push nuevo. Es una opinión: no aprueba ni bloquea; decide el responsable.
- **Instrucciones de revisión** en `.github/copilot-instructions.md` y por carpeta en `.github/instructions/`, en castellano: qué mirar en el dominio, las migraciones, el flujo de GitHub Actions, la API y el frontend.
- **Plantilla de pull request** con la tarea de OpenSpec, la verificación hecha y una lista de control.
- **Documentación viva:** un comando genera `docs/especificaciones/README.md` desde `openspec/specs`, con cada capacidad, su propósito, sus requisitos y escenarios, y el cambio archivado que la modificó por última vez.
- **El pipeline falla si esa guía no está al día** con las especificaciones.

## Capabilities

### New Capabilities

- `ai-code-review`: cuándo y con qué criterios revisa la IA un pull request, y qué peso tiene esa revisión.
- `living-documentation`: la guía de las especificaciones, generada y siempre coherente con ellas.

### Modified Capabilities

- `continuous-integration`: se agrega el requisito de que la documentación viva esté al día.

## Impact

- **Repositorio:** `.github/copilot-instructions.md`, `.github/instructions/`, `.github/pull_request_template.md`, `backend/herramientas/documentar_especificaciones.py` y `docs/especificaciones/README.md`.
- **Pruebas:** pruebas del generador y una que falla si la guía está desactualizada. El trabajo de backend del pipeline ya las corre; el flujo no cambia.
- **GitHub, a cargo del responsable:** activar la revisión automática de Copilot en la regla de `main`. Requiere un plan de Copilot (Pro, Pro+, Max, Business o Enterprise).
- **Documentación:** secciones 1.6 y 1.7 del README, `CLAUDE.md` y la hoja de ruta (D5).
- Sin cambios en la aplicación, la API ni la base de datos.
