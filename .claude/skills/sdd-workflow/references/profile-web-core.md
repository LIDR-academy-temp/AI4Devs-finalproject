# Profile: web-core — ShopifyLogin (ASP.NET Core 8 / Razor Pages)

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | ASP.NET Core 8 / .NET 8 |
| Lenguaje | C# |
| UI | Razor Pages (`Pages/`) + Controllers (`Controllers/`) |
| OIDC server | OpenIddict 7.2 |
| HTTP client | `clApiRequest` (wrapper interno → NesgoAPI) |
| Serialización | Newtonsoft.Json 13.0 |
| Autenticación | Cookie + OpenIddict + `ISession` (ver sección Auth) |
| Session helpers | `clSessionIdentityHelper`, `clSessionCultureHelper`, `clSessionCatalogsHelper` |
| ORM | EF Core 8 + SQLite (`ShopifyLogin.db`) |
| i18n | JSON en `Translations/{Page}/{Handler}/HandlerPage_{lang}-{country}.json` |

## Arquitectura

```
ShopifyLogin/
├── Controllers/
│   └── AuthorizationController.cs    ← endpoints OIDC (/connect/authorize, /token, /userinfo, /endsession)
├── Pages/Account/                    ← Login, Register, ForgotPassword (Razor Pages)
├── Pages/Shared/                     ← Layouts MX/US, partials
├── Helpers/
│   ├── Generales/                    ← clApiRequest, clApiResponse, clTools
│   └── Sessions/                     ← clIdentityHelper, clCultureHelper, clCatalogsHelper
├── Data/ApplicationDbContext.cs      ← DbContext (OpenIddict: applications, tokens)
├── Translations/                     ← JSON i18n por página e idioma
└── Program.cs                        ← DI, OpenIddict seed, middleware pipeline
```

Flujo Razor Pages: `PageModel → clApiRequest → NesgoAPI → Razor View`
Flujo OIDC: `AuthorizationController → OpenIddict → Shopify`

## Patrón HTTP client — `clApiRequest`

```csharp
// Prod: https://nesgoposapi.azurewebsites.net/  |  Test: https://nesgoapitest.niceonline.com/
var response = await _apiRequest.ExecuteAsync(
    "Customer/CustomerWebLoginShopify",
    Method.Post,
    body);

if (response.Success)
    // usar response.Data
```

> Base URL de NesgoAPI: configurada en `appsettings.json` — no hardcoded en código.

## Auth

```csharp
// En PageModel: verificar identidad vía wrapper de sesión
var identity = _sessionIdentityHelper.GetIdentity(HttpContext);
if (identity == null)
    return RedirectToPage("/Account/Login");
```

Niveles de identidad: `mx` (es-MX) y `us` (en-US / es-US) — resueltos por `clTools.ValidateIdentity(sIdentity)`.

## `clTools` — helpers disponibles

| Método | Uso |
|--------|-----|
| `ValidateIdentity(sIdentity)` | Valida y redirige según identidad MX/US |
| `GetDictionary(key, controller)` | Carga traducción desde `Translations/` JSON |

> Agregar métodos al descubrirlos en requerimientos futuros.

## Environments

| Env | Descripción | URL |
|-----|-------------|-----|
| `1` (prod) | `shopifylogin.niceonline.com` | Producción |
| `666` (test) | `shopifylogintest.niceonline.com` | Test / desarrollo |

Selección en `appsettings.json` → `appsettings.Development.json` fuerza `666`.

## Convenciones

- PageModel: handlers siempre `async Task<IActionResult>`.
- Formularios: `[BindProperty]` en propiedad del PageModel — no parámetros sueltos.
- Sin `ViewBag` — datos al Razor vía propiedades públicas del PageModel.
- Logging: `ILogger<T>` por inyección.
- Secretos (certificados X.509): `C:\certs\` en servidor — nunca en código fuente.
- EF Core: cambios de schema solo vía migraciones (`dotnet ef migrations add`).
- Prohibido `dynamic` como tipo de retorno en métodos públicos.

## Qué debe especificar design.md para este target

- Páginas/handlers: nombre `.cshtml`, handler (OnGet/OnPost), parámetros de ruta.
- Controllers OIDC: acción, método HTTP, parámetros.
- Endpoints NesgoAPI a consumir: `Dominio/Endpoint` + body + campos de respuesta.
- Auth requerido: sí/no + identidad (mx/us).
- EF Core: si hay cambio de schema, listar migración y tablas afectadas.
- Peldaño de escalera: 3 reuso / 4 modif / 5 nuevo por acción.

## Verificación antes de entregar

```
dotnet build
```

Build sin errores — obligatorio antes de marcar como Listo.

## Learnings (acumulado)

<!-- tools.compound_loop agrega aquí -->

## Decisiones (ADR)

<!-- tools.compound_loop agrega aquí -->
