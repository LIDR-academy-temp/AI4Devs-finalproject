# Smoke post-deploy: BI-RPT-001 (.http) + NAV-ROOT TC-NAV-08/08b contra API prod/local.
param(
    [ValidateSet('Prod', 'Local')]
    [string]$Target = 'Prod',
    [string]$EvidenciaDir = (Join-Path $PSScriptRoot '..\ContextoCuartaQuinientos\evidencia\20261104_API_SMOKE_POSTDEPLOY')
)

$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$baseUrl = if ($Target -eq 'Prod') { 'https://apicuartaquinientos.runasp.net' } else { 'http://localhost:5180' }

New-Item -ItemType Directory -Force -Path $EvidenciaDir | Out-Null
$envFile = Join-Path $repoRoot 'ContextoCuartaQuinientos\evidencia\20261019_FASE1_SMOKE\fase1-smoke.env'
if (-not (Test-Path $envFile)) { throw "Falta $envFile" }
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        Set-Item -Path "Env:$($matches[1].Trim())" -Value $matches[2].Trim()
    }
}

$adminPass = $env:FASE1_SMOKE_PASSWORD
$residentPass = if ($env:E2E_RESIDENT_PASSWORD) { $env:E2E_RESIDENT_PASSWORD } else { $adminPass }
$residentCorreo = if ($env:E2E_RESIDENT_CORREO) { $env:E2E_RESIDENT_CORREO } else { 'a@cq500.local' }

$results = New-Object System.Collections.Generic.List[string]
function Add-Result($id, $ok, $detail) {
    $mark = if ($ok) { 'PASS' } else { 'FAIL' }
    $line = "[$mark] $id - $detail"
    $results.Add($line) | Out-Null
    Write-Host $line -ForegroundColor $(if ($ok) { 'Green' } else { 'Red' })
}

function Wait-RateLimit { Start-Sleep -Seconds 13 }

function Get-Token($correo, $password) {
    Wait-RateLimit
    $body = @{ correo = $correo; password = $password } | ConvertTo-Json
    try {
        $r = Invoke-RestMethod -Method Post -Uri "$baseUrl/SGR/AuthService/GenerateToken" -ContentType 'application/json' -Body $body
        return @{ Ok = $true; Token = $r.token; Perfil = $r.perfil }
    }
    catch {
        $status = $_.Exception.Response.StatusCode.value__
        return @{ Ok = $false; Token = $null; Perfil = $null; Status = $status; Err = $_.Exception.Message }
    }
}

function Invoke-Api($method, $path, $token, $bodyObj = $null) {
    $headers = @{ Authorization = "Bearer $token" }
    $uri = "$baseUrl$path"
    if ($bodyObj) {
        return Invoke-WebRequest -Method $method -Uri $uri -Headers $headers -ContentType 'application/json' -Body ($bodyObj | ConvertTo-Json) -UseBasicParsing
    }
    return Invoke-WebRequest -Method $method -Uri $uri -Headers $headers -UseBasicParsing
}

function Get-MenuRoutes($token) {
    $r = Invoke-Api 'GET' '/SGR/Navegacion/menus' $token
    $nodes = $r.Content | ConvertFrom-Json
    $routes = New-Object System.Collections.Generic.List[string]
    function Walk($items) {
        foreach ($n in $items) {
            if ($n.ruta) { $routes.Add($n.ruta) | Out-Null }
            if ($n.hijos -and $n.hijos.Count -gt 0) { Walk $n.hijos }
        }
    }
    Walk $nodes
    return $routes
}

Write-Host "=== API smoke post-deploy ($Target) $baseUrl ===" -ForegroundColor Cyan

$logins = @(
    @{ Key = 'admin'; Correo = 'admin@local'; Pass = $adminPass },
    @{ Key = 'residente'; Correo = $residentCorreo; Pass = $residentPass },
    @{ Key = 'guardia'; Correo = 'guardia@local'; Pass = $adminPass },
    @{ Key = 'trabajador'; Correo = 'trabajador@local'; Pass = $adminPass }
)
$tokens = @{}
foreach ($l in $logins) {
    $t = Get-Token $l.Correo $l.Pass
    if (-not $t.Ok) {
        Add-Result "LOGIN-$($l.Key)" $false "HTTP $($t.Status) $($l.Correo)"
        continue
    }
    $tokens[$l.Key] = $t.Token
    Add-Result "LOGIN-$($l.Key)" $true $l.Correo
}

# --- TC-NAV-08 ---
if ($tokens.admin) {
    $routes = Get-MenuRoutes $tokens.admin
    Add-Result 'TC-NAV-08-admin' ($routes -contains '/admin/tickets') "menus admin (/admin/tickets)"
}
if ($tokens.residente) {
    $routes = Get-MenuRoutes $tokens.residente
    $ok = ($routes -contains '/visitas/pases') -and ($routes -contains '/areas-comunes')
    Add-Result 'TC-NAV-08-residente' $ok "visitas/pases + areas-comunes"
}
if ($tokens.guardia) {
    $routes = Get-MenuRoutes $tokens.guardia
    $hasGuardia = $routes -contains '/guardia/validar-pase'
    $noAdmin = -not ($routes | Where-Object { $_ -like '/admin/*' })
    Add-Result 'TC-NAV-08-guardia' ($hasGuardia -and $noAdmin) "validar-pase; sin /admin/*"
}
if ($tokens.trabajador) {
    $routes = Get-MenuRoutes $tokens.trabajador
    $ok = ($routes -contains '/trabajador/tickets') -and -not ($routes -contains '/tickets/nuevo')
    Add-Result 'TC-NAV-08-trabajador' $ok "/trabajador/tickets"
}

