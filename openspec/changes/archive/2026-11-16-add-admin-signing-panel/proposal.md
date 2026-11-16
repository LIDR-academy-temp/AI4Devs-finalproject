# Proposal

## Why

HU1 empieza en el navegador: un funcionario completa los datos del firmante y carga un PDF en la sección «Firmar documento» del panel. Hoy esa carga solo se puede hacer con `curl`. Este cambio crea el *scaffold* del **panel de administración** (Angular 21 + PrimeNG 21, componente «Panel de administración» de la sección 2.2 del readme) con su primera pantalla real. El flujo pasa a recorrer navegador → API → PostgreSQL → widget, y es la funcionalidad de punta a punta de la Entrega 2.

Cubre los criterios de **HU1**:
- La carga con nombre y CUIL del firmante crea la v1 y la solicitud, y se ve el widget embebido.
- Los datos inválidos se rechazan con un mensaje claro.
- Sin token de administración no hay acceso.

El readme no tiene un ticket propio para el panel: se agrega como **Ticket 5** en la sección 6.

## What Changes

- **Panel nuevo** en `frontend/` (Angular 21 + PrimeNG 21, puerto `4200`):
  - **Acceso:** pantalla para ingresar el token de administración, que se guarda en la sesión del navegador y se envía como `Authorization: Bearer` en cada llamada. Hay un botón «Salir». Ante un `401`, el panel vuelve a pedir el token.
  - **«Firmar documento»:**
    - Formulario con nombre del firmante, CUIL, email opcional y un único PDF.
    - Antes de enviar, valida el CUIL (11 dígitos) y que el archivo sea PDF y no supere el tamaño máximo.
    - Llama a `POST /api/v1/admin/signing-uploads`.
  - **Resultado:**
    - Muestra el widget embebido por iframe con la `signing_url` y un botón «Descargar original» (descarga la v1 con el token de administración).
    - Ofrece «Cargar otro documento».
  - **Errores de la API:** `invalid_pdf`, `file_too_large`, `validation_error` (marcado por campo) y API no disponible, con mensajes en lenguaje claro.
- **Readme:** se agrega el Ticket 5 (panel) a la sección 6.

## Capabilities

### New Capabilities
- `admin-panel`: acceso al panel con el token de administración y la sección «Firmar documento»: formulario, validaciones, resultado con el widget embebido y descarga del original.

### Modified Capabilities
<!-- Ninguna: el panel consume endpoints que ya cubren las specs document-intake, document-versions y api-access. -->

## Fuera de alcance

- Listado de documentos, cadena de custodia, auditoría, gestión de sistemas integradores y anclas de confianza (HU4 y HU11, más adelante).
- Recibir el `postMessage` `firmadoc:signed` y refrescar el estado: depende de que exista la firma (Ticket 1b).
- Varios PDF en una carga (lote, versión 2).
- Inicio de sesión con usuario y contraseña u OAuth2: en el MVP, el panel usa el token de administración del contrato (`AdminBearer`).

## Impact

- **Código nuevo:** `frontend/`, un proyecto Angular 21 con componentes standalone, PrimeNG 21 con el tema Aura, `HttpClient` con un interceptor de autenticación y tests con Vitest.
- **Depende de** `add-signing-widget-viewer`: CORS en la API y el widget en `FIRMADOC_PUBLIC_BASE_URL`.
- **Backend y contrato:** sin cambios.
- **Configuración:** `frontend/src/environments/` con `apiUrl` y `maxUploadMb`. No hay secretos en el código: el token se ingresa en pantalla.
