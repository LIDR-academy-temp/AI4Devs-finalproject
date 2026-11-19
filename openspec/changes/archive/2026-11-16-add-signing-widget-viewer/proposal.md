# Proposal

## Why

La API ya devuelve una `signing_url` (Ticket 1a), pero esa URL no abre nada: el componente que la sirve, el widget, todavía no existe. Para la Entrega 2 se necesita que el flujo principal haga algo real de punta a punta, incluido el navegador. Este cambio crea el *scaffold* del **Ticket 2 — Frontend: widget embebible de firma** (readme, sección 6) y su primer tramo funcional. Quien abre el enlace ve el documento que va a firmar, con nombre, páginas, tamaño y estado.

Cubre el último paso del primer criterio de **HU1**: «se muestra el widget embebido con el nombre, las páginas y el tamaño del documento». La firma en sí (`prepare` / `complete`) queda para cuando exista el Ticket 1b.

## What Changes

- **Widget nuevo** en `widget/` (React + TypeScript + Vite), servido en `/sign/{request_id}`:
  - Lee el token del fragmento `#t=` y lo saca de la barra de direcciones.
  - Consulta la solicitud y descarga el PDF con `X-Signing-Token`.
  - Muestra nombre, cantidad de páginas, tamaño, estado y una vista previa de la primera página.
  - Muestra la tarjeta «Firma propia» deshabilitada, con el aviso de que no tiene la presunción legal de la firma digital.
  - Da mensajes claros cuando el enlace está incompleto o vencido, la solicitud no existe o la API no responde.
- **Backend:** se implementa `GET /api/v1/signature-requests/{id}`, que ya figura en el contrato, para el integrador dueño o el portador del enlace de esa solicitud.
- **Backend:** CORS configurable con `FIRMADOC_CORS_ORIGINS`, para que el widget (`:5173`) y el panel (`:4200`) puedan llamar a la API desde el navegador.
- **Configuración:** `FIRMADOC_PUBLIC_BASE_URL` pasa a ser la URL pública del widget (`http://localhost:5173` en desarrollo), porque es ahí donde debe abrir la `signing_url`.
- **Cambios en `docs/openapi.yaml`:** `DocumentResult` gana `file_name` y `size_bytes` (el widget los muestra sin descargar el PDF), y `download_url` pasa a ser la URL absoluta del endpoint de descarga de la versión vigente.

## Capabilities

### New Capabilities
- `signing-widget`: lo que ve y puede hacer quien abre una `signing_url`: credencial del enlace, datos y vista previa del documento, métodos de firma y mensajes de error.
- `signature-request-status`: consulta del estado de una solicitud de firma y de la versión vigente de su documento.

### Modified Capabilities
- `api-access`: se agrega el requisito de CORS restringido a orígenes configurados.

## Fuera de alcance

- `prepare` / `complete` y el botón de firma operativo (Ticket 1b); aquí la tarjeta «Firma propia» se ve pero está deshabilitada.
- `postMessage` a la ventana padre al firmar (requiere que exista la firma).
- Cabecera `frame-ancestors` a partir de `allowed_origins` del integrador: necesita el servidor que sirva el widget compilado, que llega con el despliegue.
- Tarjeta «Firma con token», detección del agente y selección de certificado (hito 2).
- Panel de administración y embebido del widget en él (change `add-admin-signing-panel`).

## Impact

- **Código nuevo:**
  - `widget/` (proyecto Vite, tests con Vitest y Testing Library, vista previa con `pdfjs-dist`).
  - `backend/app/api/signature_requests.py` gana el `GET`.
  - `backend/app/main.py` gana el middleware de CORS.
- **Contrato:** `docs/openapi.yaml`, campos nuevos en `DocumentResult`. No hay cambios incompatibles, porque el esquema todavía no tenía consumidores.
- **Configuración:**
  - `FIRMADOC_CORS_ORIGINS` es nueva y va a `.env.example`.
  - `FIRMADOC_PUBLIC_BASE_URL` cambia su valor de ejemplo.
  - `VITE_FIRMADOC_API_URL` es nueva, en `widget/.env.example`.
- **Modelo:** sin migraciones.
