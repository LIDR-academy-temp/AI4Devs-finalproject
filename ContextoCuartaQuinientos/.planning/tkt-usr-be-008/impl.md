[← index](_index.md) | [← design](design.md)

# Impl: USR-BE-008

- `GET/PUT /SGR/Usuarios/{id}` (`IUsuarioPerfilService`, `UsuarioPerfilRepository`).
- Web: `PerfilPage` + `perfilSchema`; re-login si cambia correo (`requiereReLogin`).
- Tests: `ActualizarPerfilRequestValidatorTests`, `PerfilPage.test.tsx`.
