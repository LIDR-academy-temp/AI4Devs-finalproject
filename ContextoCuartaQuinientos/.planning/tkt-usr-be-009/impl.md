[← index](_index.md) | [← design](design.md)

# Impl: USR-BE-009

- `CuartaUsuarioAdminService` + `UsuarioAdminRepository`: CRUD admin (`GET/POST/PATCH/DELETE /SGR/Usuarios`), BCrypt temporal, `CasaOcupantes`.
- Política `SoloAdministrador`; revoca refresh al desactivar/eliminar.
- Tests: `CrearUsuarioAdminRequestValidatorTests`, `CuartaUsuarioAdminServiceTests`.
