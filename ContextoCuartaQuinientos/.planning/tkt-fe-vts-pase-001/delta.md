# Delta: tkt-fe-vts-pase-001-vts-pase-qr

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Residente (JWT): crear pase en `vts.VisitasGeneradas` con `CodigoQR` único (128-bit hex), listar **mis pases** (`GET /VTS/VisitasGeneradas/mias`), ver QR en SPA y compartir por WhatsApp / copiar texto.
- Guardia/Admin (JWT, policy `AdminOGuardia`): validar código (`POST /VTS/VisitasGeneradas/validar` → `Valido|Expirado|Usado|NoEncontrado`) y marcar entrada (`POST /VTS/VisitasGeneradas/{id}/usar` → `bUsado=1` con `WHERE bUsado=0`).
- SPA rutas: `/visitas/pases`, `/guardia/validar-pase` (+ admin vía `AdminRoute`); nav `guardiaOnly` para perfil Guardia.
- Stack backend: `ICuartaVisitasGeneradasService` + `CuartaVisitasGeneradasRepository` (Dapper sobre `vts.VisitasGeneradas` / `vts.vsVisitasGeneradas`).

## Comportamiento modificado

- (Antes): `POST/PATCH/DELETE` en `VTS/VisitasGeneradas` eran legacy con headers `UserID` / `WindowName`.
- (Después): escritura legacy en `POST/PATCH/DELETE .../legacy`; `POST /VTS/VisitasGeneradas` reservado al flujo JWT Cuarta (201 + DTO pase).

- (Antes): definición de `vts.vsVisitasGeneradas` en schema referenciaba columnas pre–DB-001 (`NombreUsuario`, `DireccionCasa`, …).
- (Después): vista alineada a columnas físicas (`Nombre`, `Correo`, `Direccion`, `Numero` como alias lógicos en SELECT).

## Comportamiento eliminado

- Ninguno en producción Cuarta (legacy GET conservado en raíz + alias `legacy`).

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| `vts.VisitasGeneradas` | Tabla | Reutilizado (INSERT/UPDATE vía Dapper) |
| `vts.vsVisitasGeneradas` | Vista | Modificado (definición en `SQL/cuartaquinientos_schema.sql`) |
| `sgr.CasaOcupantes` | Tabla | Reutilizado (resolver casa vigente del residente) |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| `/VTS/VisitasGeneradas/mias` | GET | Creado (JWT residente) |
| `/VTS/VisitasGeneradas` | POST | Creado (JWT residente; 201 pase) |
| `/VTS/VisitasGeneradas/validar` | POST | Creado (JWT AdminOGuardia) |
| `/VTS/VisitasGeneradas/{id}/usar` | POST | Creado (JWT AdminOGuardia) |
| `/VTS/VisitasGeneradas/legacy` (+ rutas legacy write) | GET/POST/PATCH/DELETE | Modificado (reubicación legacy) |

## Para el reviewer

- **Qué se hizo**: Pase de visita QR end-to-end (API JWT + SPA residente/guardia).
- **Por qué**: [[FE-VTS-PASE-001]] — paridad MVP con `Web_diseño` sin GraphQL en `Web/`.
- **Riesgo**: **Medio** — vista `vsVisitasGeneradas` debe desplegarse en BDs con definición vieja; residente requiere casa vigente + catálogo `TipoIdentificacion`.
- **Qué probar**: `FE-VTS-PASE-001_api_tests.http` o [TKT-FE-VTS-PASE-001-APIS.md](TKT-FE-VTS-PASE-001-APIS.md); xUnit `CuartaVisitasGeneradasServiceTests`.
- **Rollback**: revertir PR GraphApi/Web/SQL vista; legacy write sigue en `*/legacy`.

## Aprendizajes

- Tras `IDbTransaction.Commit()`, no ejecutar Dapper en la misma conexión hasta `Dispose()` de la transacción (error *SqlTransaction se completó*).
- Smoke local exige alineación vista `vsVisitasGeneradas` con DB-001 y datos mínimos (`TipoIdentificacion`, `CasaOcupantes`).

## Decisiones (ADR)

- QR: `RandomNumberGenerator` 16 bytes → hex (128 bits), no GUID corto.
- Validación de vigencia siempre UTC server-side; estados de lista `estadoLista` derivados en servicio.
