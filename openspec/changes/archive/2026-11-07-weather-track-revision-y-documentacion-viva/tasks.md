# Tasks

## 1. Documentación viva (D4, D5)

- [x] 1.1 Escribir primero las pruebas del generador (índice, requisitos y escenarios, último cambio archivado, salida determinista, aviso inicial y `--comprobar`) y luego `backend/herramientas/documentar_especificaciones.py`; verificar con `uv run pytest`
- [x] 1.2 Generar `docs/especificaciones/README.md` y agregar la prueba que falla si está desactualizada, con el comando para regenerarla; verificar que falla al cambiar una especificación sin regenerar

## 2. Revisión con Copilot (D1, D2, D3)

- [x] 2.1 Escribir `.github/copilot-instructions.md` y las instrucciones por zona en `.github/instructions/` (dominio, migraciones, flujos, API y frontend), y verificar que cada archivo tiene un `applyTo` que coincide con archivos reales
- [x] 2.2 Escribir `.github/pull_request_template.md` con la tarea de OpenSpec, la verificación y la lista de control
- [x] 2.3 Documentar en el ADR-0003 cómo activar la revisión automática en la regla de `main`; el responsable la activa
- [x] 2.4 Con la aprobación del responsable, abrir un pull request de prueba desde una rama descartable, comprobar que Copilot lo revisa con los criterios del proyecto, cerrarlo sin fusionar y borrar la rama

## 3. Documentación

- [x] 3.1 Actualizar las secciones 1.6 y 1.7 del README, `CLAUDE.md` y la hoja de ruta (D5), y verificar que la guía generada está enlazada desde el README
- [x] 3.2 El responsable revisa las instrucciones y la guía, y las aprueba
