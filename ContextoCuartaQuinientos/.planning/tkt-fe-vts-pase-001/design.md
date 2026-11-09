[← spec](spec.md) | [← index](_index.md)

# design.md — FE-VTS-PASE-001

## Estrategia

Nuevo **`ICuartaVisitasGeneradasService`** (Dapper sobre `vts.VisitasGeneradas` + `vsVisitasGeneradas`), controller JWT bajo `VTS/VisitasGeneradas` con rutas Cuarta (sin tocar legacy GET con headers). FE: páginas residente + guardia; librería QR **`qrcode`** (npm) generando PNG/SVG del `CodigoQR`.

Referencia funcional: `Web_diseño/Web/Services/GraphApiBackendService.cs` (`SavePaseQrAsync`, `GetPaseQrByCodeAsync`).

### Escalera de decisión

| Capacidad | Peldaño | Objeto | Por qué |
|-----------|---------|--------|---------|
| CRUD pase | 5 | `CuartaVisitasGeneradasService` | Legacy requiere headers; reglas negocio nuevas |
| Validación QR | 4 | Método en mismo servicio | Reuso tabla + UQ CodigoQR |
| WhatsApp share | 2 | URL `wa.me` en FE | Nativo web |
| Imagen QR | 3 | lib `qrcode` | Estándar ecosystem |

## database:CuartaQuinientos

| Objeto | Acción | Notas |
|--------|--------|-------|
| `vts.VisitasGeneradas` | reutilizar | Sin ALTER salvo índice `(UsuarioVisitadoID, FechaExpira)` opcional performance |
| `vts.LogUsoVisitas` | reutilizar | Insert al validar `(asumido)` |

## backend:cuartaquinientos-api

| Endpoint | Verbo | Auth | Response |
|----------|-------|------|----------|
| `/VTS/VisitasGeneradas/mias` | GET | Residente | Lista pases del `sub` |
| `/VTS/VisitasGeneradas` | POST | Residente | 201 + DTO con `codigoQR`, fechas |
| `/VTS/VisitasGeneradas/validar` | POST | Guardia/Admin | `{ estado: Valido|Expirado|Usado|NoEncontrado, detalle?, pase? }` |
| `/VTS/VisitasGeneradas/{id}/usar` | POST | Guardia/Admin | Marca `bUsado=1` idempotente |

Generación `CodigoQR`: `Convert.ToHexString(RandomNumberGenerator.GetBytes(16))` o GUID sin guiones.

Validación server-side:

```
Valido   = exists AND bUsado=0 AND FechaExpira >= SYSUTCDATETIME() AND bEliminado=0
Expirado = exists AND FechaExpira < now AND bUsado=0
Usado    = exists AND bUsado=1
```

Policy: `[Authorize(Roles = "Guardia,Administrador")]` en validar/usar.

## frontend:cuartaquinientos-web

| Componente | Ruta | Notas |
|------------|------|-------|
| `MisPasesVisitaPage.tsx` | `/visitas/pases` | Form + lista |
| `PaseQrCard.tsx` | — | QR + WhatsApp + copy |
| `ValidarPasePage.tsx` | `/guardia/validar-pase` | `residentOnly: false`, roles guardia |
| `visitasPaseSchemas.ts` | Zod | nombre, fechas, modo día/horas |

WhatsApp:

```ts
const text = encodeURIComponent(`Pase visita ${codigoQR}\nVálido hasta ${fechaExpira}`)
window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener')
```

Nav: `appNavigation.ts` — Visitas → pases; guardia menu.

Dependencia npm: `qrcode` + `@types/qrcode` (dev).

## Contenido configurable

| # | Contenido | Clase | Fuente |
|---|-----------|-------|--------|
| 1 | Mensajes validación (Válido/Expirado/…) | Catálogo back | códigos `PASE_VALIDO`, `PASE_EXPIRADO`, … |
| 2 | Texto share WhatsApp | Plantilla con `{CodigoQR}` `{FechaExpira}` | parámetro o catálogo |

## Orden de implementación

| # | Entregable | Dep | Estado |
|---|------------|-----|--------|
| 1 | Service + repo + unit tests | — | ✓ Hecho |
| 2 | Controller + policies | 1 | ✓ Hecho |
| 3 | FE mis pases + QR | 2 | ✓ Hecho |
| 4 | FE validar guardia | 2 | ✓ Hecho |
| 5 | Vitest + smoke manual | 3–4 | ✓ Hecho |

## Plan de pruebas

| ID | Capa | Caso | Expected |
|----|------|------|----------|
| TC-VTS-P-1 | xUnit | POST pase | 201, QR único |
| TC-VTS-P-2 | xUnit | Validar vigente | Valido |
| TC-VTS-P-3 | xUnit | Validar usado | Usado |
| TC-VTS-P-4 | xUnit | Residente no ve ajenos | GET mias filtrado |
| TC-VTS-P-5 | Vitest | WhatsApp href | contiene codigoQR |

## Pasada adversarial

| Punto | Respuesta |
|-------|-----------|
| Reusar GraphQL | Prohibido en SPA |
| ReportEngine PDF | Should S-2 fuera de Must |
| Guardia sin rol | 403 en validar |

**Veredicto:** APROBADO → revisión → **LISTO PARA EJECUTAR**.
