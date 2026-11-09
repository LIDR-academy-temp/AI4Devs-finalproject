# Entrega 3 — ejecutar gates TDD (API unit + Web Vitest)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host '=== Web Vitest (incl. entrega3ModulosTdd) ===' -ForegroundColor Cyan
Push-Location (Join-Path $root 'Web')
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
npm exec vitest run
$vitestExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap
if ($vitestExit -ne 0) { Pop-Location; exit $vitestExit }
Pop-Location

Write-Host '=== API xUnit (unit, sin Smoke ni integracion HTTP+SQL) ===' -ForegroundColor Cyan
Push-Location (Join-Path $root 'GraphApi')
dotnet test --filter "Category!=Smoke&FullyQualifiedName!~Authorization&FullyQualifiedName!~AuthServiceController&FullyQualifiedName!~SetupDiagnostics&FullyQualifiedName!~ReservacionesAdminEndpoint"
$apiExit = $LASTEXITCODE
Pop-Location
if ($apiExit -ne 0) { exit $apiExit }

Write-Host '=== OK - Matriz: ContextoCuartaQuinientos/MATRIZ_TDD_ENTREGA3.md ===' -ForegroundColor Green
