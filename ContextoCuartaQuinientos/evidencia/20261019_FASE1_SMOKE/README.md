# Evidencia smoke Fase 1

Regresión y respaldo del MVP (24 tickets ARCHIVADO). **No** es suite TDD de un ticket nuevo.

## Ejecutar y generar respaldo

```powershell
cd d:\LIDR\ProyectoFinal\feature-entrega-1-AFS
.\scripts\Invoke-Fase1Smoke.ps1
```

Salida: `resultado.md`, `dotnet-smoke.log`, `npm-test.log`.

## Solo API smoke

API en `http://localhost:5180` (o `FASE1_SMOKE_BASE_URL`). Contraseña local: archivo `fase1-smoke.env` (gitignored; plantilla `fase1-smoke.env.example`). El script `Invoke-Fase1Smoke.ps1` lo carga automáticamente.

```powershell
$env:DOTNET_ROLL_FORWARD='Major'
$env:FASE1_SMOKE_BASE_URL='http://localhost:5180'
dotnet test GraphApi\GraphApi.Tests --filter "Category=Smoke" --no-build
```

## Manual

- Matriz: [matriz.md](matriz.md)
- REST: [FASE1_SmokeApi.http](FASE1_SmokeApi.http) (API en `:5180`)

## Fase 2

Para E2E con TDD formal: `/definir` ticket (p. ej. `SETUP-SMOKE` o primer dominio Fase 2) → `/test` en rojo → `/ejecutar`.
