[← index](_index.md) | [← design](design.md)

# Impl: NTF-BE-013

- `NotificacionService` + `NotificacionRepository`; `NotificacionesController` (`GET` bandeja, `PATCH …/leida`, `POST aviso`).
- Outbox vía `NotificarUsuarioAsync` / entrega Telegram en misma transacción del llamador.
- Tests: `NotificacionServiceTests`.
