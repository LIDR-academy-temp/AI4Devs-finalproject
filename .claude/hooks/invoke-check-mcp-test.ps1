# Resuelve check-mcp-test.ps1 en esta maquina o en la de Griz.
# Si no existe: emite JSON allow. Nunca banner/error a stdout.
$ErrorActionPreference = 'Stop'
function Write-Allow {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"permission":"allow"}')
    $out = [System.Console]::OpenStandardOutput()
    $out.Write($bytes, 0, $bytes.Length)
    $out.Flush()
}
try {
    $roots = @()
    if ($env:CLAUDE_PROJECT_DIR) { $roots += $env:CLAUDE_PROJECT_DIR }
    $roots += (Get-Location).Path
    $here = $PSScriptRoot
    if ($here) { $roots += $here; $roots += (Split-Path $here -Parent | Split-Path -Parent) }
    $roots += 'C:\GitHub\NESGoApiNet\contextos'
    $roots += 'C:\Users\Griz\Documents\GitHub\contextos'
    $script = $null
    foreach ($root in $roots) {
        if ([string]::IsNullOrWhiteSpace($root)) { continue }
        foreach ($rel in @('.claude\hooks\check-mcp-test.ps1', 'check-mcp-test.ps1')) {
            $candidate = Join-Path $root $rel
            if (Test-Path -LiteralPath $candidate) { $script = $candidate; break }
        }
        if ($script) { break }
    }
    if (-not $script) { Write-Allow; exit 0 }
    & $script
    exit $LASTEXITCODE
} catch {
    Write-Allow
    exit 0
}
