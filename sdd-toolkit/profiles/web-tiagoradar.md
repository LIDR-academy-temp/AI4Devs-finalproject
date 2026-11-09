# Profile: frontend — TiagoRadar (ASP.NET Core MVC / Razor)

> Convenciones reales del proyecto **frontend** `TiagoRadar` (repo raíz
> `C:\Users\DESARROLLO\Downloads\Proyectos\TiagoRadar`, csproj en
> `TiagoRadar/TiagoRadar/`). Este proyecto **nunca** habla con SQL Server ni
> abre `SqlConnection` — es un consumidor HTTP de `TiagoRadarAPI` (backend,
> proyecto .NET separado, aún no scaffoldeado). Ver `docs/PLAN-MIGRACION.md`
> enmienda 2026-08-13 (arquitectura de dos proyectos).

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | ASP.NET Core 10 (MVC, Razor `.cshtml`, no Razor Pages) |
| Lenguaje | C# |
| UI | Bootstrap 5.x (una sola versión) + jQuery |
| CSS | `wwwroot/css/aither.css` — tokens `--aither-*` (fuente: `legacy/index.html` L347-397, no editar el legacy) |
| HTTP client hacia backend | por definir cuando exista `TiagoRadarAPI` (typed client vía `IHttpClientFactory`) — **hoy no existe ninguna llamada real**, todo TKT sin backend disponible usa stubs en JS |
| Estado entre pantallas | `localStorage` (paridad legacy: `tiago_dept`, token de tableta) — no `Session` server-side todavía, no query string para decisiones de ruteo |

## Arquitectura

```
TiagoRadar/TiagoRadar/
├── Controllers/        ← un método por vista, sin lógica de negocio ("return View();")
├── Views/{Dominio}/    ← Index.cshtml etc., markup + Bootstrap 5
├── Views/Shared/       ← _Layout.cshtml (navbar AITHER, tokens cargados)
├── wwwroot/css/        ← aither.css (tokens + extensiones de layout)
├── wwwroot/js/         ← toda la interactividad y navegación (ver regla abajo)
└── wwwroot/lib/        ← Bootstrap 5, jQuery vendorizados
```

## Regla de Controllers — sin lógica de servidor (vigente mientras no exista `TiagoRadarAPI`)

Mientras `TiagoRadarAPI` no exista, ningún Controller de `TiagoRadar` decide nada:
sin `if`, sin leer `Request.Query`, sin parámetros de ruta que cambien el
comportamiento. Cada acción es literalmente `public IActionResult Index() =>
View();`. Toda decisión (ruteo condicional, validaciones, qué mostrar) vive en
`wwwroot/js/*`, usando `localStorage` para el estado que debe sobrevivir entre
cargas de página. Cuando `TiagoRadarAPI` exista, esta regla se **relaja**: el
Controller podrá llamar al cliente HTTP tipado y pasar el resultado a la
vista — pero seguirá sin SQL, sin `SqlConnection`, sin lógica de negocio de
datos (eso vive en `TiagoRadarAPI`).

## Convenciones

- Sin `ViewBag` — si un Controller necesita pasar datos (una vez que haya
  backend), usar un ViewModel tipado.
- JS: un archivo por pantalla/dominio en `wwwroot/js/` (`dept.js`,
  `account.js`, `device-enroll.js`), más un `shell-nav.js` compartido para
  navegación común (cambiar departamento, logout).
- Nunca loggear PIN, código de activación, ni el valor completo del token de
  tableta (ni en `console.log` ni en Network).
- `localStorage`, no `sessionStorage`, para todo lo que en el legacy ya usa
  `localStorage` (paridad exacta — ver `docs/PLAN-MIGRACION.md` §2 Offline).
- Bootstrap: una sola versión 5.x en todo el proyecto — cero clases/asset de
  Bootstrap 4.

## Qué debe especificar design.md para este target

- Vista: nombre `.cshtml`, Controller/acción que la sirve (hoy siempre
  `return View()` sin parámetros).
- JS: archivo, función, y qué estado de `localStorage` lee/escribe.
- Si el requerimiento SÍ tiene `TiagoRadarAPI` disponible: endpoint consumido
  (`Dominio/Endpoint`), verbo, forma de la respuesta, y el Controller pasa a
  tener lógica mínima de orquestación (seguir marcando el peldaño de la
  escalera igual que cualquier otro cambio).
- Peldaño de escalera: 3 reuso / 4 modif / 5 nuevo por acción/archivo JS.

## Verificación antes de entregar

```
dotnet build
```

Build sin errores — obligatorio antes de marcar como Listo. Sin backend
disponible, no hay prueba de integración real — el plan de pruebas es
funcional/manual en el navegador (DevTools: Console, Network, Application).

## Learnings (acumulado)

<!-- tools.compound_loop agrega aquí -->

## Decisiones (ADR)

<!-- tools.compound_loop agrega aquí -->
