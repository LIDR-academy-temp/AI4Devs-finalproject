# Smoke E2E Playwright (E2E_SMOKE=1). Carga credenciales desde fase1-smoke.env (gitignored).
param(
    [ValidateSet('Local', 'Prod')]
    [string]$Target = 'Prod',
    [string]$EvidenciaDir = (Join-Path $PSScriptRoot '..\ContextoCuartaQuinientos\evidencia\20261019_FASE1_SMOKE'),
    [switch]$PreflightApi
)

$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')

# UTF-8 con BOM (PS 5.1 no admite Out-File -Encoding utf8BOM)
$script:LogUtf8 = New-Object System.Text.UTF8Encoding $true
function Write-E2ELogLine {
    param([string]$Path, [string]$Text, [switch]$Append)
    if ($Append -and (Test-Path -LiteralPath $Path)) {
        [System.IO.File]::AppendAllText($Path, $Text, $script:LogUtf8)
    } else {
        [System.IO.File]::WriteAllText($Path, $Text, $script:LogUtf8)
    }
}
function Add-E2ELogCommandOutput {
    param([string]$Path, [string[]]$SpecFiles)
    $npmArgs = @('run', 'test:e2e', '--') + $SpecFiles
    $out = & npm @npmArgs 2>&1 | Out-String
    [System.IO.File]::AppendAllText($Path, $out, $script:LogUtf8)
    return $LASTEXITCODE
}

try {
    chcp 65001 | Out-Null
    [Console]::OutputEncoding = $script:LogUtf8
} catch {
    # ignore
}

$envFile = Join-Path $EvidenciaDir 'fase1-smoke.env'
if (-not (Test-Path $envFile)) {
    Write-Error "Falta $envFile. Copia fase1-smoke.env.example y define FASE1_SMOKE_CORREO y FASE1_SMOKE_PASSWORD."
}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        Set-Item -Path "Env:$($matches[1].Trim())" -Value $matches[2].Trim()
    }
}

if (-not $env:FASE1_SMOKE_PASSWORD) {
    Write-Error 'FASE1_SMOKE_PASSWORD vacio en fase1-smoke.env'
}

$apiBase = if ($Target -eq 'Prod') { 'https://apicuartaquinientos.runasp.net' } else { 'http://localhost:5180' }
if ($PreflightApi) {
    $loginBody = @{ correo = $env:FASE1_SMOKE_CORREO; password = $env:FASE1_SMOKE_PASSWORD } | ConvertTo-Json
    try {
        $null = Invoke-WebRequest -Uri "$apiBase/SGR/AuthService/GenerateToken" -Method POST -ContentType 'application/json' -Body $loginBody -UseBasicParsing
        Write-Host "Preflight login API OK ($apiBase, $($env:FASE1_SMOKE_CORREO))" -ForegroundColor Green
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Error "Preflight login fallo HTTP $code en $apiBase para $($env:FASE1_SMOKE_CORREO). Corrige FASE1_SMOKE_PASSWORD en fase1-smoke.env."
    }
} else {
    Write-Host 'Preflight API omitido (ahorra 1 login; API limita 5 GenerateToken/min por IP).' -ForegroundColor DarkGray
}

$env:E2E_SMOKE = '1'
$env:E2E_ADMIN_CORREO = if ($env:FASE1_SMOKE_CORREO) { $env:FASE1_SMOKE_CORREO } else { 'admin@local' }
$env:E2E_ADMIN_PASSWORD = $env:FASE1_SMOKE_PASSWORD
if (-not $env:E2E_RESIDENT_CORREO) {
    $env:E2E_RESIDENT_CORREO = 'a@cq500.local'
}
if (-not $env:E2E_RESIDENT_PASSWORD) {
    $env:E2E_RESIDENT_PASSWORD = $env:FASE1_SMOKE_PASSWORD
}
if ($env:E2E_RESIDENT_CORREO -eq 'residente@local') {
    Write-Warning 'E2E_RESIDENT_CORREO=residente@local no existe en prod (db24572). Usa a@cq500.local u otro residente activo.'
}

if ($Target -eq 'Prod') {
    $env:E2E_BASE_URL = 'https://cuartaquinientosresidencial.runasp.net'
    Write-Host '=== E2E portal PROD (db24572; crea casa/ticket reales) ===' -ForegroundColor Yellow
} else {
    $env:E2E_BASE_URL = 'http://localhost:5173'
    Write-Host '=== E2E local: API :5180 + npm run dev :5173 ===' -ForegroundColor Cyan
}

Push-Location (Join-Path $repoRoot 'Web')
$chromium = Join-Path $env:LOCALAPPDATA 'ms-playwright\chromium_headless_shell-1248\chrome-headless-shell-win64\chrome-headless-shell.exe'
if (-not (Test-Path $chromium)) {
    Write-Host 'Instalando Chromium Playwright...' -ForegroundColor Cyan
    npx playwright install chromium
}
$evidenceRoot = Join-Path $repoRoot 'ContextoCuartaQuinientos\evidencia\20261104_E2E_CRITICO'
New-Item -ItemType Directory -Force -Path $evidenceRoot | Out-Null
$logPath = Join-Path $evidenceRoot 'ultima-ejecucion.log'
Write-Host "Evidencia MD: ContextoCuartaQuinientos/evidencia/20261104_E2E_CRITICO/EVIDENCIA_E2E_ENTREGA3.md" -ForegroundColor Cyan

$phase1 = @(
    'e2e/admin-casas.spec.ts',
    'e2e/crear-ticket.spec.ts',
    'e2e/critico-admin-extra.spec.ts',
    'e2e/critico-residente-extra.spec.ts'
)
$phase2 = @(
    'e2e/estado-cuenta.spec.ts',
    'e2e/extra-bi-reportes.spec.ts',
    'e2e/login-residente.spec.ts'
)

Write-E2ELogLine -Path $logPath -Text ("=== E2E fase 1/2 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===`r`n")
$code1 = Add-E2ELogCommandOutput -Path $logPath -SpecFiles $phase1

Write-Host 'Pausa 65s (API: max 5 login/min por IP)...' -ForegroundColor Yellow
Start-Sleep -Seconds 65

Write-E2ELogLine -Path $logPath -Text ("`r`n=== E2E fase 2/2 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===`r`n") -Append
$code2 = Add-E2ELogCommandOutput -Path $logPath -SpecFiles $phase2

Write-Host "Log: $logPath" -ForegroundColor DarkGray
Get-Content $logPath -Tail 12
Pop-Location

if ($code1 -ne 0 -or $code2 -ne 0) { exit 1 }
exit 0
