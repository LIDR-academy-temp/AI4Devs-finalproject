# check-mcp-test.ps1  (PreToolUse: Write|Edit)
# Bloquea escribir design.md con bloques sql sin evidencia MCP.
# Fail-open: cualquier error emite allow.
#
# Salida de DOBLE formato (un solo objeto JSON compacto, una linea, via
# [Console]::Out.WriteLine) para servir a los dos runners:
#   - permission / user_message / agent_message      -> runner de hooks de Cursor
#   - hookSpecificOutput.permissionDecision(+Reason)  -> Claude Code (.claude/settings.json)
# Asimetrico a proposito:
#   ALLOW -> solo {"permission":"allow"}. Claude Code no lo reconoce como decision
#            y sigue su flujo normal de permisos (NO auto-aprueba Write/Edit).
#   DENY  -> ambos dialectos, para que Cursor Y Claude Code bloqueen.
# (Confirmado con la doc de Claude Code: honra hookSpecificOutput e ignora
#  la clave permission; un {"permission":"deny"} suelto NO bloquea en Claude Code.)

# Fail-open total: cualquier error (terminante o no) debe terminar en 'allow',
# nunca en stdout vacio o basura que Cursor interprete como JSON invalido.
$ErrorActionPreference = 'Stop'
$script:Emitted = $false

# Escribe una cadena a stdout como bytes UTF-8 CRUDOS, sin BOM y sin depender
# de [Console]::OutputEncoding (que en algunas maquinas antepone EF BB BF y
# rompe el JSON.parse del runner de hooks de Cursor). GetBytes() nunca antepone
# preambulo/BOM. Sin salto de linea final: solo el objeto JSON, nada mas.
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
        # Nota informativa (fail-open). Solo la lee Cursor; Claude Code la ignora.
        $payload.agent_message = $AgentMessage
    }
    # ConvertTo-Json en Windows PowerShell 5.1 escapa los no-ASCII a \uXXXX,
    # asi que el JSON resultante es ASCII puro; lo emitimos como bytes crudos.
    Write-Stdout ($payload | ConvertTo-Json -Depth 8 -Compress)
}

# Ultima red de seguridad: cualquier error terminante no atrapado por el try/catch
# de abajo (p. ej. algo raro del entorno) cae aqui y aun asi emite un 'allow'
# valido, salvo que ya hayamos emitido algo (evita concatenar dos objetos JSON).
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
    if ($baseName -ne 'design.md') { Write-Decision -Decision 'allow'; exit 0 }

    $text = $null
    $names = @($j.tool_input.PSObject.Properties.Name)
    if ($names -contains 'content') { $text = [string]$j.tool_input.content }
    if ([string]::IsNullOrWhiteSpace($text) -and ($names -contains 'new_string')) {
        $text = [string]$j.tool_input.new_string
    }
    if ([string]::IsNullOrWhiteSpace($text)) { Write-Decision -Decision 'allow'; exit 0 }

    $blocks = [regex]::Matches($text, '(?s)```sql(.*?)```')
    if ($blocks.Count -eq 0) { Write-Decision -Decision 'allow'; exit 0 }

    $tick  = [char]0x2713
    $arrow = [char]0x2192
    $evidencePattern = [regex]('--\s*(?:\[OK\]|' + $tick + ')\s*MCP\s*\[\w+\]\s*(?:->|' + $arrow + ')')

    $missing = 0
    foreach ($b in $blocks) {
        $body = $b.Groups[1].Value.Trim()
        if ($body.Length -eq 0) { continue }
        if (-not $evidencePattern.IsMatch($body)) { $missing++ }
    }

    if ($missing -gt 0) {
        $userReason  = "$missing bloque(s) SQL en design.md sin evidencia MCP estructurada."
        $agentReason = "$userReason Ejecutar cada query contra mcp__<MCP_TEST>__execute_sql " +
            "y anotar en el bloque: '-- [OK] MCP [<entorno>] -> <N filas o resultado>'. " +
            "Ejemplo: '-- [OK] MCP [nesgotest] -> 5 filas'."
        Write-Decision -Decision 'deny' -UserMessage $userReason -AgentMessage $agentReason
        exit 0
    }

    Write-Decision -Decision 'allow'
    exit 0
}
catch {
    Write-Decision -Decision 'allow' -AgentMessage "check-mcp-test fail-open: $($_.Exception.Message)"
    exit 0
}
