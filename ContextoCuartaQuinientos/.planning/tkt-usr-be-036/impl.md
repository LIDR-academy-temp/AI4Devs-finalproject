[← index](_index.md) | [← design](design.md)

# Impl: USR-BE-036

- `POST /SGR/AuthService/CambiarPassword` + `CambiarPasswordRequestValidator`.
- `CuartaAuthService`: BCrypt, revoca todos los refresh (`RevokeAllForUsuarioAsync`).
- Web: `CambiarPasswordPage`, `cambiarPasswordSchema`, guard vía `PrivateRoute` + `RequireSessionRoute`.
- Tests: `CuartaAuthServiceCambiarPasswordTests`, `CambiarPasswordPage.test.tsx`.
