# Design

## Context

La API ya acepta la carga del panel (`POST /admin/signing-uploads`, multipart, `Authorization: Bearer`) y la descarga de versiones. El change `add-signing-widget-viewer` agrega CORS para `http://localhost:4200` y deja la `signing_url` apuntando al widget en `http://localhost:5173`. Todavía no existe `frontend/`.

Restricciones de `CLAUDE.md`: Angular 21 + PrimeNG 21 (nunca PrimeNG 22, por su licencia comercial), con la carga desde el panel pidiendo nombre y CUIL del firmante. El panel usa `Authorization: Bearer`.

## Goals / Non-Goals

**Goals:**
- Un panel que se pueda levantar con `npm start` y que haga la carga real contra la API, con el widget embebido en la misma pantalla.
- Una estructura de proyecto en la que se puedan sumar las secciones siguientes (documentos, auditoría, integradores) sin reordenar: rutas, servicio de API, interceptor y guard.

**Non-Goals:**
- Inicio de sesión con usuarios propios: no está en el contrato ni en el MVP.
- Recibir el `postMessage` de firma y refrescar el estado (requiere el Ticket 1b).

## Decisions

### 1. Angular 21 standalone, con señales y formularios reactivos
Se genera con `npx @angular/cli@21 new frontend` (componentes standalone, SCSS, sin SSR). Usa `provideHttpClient(withInterceptors(...))` y `provideRouter` con dos rutas: `/acceso` y `/firmar`, esta última protegida por un guard funcional. El estado de cada pantalla vive en señales. El formulario es un `FormGroup` tipado con validadores sincrónicos.
- *Alternativa descartada:* NgModules o formularios basados en plantillas. Los primeros son el estilo anterior a Angular 17; los segundos dificultan probar los validadores de forma aislada.

### 2. PrimeNG 21 con el tema Aura
Se usa `providePrimeNG({ theme: { preset: Aura } })` de `@primeuix/themes`, y la versión se fija con `primeng@^21`. Los componentes son:
- `InputText` y `Message` para los campos y sus errores.
- `FileUpload` en modo básico, con `customUpload` para que el envío lo haga el servicio y no el componente.
- `Button`, `Card`, `ProgressSpinner` y `Toast` para las acciones, la estructura de la pantalla y los avisos.
- *Riesgo:* que alguien actualice a PrimeNG 22, que tiene licencia comercial. → `package.json` con `^21` y un comentario en `CLAUDE.md`, que ya lo prohíbe.

### 3. Token de administración en `sessionStorage`, con interceptor y guard
`AuthService` guarda el token en `sessionStorage` (`firmadoc:admin-token`). El interceptor agrega `Authorization: Bearer` solo a las URLs que empiezan con `environment.apiUrl`. Ante un `401`, el interceptor llama a `logout()` y navega a `/acceso` con el motivo. El guard de `/firmar` redirige a `/acceso` si no hay token. No existe un endpoint para validar el token: la primera llamada que lo usa es la que lo valida.
- *Alternativa descartada:* agregar `GET /admin/session` al contrato para validar el token al ingresar. Es un endpoint nuevo que solo mejora el momento en que aparece el error; se puede agregar cuando el panel tenga más secciones.
- *Riesgo:* el token queda accesible para un script inyectado en el origen del panel. → El panel no muestra HTML de terceros, Angular escapa las interpolaciones por defecto y `sessionStorage` se borra al cerrar la pestaña.

### 4. Iframe del widget solo para URLs del widget configurado
Angular bloquea `[src]` dinámicos en iframes. La `signing_url` se marca como confiable con `DomSanitizer.bypassSecurityTrustResourceUrl` solo si empieza con `environment.widgetUrl`. Si no, se muestra un error y no se crea el iframe. El iframe lleva `allow="clipboard-write"` y un `title` accesible.
- *Alternativa descartada:* confiar en cualquier URL que devuelva la API. Si la configuración del servidor estuviera mal, el panel embebería un origen arbitrario.

### 5. Descarga del original con `HttpClient` y blob
`GET .../versions/1/download` se pide con `responseType: 'blob'` y `observe: 'response'`. El nombre sale del `filename*` de `Content-Disposition`, que el CORS del widget-viewer expone, y la descarga se dispara con un enlace temporal y `URL.createObjectURL`. No se abre la URL directamente porque el navegador no enviaría el token.

### 6. Configuración por `environments`
`environment.ts` y `environment.development.ts` contienen:
- `apiUrl`: `http://localhost:8000/api/v1`.
- `widgetUrl`: `http://localhost:5173`.
- `maxUploadMb`: `10`, el mismo valor por defecto que `FIRMADOC_MAX_UPLOAD_MB`. La API sigue siendo la autoridad: el control del navegador solo evita subir algo que será rechazado.

### 7. Pruebas con Vitest y `HttpTestingController`
Angular 21 trae Vitest como ejecutor por defecto. Se prueban:
- Los validadores del CUIL y del archivo, con tests unitarios.
- `AuthService`, el interceptor (cabecera, URLs ajenas y `401`) y el guard.
- El componente «Firmar documento» con `HttpTestingController`, uno por escenario de la spec.

La prueba de punta a punta con navegador (Playwright) queda para la entrega final. En este cambio se reemplaza por una verificación manual documentada con captura.

## Risks / Trade-offs

- **El token de administración es una sola credencial compartida** por todos los que usan el panel, sin identidad individual. → Es lo que define el contrato del MVP; la auditoría por usuario llega con una autenticación real (versión 2).
- **Sin `frame-ancestors`**, cualquier sitio podría embeber el widget. → Lo resuelve un ticket posterior junto con el servidor del widget (ver `add-signing-widget-viewer`).
- **Sin contradicciones con `CLAUDE.md`.**

## Migration Plan

No toca el backend ni la base. Requiere que `add-signing-widget-viewer` esté aplicado, por el CORS y la URL del widget. Para revertir, se elimina `frontend/`.
