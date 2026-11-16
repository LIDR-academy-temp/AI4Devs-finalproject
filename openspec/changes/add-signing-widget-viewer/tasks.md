# Tasks

## 1. Contrato y configuración

- [x] 1.1 Actualizar `docs/openapi.yaml`: agregar `file_name` y `size_bytes` a `DocumentResult` y describir `download_url` como la URL absoluta de descarga de la versión vigente; verificar con `npx @redocly/cli lint docs/openapi.yaml` sin errores
- [x] 1.2 Agregar `FIRMADOC_CORS_ORIGINS` (`http://localhost:4200,http://localhost:5173`) a `.env.example` y a `Settings`, y cambiar el ejemplo de `FIRMADOC_PUBLIC_BASE_URL` a `http://localhost:5173`; verificar que `pytest` sigue en verde

## 2. CORS (spec `api-access`)

- [x] 2.1 Escribir los tests de «CORS restringido a orígenes configurados» (verificación previa de un origen permitido con `X-Signing-Token`, origen no permitido, `Content-Disposition` expuesto y lista vacía) en `tests/integration/test_cors.py`; verificar que fallan
- [x] 2.2 Registrar `CORSMiddleware` en `create_app` según la decisión 6 del design; verificar que los tests de 2.1 pasan

## 3. Consulta de la solicitud (spec `signature-request-status`)

- [x] 3.1 Escribir los tests HTTP de «Consulta de una solicitud de firma» y «Credenciales admitidas para consultar una solicitud» en `tests/integration/test_signature_request_status.py`; verificar que fallan
- [x] 3.2 Agregar `require_request_reader` a `app/core/auth.py` (sin token de administración y compartiendo la verificación con `require_document_reader`), con tests que confirmen que el token de administración da `401`
- [x] 3.3 Implementar los esquemas `SignatureRequestOut` y `DocumentResult`, la consulta en el servicio (autorización por dueño o por solicitud del enlace) y el `GET` en `app/api/signature_requests.py`, con `download_url` construida mediante `url_for`; verificar que los tests de 3.1 pasan

## 4. Scaffold del widget

- [x] 4.1 Crear `widget/` con `npm create vite@latest` (plantilla `react-ts`), agregar Vitest, jsdom, Testing Library y `pdfjs-dist`, y configurar el puerto `5173` y `widget/.env.example` con `VITE_FIRMADOC_API_URL=http://localhost:8000/api/v1`; verificar que `npm run build` y `npm test` terminan sin errores

## 5. Lógica del widget (spec `signing-widget`)

- [x] 5.1 Escribir los tests unitarios de `link.ts` (leer `request_id` y token, guardar y recuperar de `sessionStorage`, quitar el fragmento), `format.ts` (tamaño legible) y `api.ts` (traducción de `401`, `404`, `5xx` y falla de red a tipos de error); verificar que fallan
- [x] 5.2 Implementar `link.ts`, `format.ts` y `api.ts` según las decisiones 1 y 2 del design; verificar que los tests de 5.1 pasan

## 6. Pantalla del widget (spec `signing-widget`)

- [x] 6.1 Escribir los tests de la pantalla con `fetch` y `pdfPreview` simulados: enlace completo, enlace sin token, recarga, documento pendiente con páginas y tamaño, vista previa fallida, «Firma propia» deshabilitada, solicitud firmada y los tres mensajes de error con «Reintentar»; verificar que fallan
- [x] 6.2 Implementar `pdfPreview.ts` (`pdfjs-dist` con el worker importado mediante `?url`) y los componentes `App`, `DocumentCard` y `SigningMethods`, con estilos propios mínimos; verificar que los tests de 6.1 pasan y que `npm run build` compila

## 7. Verificación de punta a punta y documentación

- [x] 7.1 Ejecutar `pytest`, `alembic check`, `npm test` y `npm run build` en `widget/`, y `openspec validate add-signing-widget-viewer --strict`; verificar que todo termina sin errores
- [x] 7.2 Prueba manual: con la API y `npm run dev` levantados, cargar un PDF con `curl` y abrir la `signing_url` en el navegador; verificar que se ven nombre, páginas, tamaño, estado y la vista previa, que el fragmento desaparece de la barra y que una recarga sigue mostrando el documento. Guardar una captura en `docs/screenshots/`
- [x] 7.3 Actualizar `readme.md` (sección 1.4 con el arranque del widget, sección 1.3 con la captura y sección 2.3 si cambia la estructura), `CLAUDE.md` (comandos de `widget/` y `FIRMADOC_CORS_ORIGINS`) y `prompts.md` (prompt del change y ajustes humanos); verificar que los comandos documentados funcionan tal como están escritos

## Workflow follow-up

- Revisar el change y archivarlo con `openspec archive add-signing-widget-viewer`.
- Continuar con el change `add-admin-signing-panel` (panel Angular con la carga y el widget embebido).