# TC-NAV-08b
if ($tokens.trabajador) {
    try {
        $r = Invoke-Api 'GET' '/TKT/Tickets/asignados?terminado=false' $tokens.trabajador
        Add-Result 'TC-NAV-08b-trabajador' ($r.StatusCode -eq 200) "asignados 200"
    }
    catch { Add-Result 'TC-NAV-08b-trabajador' $false $_.Exception.Message }
}
if ($tokens.residente) {
    try {
        Invoke-Api 'GET' '/TKT/Tickets/asignados?terminado=false' $tokens.residente | Out-Null
        Add-Result 'TC-NAV-08b-residente-403' $false 'esperaba 403'
    }
    catch {
        $code = $_.Exception.Response.StatusCode.value__
        Add-Result 'TC-NAV-08b-residente-403' ($code -eq 403) "HTTP $code"
    }
}

# --- BI-RPT-001 ---
if ($tokens.admin) {
    try {
        $r = Invoke-Api 'GET' '/Reports/Reportes/Morosos' $tokens.admin
        Add-Result 'TC-BIRPT-07' ($r.StatusCode -eq 200) 'Morosos 200'
    }
    catch { Add-Result 'TC-BIRPT-07' $false $_.Exception.Message }

    try {
        $r = Invoke-Api 'GET' '/Reports/Bi/tendencias?meses=6' $tokens.admin
        Add-Result 'TC-BIRPT-05' ($r.StatusCode -eq 200) 'tendencias 200'
    }
    catch { Add-Result 'TC-BIRPT-05' $false $_.Exception.Message }

    try {
        $r = Invoke-Api 'GET' '/Reports/Bi/export?meses=6&formato=pdf' $tokens.admin
        Add-Result 'TC-BIRPT-06' ($r.StatusCode -eq 200) "export pdf $($r.Headers['Content-Type'])"
    }
    catch { Add-Result 'TC-BIRPT-06' $false $_.Exception.Message }

    try {
        $r = Invoke-Api 'GET' "/Reports/Reportes/FinanzasMes/export?mes=$((Get-Date).Month)&anio=$((Get-Date).Year)&formato=pdf" $tokens.admin
        Add-Result 'TC-BIRPT-09' ($r.StatusCode -eq 200) "finanzas pdf $($r.Headers['Content-Type'])"
    }
    catch { Add-Result 'TC-BIRPT-09' $false $_.Exception.Message }

    try {
        $r = Invoke-Api 'POST' '/NTF/Notificaciones/aviso' $tokens.admin @{ titulo = 'Smoke BI-RPT-001'; mensaje = 'TC-BIRPT-08' }
        Add-Result 'TC-BIRPT-08' ($r.StatusCode -in 200, 201) "aviso $($r.StatusCode)"
    }
    catch { Add-Result 'TC-BIRPT-08' $false $_.Exception.Message }
}

if ($tokens.residente -and $tokens.admin) {
    try {
        Invoke-Api 'GET' '/Reports/Bi/tendencias?meses=6' $tokens.residente | Out-Null
        Add-Result 'TC-BIRPT-05-ERR' $false 'esperaba 403'
    }
    catch {
        $code = $_.Exception.Response.StatusCode.value__
        Add-Result 'TC-BIRPT-05-ERR' ($code -eq 403) "HTTP $code"
    }
    try {
        Invoke-Api 'POST' '/NTF/Notificaciones/aviso' $tokens.residente @{ titulo = 'x'; mensaje = 'y' } | Out-Null
        Add-Result 'TC-BIRPT-08-ERR' $false 'esperaba 403'
    }
    catch {
        $code = $_.Exception.Response.StatusCode.value__
        Add-Result 'TC-BIRPT-08-ERR' ($code -eq 403) "HTTP $code"
    }
}

$fail = @($results | Where-Object { $_ -match '^\[FAIL\]' }).Count
$pass = @($results | Where-Object { $_ -match '^\[PASS\]' }).Count
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$logPath = Join-Path $EvidenciaDir 'ultima-ejecucion.log'
$mdPath = Join-Path $EvidenciaDir 'EVIDENCIA_API_SMOKE_POSTDEPLOY.md'

$verdict = if ($fail -eq 0) { 'PASS' } else { 'FAIL' }
$md = @(
    '# API smoke post-deploy - BI-RPT-001 + NAV-ROOT TC-NAV-08',
    '',
    "| Campo | Valor |",
    '|-------|-------|',
    "| Fecha | $stamp |",
    "| Target | $Target |",
    "| API | $baseUrl |",
    '',
    '## Resultados',
    '',
    ($results -join [Environment]::NewLine),
    '',
    '## Veredicto',
    '',
    "- PASS: **$pass** / FAIL: **$fail**",
    "- Global: **$verdict**",
    '',
    'Bot/IA v2 fuera de alcance.'
) -join [Environment]::NewLine
Set-Content -Path $mdPath -Value $md -Encoding UTF8

($results -join [Environment]::NewLine) | Set-Content -Path $logPath -Encoding UTF8
Write-Host "`nEvidencia: $mdPath" -ForegroundColor Cyan
if ($fail -gt 0) { exit 1 }
