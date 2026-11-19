# api-access Specification

## Purpose
Define quién puede usar la API de Firmadoc (sistemas integradores, el panel de administración y el portador de un enlace de firma), qué alcanza cada credencial y cómo se informan los errores.

## Requirements

### Requirement: Autenticación de sistemas integradores por API key
El sistema SHALL autenticar a los sistemas integradores mediante la cabecera `X-API-Key`, comparándola contra el hash guardado en `integrating_system.api_key_hash`. La API key en texto plano MUST NOT guardarse ni registrarse en logs.

#### Scenario: API key válida
- **WHEN** un integrador registrado llama a un endpoint de integrador con su `X-API-Key`
- **THEN** la petición se procesa en nombre de ese integrador

#### Scenario: API key ausente
- **WHEN** se llama a un endpoint de integrador sin la cabecera `X-API-Key`
- **THEN** la respuesta es `401` con `code` = `unauthorized`

#### Scenario: API key desconocida
- **WHEN** se llama a un endpoint de integrador con una `X-API-Key` que no corresponde a ningún integrador
- **THEN** la respuesta es `401` con `code` = `unauthorized`

### Requirement: Autenticación del panel por token de administración
El sistema SHALL autenticar al panel mediante `Authorization: Bearer <token>`, comparado en tiempo constante con `FIRMADOC_ADMIN_TOKEN`. Si `FIRMADOC_ADMIN_TOKEN` está vacío, todos los endpoints de administración MUST rechazar el acceso.

#### Scenario: Token de administración válido
- **WHEN** el panel llama a un endpoint de administración con el token configurado
- **THEN** la petición se procesa

#### Scenario: Token de administración inválido o ausente
- **WHEN** se llama a un endpoint de administración sin `Authorization` o con un token distinto
- **THEN** la respuesta es `401` con `code` = `unauthorized`

#### Scenario: Token de administración no configurado
- **WHEN** `FIRMADOC_ADMIN_TOKEN` está vacío y se llama a un endpoint de administración con `Authorization: Bearer ` y cualquier valor
- **THEN** la respuesta es `401`

### Requirement: Aislamiento entre sistemas integradores
Un sistema integrador SHALL acceder solo a los documentos que él mismo envió. Un recurso de otro integrador, o cargado desde el panel, MUST responderse como inexistente.

#### Scenario: Documento de otro integrador
- **WHEN** el integrador B pide un documento enviado por el integrador A
- **THEN** la respuesta es `404` con `code` = `not_found`

#### Scenario: Documento propio
- **WHEN** el integrador A pide un documento que él envió
- **THEN** la petición se procesa

### Requirement: Enlace de firma firmado y con vencimiento
Cada `signing_url` SHALL incluir un token firmado con `FIRMADOC_SIGNING_LINK_SECRET` que identifica una única solicitud de firma y vence a las 24 horas. El widget lo envía en `X-Signing-Token` y solo da acceso a la solicitud y al documento que identifica.

#### Scenario: Token de enlace válido
- **WHEN** se usa `X-Signing-Token` vigente para acceder al documento de su solicitud
- **THEN** la petición se procesa

#### Scenario: Token de enlace vencido o alterado
- **WHEN** se usa un `X-Signing-Token` vencido o cuya firma no verifica
- **THEN** la respuesta es `401` con `code` = `unauthorized`

#### Scenario: Token de enlace de otra solicitud
- **WHEN** se usa el `X-Signing-Token` de la solicitud A para acceder al documento de la solicitud B
- **THEN** la respuesta es `404` con `code` = `not_found`

### Requirement: Formato común de errores
Toda respuesta de error de la API SHALL tener el cuerpo `{code, message, details}` definido como `Error` en `docs/openapi.yaml`, incluidos los errores de validación de entrada, que MUST responderse con `422`.

#### Scenario: Cuerpo de petición inválido
- **WHEN** se envía a un endpoint JSON un cuerpo que no cumple el esquema
- **THEN** la respuesta es `422` con `code` = `validation_error` y en `details` los campos que fallaron

#### Scenario: Recurso inexistente
- **WHEN** se pide un recurso que no existe
- **THEN** la respuesta es `404` con el mismo formato de cuerpo

### Requirement: Estado del servicio
El sistema SHALL exponer `GET /api/v1/health` sin autenticación, que informa si la API puede consultar la base de datos.

#### Scenario: Servicio y base disponibles
- **WHEN** se llama a `GET /api/v1/health` y PostgreSQL responde
- **THEN** la respuesta es `200` con `{"status": "ok"}`

#### Scenario: Base de datos no disponible
- **WHEN** se llama a `GET /api/v1/health` y PostgreSQL no responde
- **THEN** la respuesta es `503` con `code` = `database_unavailable`

### Requirement: CORS restringido a orígenes configurados
La API SHALL responder a las peticiones de navegador, incluidas las de verificación previa (`OPTIONS`), solo para los orígenes listados en `FIRMADOC_CORS_ORIGINS`, separados por comas. Para esos orígenes MUST admitir las cabeceras `Authorization`, `Content-Type`, `X-API-Key` y `X-Signing-Token`, y exponer `Content-Disposition`. Un origen que no está en la lista MUST NOT recibir `Access-Control-Allow-Origin`. Con la variable vacía, la API no habilita CORS para ningún origen.

#### Scenario: Origen permitido
- **WHEN** el widget en `http://localhost:5173`, que está en `FIRMADOC_CORS_ORIGINS`, envía una verificación previa con `X-Signing-Token`
- **THEN** la respuesta incluye `Access-Control-Allow-Origin: http://localhost:5173` y admite la cabecera `X-Signing-Token`

#### Scenario: Origen no permitido
- **WHEN** una página en `http://sitio-ajeno.example` envía una petición o una verificación previa
- **THEN** la respuesta no incluye `Access-Control-Allow-Origin`

#### Scenario: Nombre de archivo visible para el navegador
- **WHEN** un origen permitido descarga una versión
- **THEN** la respuesta incluye `Access-Control-Expose-Headers` con `Content-Disposition`
