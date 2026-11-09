# Impl: tkt-fe-vts-pase-001-vts-pase-qr

> [← index](_index.md) | [← design](design.md) | Siguiente: [delta →](delta.md)

## Ajustes durante implementación

- [2026-10-28] Legacy REST create/patch/delete movidos a rutas `*/legacy` para liberar `POST /VTS/VisitasGeneradas` al flujo JWT Cuarta. GET legacy conserva ruta raíz + alias `legacy`.
- [2026-10-28] Política `AdminOGuardia` registrada en DI (antes referenciada solo en Automóviles).
- [2026-10-28] Nav `guardiaOnly` para perfil Guardia; admin accede a validar vía ruta duplicada en `AdminRoute`.

## Implementación realizada

- Servicio/repositorio `CuartaVisitasGeneradas*` (Dapper, QR 128-bit hex, casa vía `CasaOcupantes`, marcar usado con `WHERE bUsado=0`).
- Endpoints JWT: `GET mias`, `POST`, `POST validar`, `POST {id}/usar`.
- FE: `/visitas/pases`, `/guardia/validar-pase`, `PaseQrCard` + `qrcode`, WhatsApp + copiar portapapeles.

## Archivos modificados

**GraphApi:** `Controllers/VTS/VisitasGeneradas/VisitasGeneradasController.cs`, `Infrastructure/Extensions/ServiceCollectionExtensions.cs`, modelos/servicios/repos `CuartaVisitasGeneradas*`, `GraphApi.Tests/CuartaVisitasGeneradasServiceTests.cs`

**Web:** `App.tsx`, `appNavigation.ts`, `GuardiaRoute.tsx`, páginas/hooks/schemas visitas pase, `package.json`

## Auditoría SQL

- Estado: **APROBADO** (sin DDL; Dapper parametrizado; transacción en crear/usar; sin SQL dinámico de input).
- Hallazgos: ninguno bloqueante.
- Correcciones: N/A

## Auditoría general

- Estado: **APROBADO** (patrones Cuarta/JWT, ProblemDetails, políticas guardia).
- Hallazgos: mensajes de validación aún literales en servicio (pendiente catálogo `PASE_*` del design).
- Correcciones: N/A en este ciclo

## Scripts de prueba creados

### T-SQL unitarias
- No aplica (sin SP nuevo; matriz xUnit/Vitest)

### Contrato C# xUnit
- Archivo: `GraphApi.Tests/CuartaVisitasGeneradasServiceTests.cs`
- `dotnet test`: 5/5 OK (`CuartaVisitasGeneradasServiceTests`)

### API `.http`
- Archivo: No generado en este commit
- Endpoints: documentados en design

## Resultado contra criterios de aceptación

- [x] CA-1 Residente crea pase → QR + WhatsApp
- [x] CA-2 Guardia valida vigente / usado tras marcar
- [x] CA-3 Expirado server-side UTC
- [x] CA-4 `GET mias` filtra por `UsuarioVisitadoID=sub`
- [x] CA-5 Sin GraphQL en Web

## Pruebas ejecutadas

- Web: `vitest run` 248 OK, `tsc --noEmit`, `vite build --mode development`
- API: `dotnet test --filter CuartaVisitasGeneradas` → 5 OK

## Verificación final

### Criterios de aceptación

- [x] CA-1 … CA-5 (Must) — cubiertos en código + tests unitarios
- [ ] S-2 descarga PNG QR — no implementado (Should; no bloquea Must)

### Pruebas T-SQL (tester-sql)

- No aplica (sin SP/vista nueva)

### Pruebas contrato C# xUnit

- `CuartaVisitasGeneradasServiceTests`: **5/5 PASS**
- `<REPO_SQL>.Tests`: No aplica

### Pruebas API

- Archivo: [FE-VTS-PASE-001_api_tests.http](FE-VTS-PASE-001_api_tests.http)
- Endpoints probados: `GET mias`, `POST` crear, `POST validar`, `POST {id}/usar`, negativo `NoEncontrado`, 403 residente (en `.http`)
- Resultado: **PASS** (smoke PowerShell 2026-10-28 tras fix tx + vista `vsVisitasGeneradas`)

### Revisión 2026-10-28 (4) — cierre

- Corrección revisión: `CuartaVisitasGeneradasService` leía tras `Commit()` con `SqlTransaction` aún activo → 400; `vsVisitasGeneradas` alineada a columnas DB-001 (`Nombre`, `Correo`, `Direccion`, `Numero`) en `SQL/cuartaquinientos_schema.sql` + BD local.
- Smoke: `Valido` → `Usar` → `Usado`; `NoEncontrado` OK; `GET mias` OK.
- `TKT-FE-VTS-PASE-001-APIS.md` generado con JSON real.
- Sello VERDE/revisar: **N/A** (sin objetos T-SQL nuevos).

### QA Checklist

- [x] Happy path (crear → validar → usar) en diseño/código
- [x] Caso negativo (nombre vacío, código inexistente, 403 residente en validar) en tests o `.http`
- [x] Expirado server-side UTC (`ResolverEstadoValidacion` + `UsarAsync` 409)
- [x] Aislamiento `GET mias` por `UsuarioVisitadoID`
- [x] Smoke HTTP runtime con JWT real
- [ ] Mutation Stryker — N/A justificado (servicio cubierto por mocks; sin lógica financiera)

### Auditorías verificadas

- auditor-sql: **APROBADO** (Dapper parametrizado, sin DDL)
- auditor-codigo: **APROBADO** (patrón Cuarta/JWT; pendiente catálogo textos `PASE_*`)
- auditor-flutter: No aplica
- auditor-seguridad: **APROBADO** (JWT, `AdminOGuardia`, QR 128-bit, `WHERE bUsado=0`)

### Desviaciones detectadas

- Legacy REST write movido a `*/legacy` (documentado en ajustes).
- Mensajes de validación aún literales en C# (design pide catálogo).
- Vista `vsVisitasGeneradas` en schema global corregida (DB-001); aplicar script en BDs desactualizadas.

### Pendientes

- Desplegar vista `vts.vsVisitasGeneradas` corregida en entornos que aún tengan columnas legacy en la definición.
- S-2: botón descargar PNG (opcional).
- Catálogo mensajes `PASE_*` en backend (Should design).
