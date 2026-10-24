# Design

## Context

La API NestJS y el esquema con `users` y `companies` existen tras `setup-project-foundation`. El readme §2.5 fija JWT + bcrypt, guards por rol y filtro por `companyId` del token. No hay registro de usuarios ni recuperación de contraseña en el MVP: los usuarios se crean por seed.

## Goals / Non-Goals

**Goals:**
- Un único punto donde se decide la empresa del usuario, reutilizado por todos los módulos posteriores.
- Que sea imposible olvidar el filtro por empresa en un módulo nuevo.
- Login funcional de extremo a extremo en el frontend.

**Non-Goals:**
- Registro, recuperación de contraseña, refresh tokens, MFA, SSO.
- Pantallas de gestión de usuarios (rol ADMIN solo existe como guard).

## Decisions

1. **JWT firmado con secreto simétrico (HS256), expiración 8 h, sin refresh token.** El analista trabaja en jornada; volver a autenticarse al día siguiente es aceptable. Alternativa descartada: access + refresh tokens; más superficie y estado para un beneficio marginal en el MVP.
2. **Guard JWT registrado como global (`APP_GUARD`) con decorador `@Public()` para el login.** Así la protección es la norma y la excepción es explícita. Alternativa descartada: decorar cada controlador con `@UseGuards`; un olvido expone datos.
3. **Decorador `@CurrentUser()` que expone `{ userId, companyId, role }` desde el token**, y convención: todo servicio recibe `companyId` como primer argumento y lo incluye en el `where` de Prisma. Alternativa descartada: middleware de Prisma que inyecte el filtro automáticamente; es opaco y frágil con relaciones anidadas. Se añade un test de integración por módulo que verifica el aislamiento.
4. **404 (no 403) cuando el recurso pertenece a otra empresa.** No revela existencia. Alternativa descartada: 403; filtra información.
5. **Rate limiting con `@nestjs/throttler` solo en `/auth/login`** (p. ej. 5 intentos/min por IP). Alternativa descartada: global; penalizaría el polling del estado de conciliación.
6. **bcrypt con coste 12.** Equilibrio coste/seguridad estándar. Alternativa descartada: argon2; mejor algoritmo pero dependencia nativa que complica el despliegue en Render/Railway.
7. **Frontend: token en memoria + `sessionStorage`,** interceptor que añade `Authorization` y que ante 401 limpia la sesión y redirige a `/login`. Alternativa descartada: cookie httpOnly; requiere CSRF y configuración CORS con credenciales, innecesario con SPA y API en dominios distintos para el MVP.

## Risks / Trade-offs

- [Secreto JWT filtrado] → vive solo en variables de entorno del backend; rotarlo invalida sesiones, aceptable.
- [Token en sessionStorage expuesto a XSS] → Helmet, sin `dangerouslySetInnerHTML`, dependencias auditadas; riesgo aceptado para el MVP.
- [Un módulo nuevo olvida el filtro por empresa] → convención + test de aislamiento obligatorio por módulo (regla en tasks de cada change).

## Open Questions

- Duración exacta del token (propuesta 8 h) y límite de intentos (propuesta 5/min).
