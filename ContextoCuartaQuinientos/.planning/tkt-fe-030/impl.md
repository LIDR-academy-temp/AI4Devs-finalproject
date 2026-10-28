[← index](_index.md) | [← design](design.md)

# Impl: FE-030

- `AuthContext` + `authSession` + `refreshSession` (memoria, refresh deduplicado, montaje silencioso).
- `LoginPage` + `loginSchema`; `apiClient` con `credentials: include` y reintento 401.
- `apolloClient`: `errorLink` + `authLink`; `PrivateRoute` / `RequireSessionRoute`; logout en `AppShell`.
- Tests: `LoginPage.test`, `refreshSession.test`, `PrivateRoute` ampliado.
