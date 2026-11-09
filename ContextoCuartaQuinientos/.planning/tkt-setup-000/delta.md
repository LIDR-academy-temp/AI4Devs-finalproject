[← index](_index.md) | [← impl](impl.md)

# delta.md — SETUP-000

Scaffold `Web/`, CI GitHub Actions, `Result`/ProblemDetails, políticas JWT, `PrivateRoute`, health `/health`.

## Verificación 2026-10-16

- `dotnet build` OK (roll-forward .NET 9).
- `dotnet test`: 38/40 (2 integración `AuthServiceControllerTests` requieren BD/JWT host).
- `npm test` 12/12, `npm run build` OK.
