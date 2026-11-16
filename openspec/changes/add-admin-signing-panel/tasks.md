# Tasks

## 1. Scaffold del panel

- [ ] 1.1 Generar `frontend/` con `npx @angular/cli@21 new frontend` (standalone, SCSS, sin SSR) e instalar `primeng@^21` y `@primeuix/themes`, configurando `providePrimeNG` con Aura, `provideHttpClient` y las rutas `/acceso` y `/firmar`; verificar que `npm run build` y `npm test` terminan sin errores
- [ ] 1.2 Crear `src/environments/` con `apiUrl`, `widgetUrl` y `maxUploadMb`; verificar que `ng build` usa el archivo de desarrollo con `--configuration development`

## 2. Acceso (requirement «Acceso con el token de administración»)

- [ ] 2.1 Escribir los tests de `AuthService` (guardar, leer y borrar el token), del interceptor (cabecera solo para `apiUrl` y `401` que borra el token y navega a `/acceso`) y del guard; verificar que fallan
- [ ] 2.2 Implementar `AuthService`, `authInterceptor` y `authGuard`; verificar que los tests de 2.1 pasan
- [ ] 2.3 Escribir los tests de la pantalla de acceso (primer ingreso, token ingresado, mensaje tras un rechazo y «Salir») e implementarla con PrimeNG; verificar que pasan

## 3. Formulario «Firmar documento»

- [ ] 3.1 Escribir los tests unitarios de los validadores (CUIL de 11 dígitos, email opcional y archivo `.pdf` dentro del tamaño máximo) y de los escenarios del formulario (datos válidos, CUIL con guiones, archivo no PDF y archivo demasiado grande); verificar que fallan
- [ ] 3.2 Implementar los validadores y el formulario tipado con `InputText`, `FileUpload` en modo básico y «Cargar» deshabilitado mientras sea inválido; verificar que los tests de 3.1 pasan

## 4. Carga, resultado y errores

- [ ] 4.1 Escribir los tests del componente con `HttpTestingController`: carga exitosa con iframe, descarga del original con su nombre, «Cargar otro documento», `invalid_pdf`, `file_too_large`, `validation_error` por campo, API no disponible y una `signing_url` fuera de `widgetUrl` que no crea el iframe; verificar que fallan
- [ ] 4.2 Implementar `SigningUploadService` (`POST` multipart y descarga como blob con el nombre de `Content-Disposition`) y la vista de resultado con el iframe saneado según la decisión 4 del design; verificar que los tests de 4.1 pasan

## 5. Verificación de punta a punta y documentación

- [ ] 5.1 Ejecutar `npm test` y `npm run build` en `frontend/` y `widget/`, `pytest` en `backend/` y `openspec validate add-admin-signing-panel --strict`; verificar que todo termina sin errores
- [ ] 5.2 Prueba manual: con la API, el widget (`:5173`) y el panel (`:4200`) levantados, ingresar el token, cargar un PDF y verificar que se ve el widget embebido con el documento, que «Descargar original» guarda el mismo archivo (mismo SHA-256) y que un CUIL inválido y un archivo no PDF muestran sus mensajes. Guardar capturas en `docs/screenshots/`
- [ ] 5.3 Actualizar `readme.md` (sección 1.3 con las capturas, sección 1.4 con el arranque del panel y sección 6 con el Ticket 5 del panel), `CLAUDE.md` (comandos de `frontend/`) y `prompts.md` (prompt del change y ajustes humanos); verificar que los comandos documentados funcionan tal como están escritos

## Workflow follow-up

- Archivar el change con `openspec archive add-admin-signing-panel`.
- Crear el scaffold de `agent/` (hito 2) y completar el Typeform de la Entrega 2 con la rama `feature/entrega-2-bbmv`.
