[← index](_index.md) | [← impl](impl.md)

# delta.md — FE-030

**ADDED**

- Flujo login/sesión JWT en `Web/` (token en memoria, refresh cookie HttpOnly).
- `refreshSession.ts`, pruebas Vitest auth.

**MODIFIED**

- `apolloClient` reintento UNAUTHENTICATED; `AppShell` cierre de sesión.
