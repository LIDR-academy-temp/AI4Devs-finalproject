# Tasks

## 1. Preparación del backend (D3)

- [x] 1.1 Hacer que `conftest.py` falle en lugar de saltear cuando `EXIGIR_BASE_PRUEBAS=1` y la base no responde, y verificarlo con una prueba que simule la base caída
- [x] 1.2 Incorporar Ruff a las dependencias de desarrollo y a `uv.lock`, corregir sus hallazgos y verificar que `uv run ruff check` y `uv run pytest` pasan

## 2. Flujo de GitHub Actions (D1, D2, D4, D5, D6, D7)

- [x] 2.1 Escribir `.github/workflows/integracion.yml` con los trabajos backend, frontend, contrato, especificaciones, secretos, dependencias y e2e, sin secretos, con `contents: read`, acciones fijadas por SHA y tiempos máximos; verificar su sintaxis con actionlint
- [x] 2.2 Agregar el trabajo de pruebas negativas para pull requests a `main` y `workflow_dispatch`
- [x] 2.3 Configurar Gitleaks con los falsos positivos conocidos del historial de LIDR documentados en la revisión de seguridad, y verificar que el escaneo local del historial termina sin hallazgos nuevos
- [x] 2.4 Agregar Dependabot para las acciones de GitHub, una vez por semana

## 3. Primera ejecución

- [x] 3.1 Con la aprobación del responsable para el push, subir la rama y verificar que todos los trabajos terminan en verde en GitHub; corregir lo que falle. Ejecuciones 42331724077 (push) y 42332086713 (a pedido, con las pruebas negativas), el 7 de noviembre de 2026; antes se corrigió una carrera en la E2E de recupero
- [x] 3.2 Comprobar que el pipeline falla cuando debe: una prueba rota en una rama descartable, sin fusionarla, y luego borrarla. Ejecución 42332106660: falló solo el trabajo del backend, con la prueba señalada; la rama se borró

## 4. Documentación

- [x] 4.1 Escribir el ADR-0003 del pipeline, con las etapas, las herramientas, lo que queda afuera y la guía para proteger `main` (D8)
- [x] 4.2 Actualizar la sección 2.4 del README, `CLAUDE.md` y la hoja de ruta (D4), y verificar que ningún documento dice que el pipeline está pendiente
- [ ] 4.3 El responsable revisa el flujo y lo aprueba
