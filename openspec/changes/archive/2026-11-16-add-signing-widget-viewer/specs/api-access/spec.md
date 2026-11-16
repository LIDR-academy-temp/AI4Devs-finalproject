# Spec Delta

## ADDED Requirements

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
