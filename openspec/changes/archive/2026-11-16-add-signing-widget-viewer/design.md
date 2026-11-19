# Design

## Context

El backend ya expone la carga, la descarga y las credenciales: `require_document_reader` devuelve un `Principal`, y el token del enlace viaja en el fragmento `#t=` de la `signing_url`. No existen `widget/` ni CORS. `FIRMADOC_PUBLIC_BASE_URL` vale hoy `http://localhost:8000`, así que la `signing_url` apunta a la API, donde no hay ninguna página.

Restricciones de `CLAUDE.md` que aplican: el widget es React + TypeScript + Vite, se sirve en la `signing_url` y se embebe por iframe; el PIN nunca pasa por el navegador (aquí no hay PIN); `X-Signing-Token` es la credencial del widget.

## Goals / Non-Goals

**Goals:**
- Que abrir una `signing_url` muestre el documento real de esa solicitud, tanto en una pestaña como en un iframe.
- Dejar armada la estructura del widget (cliente de API, estados de pantalla y tarjetas de método), para que el Ticket 1b solo tenga que habilitar «Firmar».
- Implementar el endpoint de consulta tal como lo define el contrato, con los campos que hacen falta para mostrar el documento.

**Non-Goals:**
- Firmar (`prepare` / `complete`) y avisar a la ventana padre con `postMessage`.
- Navegar todas las páginas del PDF: alcanza con la primera página como vista previa.
- Servir el widget compilado desde un servidor propio con `frame-ancestors`.

## Decisions

### 1. Widget sin router ni gestor de estado
Una sola pantalla que lee `window.location.pathname` (`/sign/{id}`) y maneja su estado con `useReducer`: `loading`, `ready`, `signed` o `error` con su tipo. Las llamadas a la API van en un módulo `api.ts` que devuelve resultados tipados y traduce los códigos HTTP a tipos de error (`incomplete_link`, `expired_link`, `not_found` y `unavailable`).
- *Alternativa descartada:* React Router y una librería de estado. Agregan dependencias para una sola ruta; si en el hito 2 el flujo con agente lo requiere, se incorporan entonces.

### 2. Token: del fragmento a `sessionStorage`
Al cargar, el widget lee `#t=` y lo guarda en `sessionStorage` con la clave `firmadoc:token:{request_id}`. Después quita el fragmento con `history.replaceState`. En una recarga sin fragmento, recupera el token guardado. `sessionStorage` está acotado a la pestaña (o al iframe) y se borra al cerrarla.
- *Alternativa descartada:* mantener el token solo en memoria. Una recarga, por ejemplo después de perder la red, dejaría al firmante sin acceso y obligaría al integrador a emitir otro enlace.
- *Riesgo:* un script inyectado en el origen del widget podría leer el token. Se mitiga con un widget sin HTML de terceros y con el vencimiento de 24 h.

### 3. Vista previa con `pdfjs-dist` detrás de una interfaz
El módulo `pdfPreview.ts` expone `loadPdf(bytes)`, que devuelve `{ pageCount, renderFirstPage(canvas) }`. Los tests de componentes lo reemplazan con `vi.mock`, porque jsdom no tiene canvas. El worker de pdf.js se importa con la sintaxis `?url` de Vite.
- *Alternativa descartada:* contar las páginas en el backend. Habría que agregar `page_count` al contrato y leer el PDF en cada consulta, y la vista previa necesita igual el PDF en el navegador.

### 4. `GET /signature-requests/{id}`: credenciales del contrato, sin administración
El contrato admite `ApiKeyAuth` y `SigningLinkAuth`. Se agrega una dependencia `require_request_reader` en `app/core/auth.py`, con la misma lógica que `require_document_reader` pero sin aceptar el token de administración. Comparten una función interna para no duplicar la verificación. La autorización por recurso va en el servicio: el integrador debe ser el dueño de la solicitud y el token del enlace debe ser de esa misma solicitud. En los dos casos, la respuesta es `404`.
- *Alternativa descartada:* aceptar también el token de administración. El panel no lo necesita en este cambio y sería ampliar el contrato sin un consumidor.

### 5. `download_url` absoluta a partir de la petición
Se construye con `request.url_for("download_version", ...)`, de modo que sigue al host que atendió la petición. No hace falta otra variable de entorno.
- *Riesgo:* detrás de un proxy inverso hace falta `--proxy-headers` en uvicorn para que el esquema y el host sean los públicos. Se documenta cuando llegue el despliegue.

### 6. CORS con el middleware de Starlette y lista explícita
`CORSMiddleware` con `allow_origins` tomado de `FIRMADOC_CORS_ORIGINS`, sin comodín y sin credenciales de cookie (`allow_credentials=False`), porque todas las credenciales viajan en cabeceras. Los métodos admitidos son `GET` y `POST`. Las cabeceras admitidas son `Authorization`, `Content-Type`, `X-API-Key` y `X-Signing-Token`, y se expone `Content-Disposition`.
- *Alternativa descartada:* usar `integrating_system.allowed_origins`. Esa columna describe dónde se embebe el widget (`frame-ancestors`), no quién llama a la API, y las llamadas de los integradores son de servidor a servidor.

### 7. `FIRMADOC_PUBLIC_BASE_URL` apunta al widget
La `signing_url` ya se construye como `{FIRMADOC_PUBLIC_BASE_URL}/sign/{id}#t=...`, así que alcanza con cambiar el valor de ejemplo a `http://localhost:5173`. El código no cambia. En producción, la API y el widget pueden compartir dominio y la variable valdrá lo mismo para ambos.

### 8. Pruebas del widget
Vitest con jsdom y Testing Library:
- Tests unitarios de la lectura del token, el formato del tamaño y la traducción de errores de `api.ts`.
- Tests de la pantalla con `fetch` simulado, para cada escenario de la spec `signing-widget`.

La prueba de punta a punta con navegador real (Playwright) queda para la entrega final, cuando exista la firma. En este cambio se reemplaza por una verificación manual documentada.

## Risks / Trade-offs

- **Token en `sessionStorage`**: ver la decisión 2.
- **Contrato que crece**: `file_name` y `size_bytes` en `DocumentResult` también llegan al webhook (Ticket 1d). → Es información que el integrador ya conoce, así que no expone nada nuevo.
- **Tamaño del bundle**: `pdfjs-dist` pesa alrededor de 1 MB más el worker. → Se acepta en el MVP. Si molesta, la vista previa se puede cargar de forma diferida con `import()`.
- **Sin contradicciones con `CLAUDE.md`**: no se reabre ninguna decisión cerrada.

## Migration Plan

No hay migraciones de base. Al desplegar, hay que definir `FIRMADOC_CORS_ORIGINS` y apuntar `FIRMADOC_PUBLIC_BASE_URL` al widget. Para revertir, se revierte el commit. Las `signing_url` ya emitidas siguen apuntando a la base anterior.
