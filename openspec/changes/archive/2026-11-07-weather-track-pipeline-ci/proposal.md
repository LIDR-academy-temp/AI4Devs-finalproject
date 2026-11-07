# Proposal

## Why

Hoy todas las verificaciones de Weather Track se ejecutan a mano en la computadora del responsable: pytest, Vitest, lint, E2E, pruebas negativas y la revisión de secretos antes de cada commit. Nada impide que llegue a la rama un cambio que rompe una prueba o sube una credencial. La devolución de LIDR sobre la Entrega 1 pidió un pipeline redactado con IA y revisado por el responsable (pendiente D4), y la sección 2.4 del README lo marca como pendiente.

## What Changes

- Un flujo de GitHub Actions que se ejecuta en cada push y en cada pull request, sin secretos y con permisos de solo lectura.
- **Backend:** lint con Ruff, pytest contra PostgreSQL 18 y el motor del dominio con 100 % de cobertura obligatoria.
- **Frontend:** lint, tipos, Vitest y build.
- **Contrato:** `openapi.json` y los tipos del frontend coinciden con la API.
- **Extremo a extremo:** la pila completa en modo prueba, con Playwright.
- **Seguridad:** escaneo de secretos de todo el historial, auditoría de dependencias y, en los pull requests a `main`, las pruebas negativas sobre la configuración de producción.
- **Especificaciones:** `openspec validate --all --strict`.
- **BREAKING para las pruebas:** si falta la base de pruebas, pytest falla en el pipeline en lugar de saltear los tests.
- Un ADR nuevo con las etapas, las herramientas y lo que queda afuera: el despliegue continuo sigue en la línea B.

## Capabilities

### New Capabilities

- `continuous-integration`: qué se verifica automáticamente en cada cambio, con qué garantías de seguridad del propio pipeline y cuándo un cambio no puede considerarse listo.

### Modified Capabilities

Ninguna. Las capacidades del producto no cambian.

## Impact

- **Repositorio:** `.github/workflows/` y la configuración de Ruff en `backend/pyproject.toml`. Ajustes de estilo en el backend que pida Ruff.
- **Pruebas:** `backend/tests/conftest.py` falla si la base de pruebas es obligatoria y no responde.
- **Documentación:** ADR-0003, sección 2.4 del README, `CLAUDE.md` y la hoja de ruta (D4).
- **GitHub:** Actions ya está habilitado en el repositorio público, sin costo. Exigir los controles antes de fusionar es un ajuste del repositorio que hace el responsable.
- Sin cambios en la aplicación, la API ni la base de datos.
