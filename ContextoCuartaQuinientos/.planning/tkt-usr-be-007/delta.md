[← index](_index.md) | [← impl](impl.md)

# delta.md — USR-BE-007

**ADDED**

- REST auth JWT + refresh en `SGR/AuthService` (`ICuartaAuthService`).
- Repos `IRefreshTokenRepository`, column-compat en `UserRepository`.

**MODIFIED**

- DI: `CuartaAuthService` fuera del scan Scrutor (evita doble registro).
- `Program.cs`: re-lanza excepción tras log fatal (host de integración).
