# Profile: web-legacy — ASP.NET MVC 5

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | ASP.NET MVC 5 / .NET Framework 4.7.2 |
| Lenguaje | C# |
| Vistas | Razor (.cshtml) |
| HTTP client | `<CLASE_HTTP_MVC>` (wrapper interno → API externa) |
| Serialización | Newtonsoft.Json |
| Autenticación | `Session[]` (ver sección Auth) |

> Dependencias adicionales del proyecto (pagos, PDF, imágenes, RPC, etc.) se documentan
> en **Learnings** al descubrirlas — no se asumen de antemano.

## Arquitectura

```
<PROYECTO_WEB_LEGACY>/
├── Controllers/         ← una clase por dominio de negocio
├── Views/               ← Razor por controller; Shared/ para partials y layout
├── Models/Clases/       ← clases de dominio y DTOs
└── Helpers/             ← <CLASE_TOOLS_MVC>, <CLASE_HTTP_MVC> y helpers compartidos
```

Flujo: `Controller → <CLASE_HTTP_MVC> → API externa → View`

## Patrón HTTP client

```csharp
// Construir body dinámico
dynamic objBody = new ExpandoObject();
objBody.<Campo1> = <valor1>;

// Llamar a la API externa
<CLASE_HTTP_MVC> objRequest = new <CLASE_HTTP_MVC>
{
    Method = "POST",
    Url    = "Dominio/Endpoint",
    Body   = JsonConvert.SerializeObject(objBody)
};
dynamic objResponse = await objRequest.<MetodoAsync>();

// Verificar antes de usar datos
if ((bool)objResponse.success)
    ViewBag.Data = objResponse.data;
```

> Completar `<MetodoAsync>` con el nombre real al descubrirlo (ej: `RequestApiAsync`).
> Anotar en **Learnings** si el patrón difiere del anterior.

## Auth

```csharp
// Al inicio de toda acción que requiere sesión
dynamic obj<Entidad> = Session["<ClaveSession>"];
if (obj<Entidad> == null)
    return RedirectToAction("<AccionLogin>", "<ControllerAuth>", new { <params> });
```

> Completar `<ClaveSession>`, `<AccionLogin>` y `<ControllerAuth>` con los valores reales del proyecto.
> Anotar en **Learnings** si hay múltiples niveles de auth.

## <CLASE_TOOLS_MVC> — helpers disponibles

> Documentar aquí los métodos del helper al descubrirlos durante requerimientos.
> Ejemplo: `ValidateIdentity(sIdentity)`, `GetDictionary(key, controller)`, `LogError(ex)`.

## Convenciones

- Auth guard al inicio de toda acción que expone datos de usuario.
- `<CLASE_HTTP_MVC>` para toda llamada externa — nunca `HttpClient` directo salvo ADR.
- Body: `ExpandoObject` → `JsonConvert.SerializeObject`.
- ViewBag: solo traducciones y flags de UI — datos de dominio en Model.
- Async: toda acción nueva con IO debe ser `async Task<ActionResult>`.
- Prohibido `dynamic` como tipo de retorno en métodos públicos.

## Qué debe especificar design.md para este target

- Controllers/acciones: nombre, método HTTP, parámetros de ruta.
- Endpoints de API a consumir: `Dominio/Endpoint` + body + campos de respuesta.
- Vistas Razor: nombre de archivo, datos requeridos (ViewBag y/o Model).
- Auth requerido: sí/no + nivel (cliente, backoffice, admin).
- Peldaño de escalera: 3 reuso / 4 modif / 5 nuevo por acción.

## Verificación antes de entregar

```
MSBuild <solucion>.sln /p:Configuration=Debug
```

Build sin errores — obligatorio antes de marcar como Listo.

## Learnings (acumulado)

<!-- tools.compound_loop agrega aquí -->

## Decisiones (ADR)

<!-- tools.compound_loop agrega aquí -->
