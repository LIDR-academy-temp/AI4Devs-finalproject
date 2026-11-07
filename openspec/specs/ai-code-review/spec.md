# ai-code-review Specification

## Purpose
Suma a cada pull request una revisión de IA enfocada en las reglas de Weather Track, como apoyo a la decisión del responsable y sin reemplazar los controles del pipeline.

## Requirements

### Requirement: Revisión automática de los pull requests

Cada pull request a `main` SHALL recibir una revisión de GitHub Copilot al abrirse y en cada push nuevo, con comentarios sobre líneas concretas.

#### Scenario: Pull request nuevo

- **WHEN** se abre un pull request a `main`
- **THEN** Copilot lo revisa y deja sus comentarios en el pull request

#### Scenario: Push nuevo

- **WHEN** se suben commits nuevos a un pull request abierto
- **THEN** Copilot vuelve a revisarlo

### Requirement: La revisión de IA no decide

La revisión de Copilot MUST NOT ser un control exigido para fusionar en `main`. Fusionar SHALL depender de los controles del pipeline y de la decisión del responsable.

#### Scenario: Comentario descartado

- **WHEN** el responsable descarta un comentario de Copilot y el pipeline está en verde
- **THEN** el pull request se puede fusionar

### Requirement: Criterios del proyecto

Las instrucciones de revisión SHALL estar en castellano en el repositorio y SHALL pedir que se señalen primero los problemas de seguridad, las reglas del dominio, el contrato de la API y las migraciones, con criterios propios para el dominio, las migraciones, los flujos de GitHub Actions, la API y el frontend.

#### Scenario: Cambio en el dominio

- **WHEN** un pull request cambia un corte del índice sin cambiar la versión del método
- **THEN** las instrucciones que aplican al dominio piden señalarlo

#### Scenario: Cambio en un flujo

- **WHEN** un pull request agrega una acción referenciada por etiqueta y no por SHA
- **THEN** las instrucciones que aplican a los flujos piden señalarlo

### Requirement: Plantilla de pull request

Todo pull request SHALL partir de una plantilla que pida la tarea de OpenSpec, la verificación realizada y una lista de control que incluya pruebas, contrato, migraciones, documentación, ausencia de secretos y comentarios de Copilot atendidos.

#### Scenario: Pull request nuevo

- **WHEN** alguien abre un pull request en GitHub
- **THEN** la descripción empieza con la plantilla
