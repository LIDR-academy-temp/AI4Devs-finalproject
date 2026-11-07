# continuous-integration Specification

## Purpose
Verifica automáticamente cada cambio de Weather Track con las mismas pruebas que se ejecutan a mano, para que nada llegue a `main` sin pasar por ellas, y sin que el propio pipeline exponga credenciales.

## Requirements

### Requirement: Verificación de cada cambio

El sistema SHALL ejecutar en cada push a `main` o a una rama `feature/**`, y en cada pull request a `main`, el lint y las pruebas del backend y del frontend, el build del frontend, la comparación del contrato de la API, la validación de las especificaciones, el escaneo de secretos, la auditoría de dependencias y las pruebas de extremo a extremo.

#### Scenario: Cambio que rompe una prueba

- **WHEN** un push incluye un cambio que hace fallar una prueba del backend
- **THEN** el pipeline termina en error y señala el trabajo y la prueba que fallaron

#### Scenario: Cambio correcto

- **WHEN** un push pasa todas las verificaciones
- **THEN** el pipeline termina en verde

### Requirement: Pruebas de base obligatorias

El pipeline MUST ejecutar las pruebas del backend contra PostgreSQL y MUST fallar si la base de pruebas no responde, en lugar de saltear esas pruebas.

#### Scenario: Base de pruebas caída

- **WHEN** la base de pruebas no responde durante el pipeline
- **THEN** las pruebas del backend fallan con un mensaje que lo indica

### Requirement: Cobertura del motor

El pipeline MUST fallar si la cobertura de líneas de `app.dominio` es menor al 100 %.

#### Scenario: Línea del motor sin probar

- **WHEN** un cambio agrega al dominio una línea que ninguna prueba ejecuta
- **THEN** el pipeline falla e informa la línea sin cubrir

### Requirement: Contrato actualizado

El pipeline MUST fallar si `frontend/openapi.json` o los tipos generados del frontend no coinciden con los que produce la API.

#### Scenario: Contrato sin regenerar

- **WHEN** un cambio modifica una ruta de la API sin regenerar el contrato
- **THEN** el pipeline falla y muestra la diferencia

### Requirement: Pipeline sin secretos

El pipeline SHALL ejecutarse sin secretos del repositorio, con permiso de solo lectura sobre el contenido, y MUST NOT usar el disparador `pull_request_target`. Cada acción de terceros MUST fijarse por el SHA completo de su commit.

#### Scenario: Pull request desde un fork

- **WHEN** alguien abre un pull request desde un fork
- **THEN** el pipeline corre sin secretos ni permisos de escritura sobre el repositorio

#### Scenario: Acción fijada

- **WHEN** se revisa el archivo del flujo
- **THEN** cada `uses:` de terceros referencia un SHA de 40 caracteres

### Requirement: Secretos en el historial

El pipeline MUST fallar si el escaneo encuentra un secreto en cualquier commit del historial que no esté registrado como falso positivo con su motivo.

#### Scenario: Credencial subida por error

- **WHEN** un commit incluye un texto con forma de token
- **THEN** el pipeline falla e indica el archivo y el commit, sin mostrar el valor completo

### Requirement: Dependencias vulnerables

El pipeline MUST fallar si las dependencias bloqueadas del backend o del frontend tienen una vulnerabilidad conocida de severidad alta o crítica que no esté registrada como excepción con su motivo y fecha de revisión.

#### Scenario: Vulnerabilidad alta

- **WHEN** una dependencia del frontend tiene una vulnerabilidad alta publicada
- **THEN** el trabajo de dependencias falla y la nombra

### Requirement: Pruebas negativas antes de fusionar

El pipeline SHALL ejecutar las pruebas negativas sobre la configuración de producción en cada pull request a `main` y a pedido.

#### Scenario: Pull request a main

- **WHEN** se abre o actualiza un pull request a `main`
- **THEN** corren las pruebas negativas y su resultado forma parte de los controles del pull request

### Requirement: Diagnóstico de la E2E

Cuando las pruebas de extremo a extremo fallan, el pipeline SHALL conservar el informe y las trazas de Playwright como artefacto durante 7 días.

#### Scenario: E2E fallida

- **WHEN** una prueba de extremo a extremo falla en el pipeline
- **THEN** el informe y la traza de esa prueba quedan disponibles para descargar desde la ejecución

### Requirement: Documentación viva al día

El pipeline MUST fallar si `docs/especificaciones/README.md` difiere de la guía que se genera desde `openspec/specs`, y el mensaje SHALL indicar el comando para regenerarla.

#### Scenario: Especificación cambiada sin regenerar la guía

- **WHEN** un cambio modifica una especificación sin regenerar la guía
- **THEN** el pipeline falla e indica el comando para regenerarla
