# check-tests-green.ps1  (PreToolUse: Write|Edit)
# Endurecimiento de CALIDAD (Unidad 7). Fail-open: cualquier error -> allow.
#
# Dos compuertas, por nombre de archivo:
#   G1 (script de pruebas *Pruebas*.sql):
#        - anti-Test-Theater: exige >=1 aserto NEGATIVO/de error (no solo happy path).
#        - evidencia de ejecucion: exige anotacion '-- [OK] TESTS [<entorno>] -> <...>'
#          (acepta PASS y ROJO esperado; el humano corre y anota, igual que -- MCP).
#   G2 (impl de SP de negocio *_business_sps.sql):
#        - shift-left: exige que exista un hermano *Pruebas*.sql en la misma carpeta.
#          No se implementa un SP de negocio sin plan de pruebas ejecutable.
#
# Salida DOBLE dialecto (una linea JSON compacta), identico contrato que check-mcp-test:
#   DENY -> {permission:deny} + hookSpecificOutput.permissionDecision=deny (Claude Code)
#   ALLOW-> {permission:allow} (Claude Code sigue su flujo normal de permisos)

$ErrorActionPreference = 'Stop'
$script:Emitted = $false

function Write-Stdout {
    param([string]$Text)
    $bytes  = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $stdout = [System.Console]::OpenStandardOutput()
    $stdout.Write($bytes, 0, $bytes.Length)
    $stdout.Flush()
    $script:Emitted = $true
}

function Write-Decision {
    param(
        [ValidateSet('allow','deny')][string]$Decision = 'allow',
        [string]$UserMessage,
        [string]$AgentMessage
    )
    $payload = @{ permission = $Decision }
    if ($Decision -eq 'deny') {
        $payload.user_message  = $UserMessage
        $payload.agent_message = $AgentMessage
        $payload.hookSpecificOutput = @{
            hookEventName            = 'PreToolUse'
            permissionDecision       = 'deny'
            permissionDecisionReason = $AgentMessage
        }
    }
    elseif ($AgentMessage) {
        $payload.agent_message = $AgentMessage
    }
    Write-Stdout ($payload | ConvertTo-Json -Depth 8 -Compress)
}

trap {
    if (-not $script:Emitted) {
        try { Write-Stdout '{"permission":"allow"}' } catch { }
    }
    exit 0
}

try {
    $raw = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw)) { Write-Decision -Decision 'allow'; exit 0 }
    try { $j = $raw | ConvertFrom-Json } catch { Write-Decision -Decision 'allow'; exit 0 }

    $filePath = $null
    if ($null -ne $j.tool_input) {
        $names = @($j.tool_input.PSObject.Properties.Name)
        if ($names -contains 'file_path') { $filePath = [string]$j.tool_input.file_path }
        elseif ($names -contains 'path') { $filePath = [string]$j.tool_input.path }
    }
    if ([string]::IsNullOrWhiteSpace($filePath)) { Write-Decision -Decision 'allow'; exit 0 }

    $baseName = Split-Path -Path $filePath -Leaf
    $dir      = Split-Path -Path $filePath -Parent

    $text = $null
    $names = @($j.tool_input.PSObject.Properties.Name)
    if ($names -contains 'content') { $text = [string]$j.tool_input.content }
    if ([string]::IsNullOrWhiteSpace($text) -and ($names -contains 'new_string')) {
        $text = [string]$j.tool_input.new_string
    }

    $tick  = [char]0x2713
    $arrow = [char]0x2192

    # ---------- G1: script de pruebas ----------
    if ($baseName -match '(?i)Pruebas.*\.sql$') {
        if ([string]::IsNullOrWhiteSpace($text)) { Write-Decision -Decision 'allow'; exit 0 }

        # anti-Test-Theater: al menos un aserto negativo / de error / ROJO.
        $negativePattern = [regex]"(?i)(ErrorID\s*=\s*5\d{4}|N'Error'|\bROJO\b|\bFAIL\b|actionable\s*=\s*0|status\s*=\s*N?'Error'|Expected.*(5\d{4}|error))"
        if (-not $negativePattern.IsMatch($text)) {
            $u = "Test Theater: el script de pruebas no tiene ningun caso NEGATIVO / de error."
            $a = "$u La Unidad 7 exige >=1 aserto que falle ante entrada invalida (codigo 5xxxx, 'Error', actionable=0 o caso ROJO). Agrega al menos un caso de borde/negativo antes de guardar."
            Write-Decision -Decision 'deny' -UserMessage $u -AgentMessage $a; exit 0
        }

        # evidencia de ejecucion: -- [OK] TESTS [<entorno>] -> ...
        $evidence = [regex]('--\s*(?:\[OK\]|' + $tick + ')\s*TESTS?\s*\[\w+\]\s*(?:->|' + $arrow + ')')
        if (-not $evidence.IsMatch($text)) {
            $u = "El script de pruebas no tiene evidencia de ejecucion."
            $a = "$u Ejecuta el suite (MCP/runner) y anota el resultado, ej: '-- [OK] TESTS [nesgotest] -> 18 PASS / 1 ROJO esperado'. Sin esa anotacion el suite se considera NO ejecutado."
            Write-Decision -Decision 'deny' -UserMessage $u -AgentMessage $a; exit 0
        }

        Write-Decision -Decision 'allow'; exit 0
    }

    # ---------- G2: impl de SP (por CONTENIDO, no solo por nombre) ----------
    # Cierra el bypass de renombrar: cualquier .sql que CREE/ALTERE un PROCEDURE
    # (y no sea un script de pruebas) exige su *Pruebas*.sql hermano.
    $isProc = ($baseName -match '(?i)\.sql$') -and (
        ($baseName -match '(?i)_business_sps\.sql$') -or
        (-not [string]::IsNullOrWhiteSpace($text) -and ($text -match '(?im)^\s*CREATE\s+(OR\s+ALTER\s+)?PROCEDURE|^\s*ALTER\s+PROCEDURE'))
    )
    if ($isProc) {
        $hasTest = $false
        if (-not [string]::IsNullOrWhiteSpace($dir) -and (Test-Path -LiteralPath $dir)) {
            $siblings = Get-ChildItem -LiteralPath $dir -Filter '*Pruebas*.sql' -File -ErrorAction SilentlyContinue
            if ($siblings -and $siblings.Count -gt 0) { $hasTest = $true }
        }
        if (-not $hasTest) {
            $u = "No hay plan de pruebas ejecutable junto al SP de negocio."
            $a = "$u Shift-left (Unidad 7): antes de implementar un SP de negocio debe existir un '*Pruebas*.sql' en la misma carpeta con los casos (incl. negativos). Genera el andamiaje de pruebas primero."
            Write-Decision -Decision 'deny' -UserMessage $u -AgentMessage $a; exit 0
        }
        Write-Decision -Decision 'allow'; exit 0
    }

    Write-Decision -Decision 'allow'
    exit 0
}
catch {
    Write-Decision -Decision 'allow' -AgentMessage "check-tests-green fail-open: $($_.Exception.Message)"
    exit 0
}
