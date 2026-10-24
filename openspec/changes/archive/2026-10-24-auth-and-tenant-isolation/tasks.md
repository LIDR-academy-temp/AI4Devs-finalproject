# Tasks

## 1. TK-04 · Módulo de autenticación, guard de roles y aislamiento por empresa

- [x] 1.1 Crear `AuthModule` con `POST /auth/login` (DTO validado) que verifica usuario activo y contraseña con bcrypt y emite JWT HS256 con `sub`, `companyId`, `role`, expiración configurable
- [x] 1.2 Implementar estrategia JWT con Passport, guard global `APP_GUARD` y decorador `@Public()` aplicado al login
- [x] 1.3 Implementar `GET /auth/me` que devuelve nombre, correo, rol y empresa sin el hash
- [x] 1.4 Crear decoradores `@CurrentUser()` y `@Roles()` y `RolesGuard`; documentar la convención `companyId` como primer argumento de servicio
- [x] 1.5 Añadir rate limiting en login, Helmet y CORS restringido a `CORS_ORIGIN`
- [x] 1.6 Respuesta genérica única para correo inexistente, contraseña incorrecta y usuario inactivo
- [x] 1.7 Tests unitarios de `AuthService` (hash, usuario inactivo, token) y de integración: login OK, login fallido idéntico en ambos casos, 401 sin token, 401 con token manipulado, 429 tras exceder intentos
- [x] 1.8 Test de integración plantilla de aislamiento por empresa (recurso de otra empresa devuelve 404) para reutilizar en changes posteriores

## 2. TK-05 · Pantalla de login y gestión de sesión en el frontend

- [x] 2.1 Crear cliente HTTP base con interceptor de `Authorization` y manejo de 401 (limpiar sesión y redirigir a `/login`)
- [x] 2.2 Implementar página de login con formulario validado, mensaje genérico de error y estado de carga
- [x] 2.3 Implementar contexto de sesión (usuario actual vía `/auth/me`), rutas protegidas y botón de cerrar sesión
- [x] 2.4 Redirigir al listado de conciliaciones tras login correcto (placeholder hasta `reconciliation-management`)
- [x] 2.5 Tests de componentes del formulario de login (validación, error genérico, redirección)

## 3. Cierre del change

- [ ] 3.1 Registrar la PR en readme §7 y los prompts relevantes en prompts.md
