# Profile: backend — nesgoapi (NESGoApiNet)

> Convenciones reales del backend NICE. Fuente: estructura del repo (validar
> contra código al diseñar — `04_tech_csharp` y `02_tech_api_patrones` en
> `.cursor/rules/` son la referencia detallada para el implementador).

## Stack

- Framework: ASP.NET Core 3.1 (C#)
- Repo: `D:\ProyNet\NesGoApi\NESGoApiNet`
- Tamaño: ~2,496 controllers / ~4,375 clases — **siempre buscar el controller
  existente antes de proponer uno nuevo.**

## Estructura y routing

- Routing: `[módulo]/[controller]` — ej. `GET /Sales/Order`, `POST /Customer/Customer/{ID}`
- Un controller por entidad en `Controllers/[Módulo]/` + clase modelo en `Clases/[Módulo]/`
- Módulos principales (por tamaño): Sales, WMS, Customer, Marketing, Event,
  Differential, Item, BusinessStrategy, PromotionEngine, Security, GoalProgram,
  Common, Coupons, Shopify, … (41 módulos)

## Flujo de request (patrón obligatorio)

```
HTTP Request → Controller → clHTTPHeader (headers) → clApiRequest (validación)
→ clAuthorization (JWT) → SqlCnxLibrary.executeQuery() → clApiResponse (JSON)
```

- Headers requeridos: `WindowName`, `Parameters` (JSON), `Environment` (int),
  `UserID`, `Authorization` (JWT).
- Acceso a datos: **siempre vía `SqlCnxLibrary.dll`** (propietaria) invocando
  SPs — el endpoint no escribe SQL inline. El contrato con `database:*` es el SP.

## Respuesta estándar (clApiResponse)

```json
{ "success": bool, "date": datetime, "records": int, "recordsError": int,
  "message": string, "messageDev": string, "executionTime": string, "data": dynamic }
```

## Ambientes (publish profiles)

Desarrollo · Facturacion · TEST · NESGO API POS PROD · NESGO API PROD ·
Pro_RESPALDO. El `Environment` del header sigue la convención 666=TEST / 1=PROD.

## Qué debe especificar design.md para este target

- Endpoint: módulo, controller, action, verbo, ruta.
- `Parameters` de entrada (JSON) y forma de `data` en la respuesta.
- SP de `database:*` que consume (el contrato real vive del lado SQL).
- Si el controller/clase ya existe → acción (modificar) y qué método.
- Plan de pruebas: xUnit + archivo `.http` (`api-tester`).

## Reutilización / Escalera de decisión (.NET — aterriza methodology.md regla 6)

> No redefine la escalera; aterriza sus peldaños 2-4 al stack. El orden y la
> definición viven en `methodology.md` (regla 6).

- **Peldaño 2 (nativo/plataforma):** ¿lo da una feature del framework
  (ASP.NET Core / EF) o una integración YA disponible en el repo — Shopify,
  Salesforce, Firebase/Firestore, Stripe, Azure Blob, Google Cloud Storage,
  SSH? No proponer clientes nuevos para estos servicios.
- **Peldaño 3 (reuso):** buscar primero en `Controllers/[Módulo]/` — con ~2,496
  controllers casi siempre existe uno que ya cubre la entidad; reusar DTO/clase
  modelo en `Clases/[Módulo]/`. El acceso a datos siempre vía `SqlCnxLibrary`
  invocando un SP existente (no SQL inline). Para ver de un vistazo qué
  endpoints ya llaman a un SP/tabla dado (en vez de grepear controller por
  controller): `python sdd-toolkit/tools/code_graph.py --query "<esquema.objeto>"`
  (grafo `endpoint → SP`/`endpoint → tabla`; ver "Learnings" para su cobertura
  y límites conocidos). Para el inverso — quién llama a este objeto antes de
  modificarlo: `python sdd-toolkit/tools/impact_graph.py --object "<esquema.objeto>" --format md`
  (callers directos, endpoints expuestos, riesgo de regresión).
- **Peldaño 4 (cambio mínimo):** si el controller/clase ya existe → modificar el
  método puntual (declarar cuál), no crear un controller nuevo.
- **Peldaño 5:** controller/action/DTO nuevo solo si fallaron 1-4, siguiendo el
  routing, el flujo de request y la respuesta estándar de este profile.

## Pitfalls comunes (ASP.NET Core 3.1 — NESGoApiNet)

- **Controller nuevo sin buscar el existente:** con ~2,496 controllers el peldaño 3 casi siempre aplica. Correr `search_objects` o grep en repo antes de proponer `crear`.
- **SQL inline en el controller:** el contrato es siempre `SqlCnxLibrary.dll` → SP. SQL directo en controller viola el patrón obligatorio.
- **Respuesta sin `clApiResponse`:** todo endpoint responde con el wrapper estándar. No inventar formato propio.
- **`Environment` hardcodeado:** no hardcodear `666` ni `1` — el controller lo recibe del header y lo pasa al SP.
- **Headers faltantes en el `.http` de prueba:** `WindowName`, `Parameters`, `Environment`, `UserID`, `Authorization` son todos requeridos para que `SqlCnxLibrary` ejecute.
- **Modificar controller con tests sin actualizar el `.http`:** rompe `api-tester`. Siempre sincronizar el `.http` con cambios al contrato.

## Build order default (ASP.NET Core 3.1 — NESGoApiNet)

| # | Paso | Entregable | Dependencia |
|---|------|-----------|-------------|
| 1 | Confirmar SP de database consumido (firma exacta con MCP) | Firma del SP verificada | SPs de database listos |
| 2 | Buscar controller/clase existente (`search_objects` o grep) | Controller encontrado o declarado nuevo | 1 |
| 3 | Crear/modificar clase modelo en `Clases/[Módulo]/` | Clase con request/response tipado | 2 |
| 4 | Crear/modificar controller en `Controllers/[Módulo]/` | Endpoint compilado | 3 |
| 5 | Conectar con `SqlCnxLibrary.executeQuery()` pasando parámetros al SP | Llamada al SP verificada | 3–4 |
| 6 | Crear/actualizar archivo `.http` de prueba | Archivo `.http` con todos los headers | 4 |
| 7 | Ejecutar prueba (api-tester o `.http`) | Respuesta 200 con `success: true` | 5–6 |

## Learnings (acumulado)

> Append automático en Cierre ARCHIVADO (CLAUDE.md — Compound Loop).
> No editar manualmente; solo Claude escribe aquí al cerrar un TKT.

| TKT | Fecha cierre | Aprendizaje |
|-----|-------------|-------------|

## Decisiones (ADR)

> Append automático en Cierre ARCHIVADO (CLAUDE.md — Compound Loop).
> No editar manualmente; solo Claude escribe aquí al cerrar un TKT.