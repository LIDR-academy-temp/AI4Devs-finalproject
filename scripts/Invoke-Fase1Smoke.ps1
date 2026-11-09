# Smoke Fase 1 - API (integracion) + Web (Vitest). Genera respaldo en evidencia/.
param(
    [string]$EvidenciaDir = (Join-Path $PSScriptRoot "..\ContextoCuartaQuinientos\evidencia\20261019_FASE1_SMOKE"),
    [string]$ApiBaseUrl = "http://localhost:5180"
)

$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$hostName = $env:COMPUTERNAME

New-Item -ItemType Directory -Force -Path $EvidenciaDir | Out-Null

$envFile = Join-Path $EvidenciaDir 'fase1-smoke.env'
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "Env:$name" -Value $value
        }
    }
}

$lines = @(
    '# Fase 1 - Ejecucion smoke',
    "",
    "| Campo | Valor |",
    "|-------|-------|",
    "| Fecha | $stamp |",
    "| Equipo | $hostName |",
    "| Repo | $repoRoot |",
    ""
)

# BD
$dbOk = $false
try {
    $r = sqlcmd -S localhost -E -d CuartaQuinientos -Q "SET NOCOUNT ON; SELECT 1" -h -1 2>$null
    $dbOk = ($LASTEXITCODE -eq 0)
} catch {
    $dbOk = $false
}

$lines += '## Precondicion BD'
$lines += if ($dbOk) { "- CuartaQuinientos en localhost: **OK**" } else { "- CuartaQuinientos en localhost: **NO** (smoke API in-process puede omitirse)" }
$lines += ""

# API en :5180 si no está arriba
$apiProc = $null
try {
    $null = Invoke-WebRequest -Uri "$ApiBaseUrl/health" -UseBasicParsing -TimeoutSec 2
} catch {
    $lines += "- Arrancando API temporal en $ApiBaseUrl ..."
    $apiProc = Start-Process -FilePath "dotnet" -ArgumentList @(
        "run", "--project", (Join-Path $repoRoot "GraphApi\GraphApi.csproj"),
        "--urls", $ApiBaseUrl
    ) -WorkingDirectory $repoRoot -PassThru -WindowStyle Hidden
    $env:DOTNET_ROLL_FORWARD = 'Major'
    Start-Sleep -Seconds 12
}

$lines += '## API - dotnet test (Category=Smoke; requiere API HTTP)'
$testLog = Join-Path $EvidenciaDir "dotnet-smoke.log"
Push-Location (Join-Path $repoRoot "GraphApi\GraphApi.Tests")
$env:DOTNET_ROLL_FORWARD = 'Major'
$env:FASE1_SMOKE_BASE_URL = $ApiBaseUrl
dotnet test --filter "Category=Smoke" --no-build 2>&1 | Tee-Object -FilePath $testLog
$apiTestExit = $LASTEXITCODE
Pop-Location
if ($apiProc -and !$apiProc.HasExited) { Stop-Process -Id $apiProc.Id -Force -ErrorAction SilentlyContinue }
$lines += "- Exit code: **$apiTestExit**"
$lines += "- Log: [dotnet-smoke.log](dotnet-smoke.log)"
$lines += ""

# Web unit/regresión
$lines += '## Web - npm test (Vitest)'
$webLog = Join-Path $EvidenciaDir "npm-test.log"
Push-Location (Join-Path $repoRoot "Web")
npm test 2>&1 | Tee-Object -FilePath $webLog
$webExit = $LASTEXITCODE
Pop-Location
$lines += "- Exit code: **$webExit**"
$lines += "- Log: [npm-test.log](npm-test.log)"
$lines += ""

# Opcional: API ya levantada (smoke HTTP externo)
$lines += "## API HTTP opcional ($ApiBaseUrl)"
$httpLines = @()
if ($dbOk) {
    try {
        $health = Invoke-WebRequest -Uri "$ApiBaseUrl/health" -UseBasicParsing -TimeoutSec 5
        $httpLines += "- GET /health -> $($health.StatusCode)"
    } catch {
        $httpLines += '- GET /health -> no disponible'
    }
} else {
    $httpLines += "- Omitido (sin BD)"
}
$lines += $httpLines
$lines += ""

$verdict = if ($apiTestExit -eq 0 -and $webExit -eq 0) { "PASS" } else { "FAIL" }
$lines += "## Veredicto"
$lines += "**$verdict**"
$lines += ""
$lines += 'Matriz: [matriz.md](matriz.md) | REST: [FASE1_SmokeApi.http](FASE1_SmokeApi.http)'

$outMd = Join-Path $EvidenciaDir "resultado.md"
$lines | Set-Content -Path $outMd -Encoding UTF8

Write-Host "Respaldo: $outMd"
if ($verdict -eq "FAIL") { exit 1 }
