# Verificación unitaria — abrir-documento-conservando-contexto

Fecha: 2026-10-21. Alcance: MAPI, API y UI con suites aisladas.

## Resultados

| Componente | Comando | Resultado |
|---|---|---|
| MAPI BW | `dotnet test Bccr.Supen.Ves.BW.UnitTests.csproj --no-restore` | 225 correctas |
| MAPI DA | `dotnet test Bccr.Supen.Ves.DA.UnitTests.csproj --no-restore` | 173 correctas |
| MAPI controladores | `dotnet test Bccr.Supen.Ves.MAPI.UnitTests.csproj --no-restore` | 150 correctas |
| API controladores | `dotnet test Bccr.Supen.Ves.Api.UnitTests.csproj --no-restore` | 196 correctas |
| API SG | `dotnet test Bccr.Supen.Ves.SG.UnitTests.csproj --no-restore` | 224 correctas |
| UI | `npx vitest run` | 19 archivos, 91 pruebas correctas |
| UI lint (archivos del cambio) | `npx eslint src/Documentacion src/Constantes.js src/infraestructura/sesionLocal.js` | sin hallazgos |
| UI build | `npm run build:local` | correcto |

`npm run lint` global informa 1 error y 12 advertencias en archivos que este
cambio no toca.
`Bccr.Supen.Ves.Api.IntegrationTests` no restaura el paquete
`Bccr.Pruebas.PruebasDeIntegracion` (NU1101, origen privado); no se ejecutó.

## Estado de base de datos

N/A - suites aisladas; no se tocó SQL Server real. El contrato de
`ObtenerDocumento` y `BajarArchivo` (incluido el nombre de la columna
`Documento`) sigue sin verificarse contra la BD.

## Pendiente

Pruebas con curl (6.3) y E2E con Playwright (6.4): requieren MAPI, API y
SQL Server en ejecución. Tampoco se verificó cómo el request handler informa
un 404 de MAPI al SG.
