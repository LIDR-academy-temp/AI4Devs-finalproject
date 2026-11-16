# admin-panel Specification

## Purpose
Define el panel de administración de Firmadoc: cómo se accede con el token de administración y cómo un funcionario carga un PDF para firmar desde «Firmar documento», con el widget embebido en la misma pantalla.

## Requirements

### Requirement: Acceso con el token de administración
El panel SHALL pedir el token de administración antes de mostrar cualquier sección. Lo guarda en `sessionStorage` y lo envía como `Authorization: Bearer` en cada llamada a la API. Si la API responde `401`, el panel MUST borrar el token guardado y volver a la pantalla de acceso con el mensaje «El token de administración no es válido».

#### Scenario: Primer ingreso
- **WHEN** se abre el panel sin un token guardado
- **THEN** se muestra la pantalla de acceso y no se ve «Firmar documento»

#### Scenario: Token ingresado
- **WHEN** se ingresa un token y se confirma
- **THEN** se muestra «Firmar documento» y las llamadas siguientes llevan `Authorization: Bearer {token}`

#### Scenario: Token rechazado por la API
- **WHEN** una carga recibe `401`
- **THEN** se vuelve a la pantalla de acceso con «El token de administración no es válido» y el token deja de estar guardado

#### Scenario: Salir
- **WHEN** se elige «Salir»
- **THEN** se borra el token y se muestra la pantalla de acceso

### Requirement: Formulario «Firmar documento»
La sección SHALL pedir el nombre del firmante, el CUIL, un email opcional y un único archivo PDF. «Cargar» MUST estar deshabilitado mientras falte un dato obligatorio o alguno sea inválido. Las validaciones previas al envío son:
- El nombre no puede estar vacío.
- El CUIL debe tener exactamente 11 dígitos, sin guiones.
- El email, si se completa, debe tener formato de email.
- El archivo debe ser `.pdf` y no superar el tamaño máximo configurado.

#### Scenario: Datos válidos
- **WHEN** se completan nombre, un CUIL de 11 dígitos y un PDF de 200 KB
- **THEN** «Cargar» se habilita

#### Scenario: CUIL con guiones
- **WHEN** el CUIL ingresado es `20-12345678-6`
- **THEN** el campo muestra «El CUIL debe tener 11 dígitos, sin guiones» y «Cargar» queda deshabilitado

#### Scenario: Archivo que no es PDF
- **WHEN** se elige `imagen.png`
- **THEN** se muestra «Elegí un archivo PDF» y el archivo no queda seleccionado

#### Scenario: Archivo demasiado grande
- **WHEN** se elige un PDF que supera el tamaño máximo configurado
- **THEN** se muestra «El archivo supera los 10 MB» y el archivo no queda seleccionado

### Requirement: Carga y resultado
Al confirmar, el panel SHALL enviar el formulario a `POST /api/v1/admin/signing-uploads` y mostrar un indicador de progreso. Si la respuesta es `201`, se ve:
- el widget embebido por iframe con la `signing_url` recibida;
- el botón «Descargar original», que descarga la v1 con su nombre de archivo;
- la opción «Cargar otro documento», que vacía el formulario.

#### Scenario: Carga exitosa
- **WHEN** la API responde `201` con una `signing_url`
- **THEN** se ve un iframe cuyo `src` es esa `signing_url`, junto al nombre del archivo y del firmante

#### Scenario: Descargar el original
- **WHEN** después de una carga exitosa se elige «Descargar original»
- **THEN** el panel pide `GET /api/v1/documents/{document_id}/versions/1/download` con el token de administración y el navegador guarda el archivo con su nombre original

#### Scenario: Cargar otro documento
- **WHEN** se elige «Cargar otro documento»
- **THEN** desaparecen el iframe y el resultado, y el formulario queda vacío

### Requirement: Errores de la carga
El panel SHALL traducir las respuestas de error de la API a mensajes en lenguaje claro, sin perder los datos ingresados en el formulario.

#### Scenario: PDF inválido
- **WHEN** la API responde `422` con `code` = `invalid_pdf`
- **THEN** se muestra «El archivo no es un PDF válido o está protegido con contraseña» y el formulario conserva los datos

#### Scenario: Archivo demasiado grande según la API
- **WHEN** la API responde `422` con `code` = `file_too_large`
- **THEN** se muestra «El archivo supera el tamaño máximo permitido»

#### Scenario: Datos rechazados por la API
- **WHEN** la API responde `422` con `code` = `validation_error` y en `details.errors` el campo `signer_identifier`
- **THEN** el campo CUIL se marca como inválido con el mensaje de la API

#### Scenario: API no disponible
- **WHEN** la carga falla por red o la API responde `5xx`
- **THEN** se muestra «No pudimos conectar con Firmadoc. Intentá de nuevo en unos minutos.» y el formulario conserva los datos
