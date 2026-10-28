# WebRazorSample (.NET 8, Razor Pages)

Proyecto base de página web en C# con ASP.NET Core Razor Pages.

## Requisitos
- .NET SDK 8.0 o superior: https://dotnet.microsoft.com/en-us/download

## Cómo ejecutar
```bash
cd WebRazorSample
dotnet restore
dotnet run
```
La app quedará disponible en `https://localhost:5001` o `http://localhost:5000` (según tu entorno).

## Estructura
- `Program.cs`: configuración mínima.
- `Pages/`: Razor Pages (Index y Privacy de ejemplo).
- `Pages/Shared/_Layout.cshtml`: layout base.
- `wwwroot/css/site.css`: estilos simples.
