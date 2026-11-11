# Spec Delta

## Purpose

Mantiene las pruebas de Weather Track alineadas con las respuestas reales de SAT2, sin exponer datos sensibles, y avisa cuando SAT2 cambia la forma de sus respuestas.

## ADDED Requirements

### Requirement: Captura saneada de respuestas reales

El sistema SHALL ofrecer una herramienta que, en modo real, pida a SAT2 la autenticación, los equipos, los instantáneos del equipo 1 y un día completo de históricos de cada uno de sus sensores, y escriba esas respuestas saneadas. La herramienta MUST NOT escribir ni mostrar la URL de SAT2, las credenciales, los tokens ni los datos de la cuenta.

#### Scenario: Captura en modo real

- **WHEN** el responsable ejecuta la captura en su instalación en modo real
- **THEN** obtiene un archivo con las respuestas saneadas y ve qué rutas se reemplazaron, sin sus valores

#### Scenario: Otro modo

- **WHEN** se ejecuta la captura con un modo distinto de real
- **THEN** termina con un mensaje y no consulta SAT2

### Requirement: Saneado conservando la forma

El saneado SHALL reemplazar los valores de las claves con nombres de token, clave, contraseña, usuario, cliente, correo o serie, y cualquier texto con forma de URL, de correo o de token, conservando la estructura y el tipo de cada valor.

#### Scenario: Respuesta de autenticación

- **WHEN** se sanea la respuesta de la autenticación
- **THEN** el token y el identificador del cliente quedan reemplazados y el resto de la estructura se conserva

#### Scenario: URL en un campo inesperado

- **WHEN** un campo sin nombre sensible contiene una URL
- **THEN** su valor queda reemplazado

### Requirement: Respuestas de referencia sin secretos

Las respuestas de referencia versionadas MUST NOT contener textos con forma de URL, de correo o de token, y una prueba SHALL fallar si los contienen, nombrando la ruta sin mostrar el valor.

#### Scenario: Archivo con un token

- **WHEN** el archivo de referencia contiene un texto con forma de token
- **THEN** la prueba falla y nombra la ruta donde está

### Requirement: Procesamiento de las respuestas reales

Las pruebas SHALL procesar las respuestas de referencia con el catálogo, el ciclo y la carga de históricos reales, y MUST fallar si un sensor queda sin clasificar, el ciclo no termina bien o una lectura se descarta por su formato.

#### Scenario: Catálogo real

- **WHEN** se sincroniza el catálogo con los equipos de referencia
- **THEN** cada sensor queda con una magnitud y una unidad del sistema de Weather Track

#### Scenario: Ciclo real

- **WHEN** se ejecuta el ciclo con los instantáneos de referencia
- **THEN** termina bien y calcula una recomendación

### Requirement: Detección de cambios en SAT2

El sistema SHALL guardar la forma de cada respuesta de referencia, sin sus valores, y SHALL ofrecer una comparación que vuelva a pedir las respuestas a SAT2 y liste las claves nuevas, las que faltan y los tipos que cambiaron, terminando con error si hay diferencias.

#### Scenario: SAT2 sin cambios

- **WHEN** el responsable ejecuta la comparación y SAT2 responde con la misma forma
- **THEN** la comparación informa que no hay diferencias y termina bien

#### Scenario: SAT2 agrega un campo

- **WHEN** una respuesta de SAT2 trae una clave que no estaba en la referencia
- **THEN** la comparación lista esa clave con su ruta, sin el valor, y termina con error
