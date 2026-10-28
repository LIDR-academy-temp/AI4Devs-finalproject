[← index](_index.md) | [← design](design.md)

# Impl: USR-BE-007

- `AuthServiceController`: `GenerateToken`, `RefreshToken`, `Logout`, `CambiarPassword`; cookie `rt` HttpOnly; rate limit `login`.
- `CuartaAuthService` + `JwtTokenService` + `RefreshTokenRepository` + `UserRepository` (compat pre/post DB-001).
- Tests: `AuthServiceControllerTests` (mock auth vía `ConfigureTestServices`); `GraphApi.Tests` 40/40.

## Verificación manual

- `POST /SGR/AuthService/GenerateToken` con admin DB-002.
- Refresh/Logout con cookie.
