param(
    [Parameter(Mandatory)]
    [string]$Server,
    [Parameter(Mandatory)]
    [string]$Database,
    [Parameter(Mandatory)]
    [string]$ScriptPath,
    [hashtable]$SqlCmdVars = @{},
    [switch]$UseIntegratedSecurity
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $ScriptPath)) { throw "No existe: $ScriptPath" }

$args = @('-S', $Server, '-d', $Database, '-b', '-I', '-i', $ScriptPath)
if ($UseIntegratedSecurity) { $args += '-E' }
foreach ($k in $SqlCmdVars.Keys) {
    $args += '-v'
    $args += "$k=$($SqlCmdVars[$k])"
}

& sqlcmd @args
if ($LASTEXITCODE -ne 0) { throw "sqlcmd falló ($LASTEXITCODE) en $ScriptPath" }
