#Requires -Version 5.1
param(
    [Parameter(Mandatory = $true, ValueFromRemainingArguments = $true)]
    [string[]]$Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-DoubleCrLf {
    param([byte[]]$Bytes)

    for ($i = 0; $i -lt $Bytes.Length - 3; $i++) {
        if ($Bytes[$i] -eq 13 -and $Bytes[$i + 1] -eq 13 -and $Bytes[$i + 2] -eq 10) {
            return $true
        }
    }

    return $false
}

foreach ($filePath in $Path) {
    if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        throw "Archivo no encontrado: $filePath"
    }

    if ([System.IO.Path]::GetExtension($filePath) -ne '.sql') {
        throw "Solo aplica a .sql: $filePath"
    }

    $text = [System.IO.File]::ReadAllText($filePath, [System.Text.UTF8Encoding]::new($true))
    $normalized = $text -replace "`r`r+`n", "`r`n"
    $normalized = [regex]::Replace($normalized, "(?<!\r)`n", "`r`n")

    $encoding = [System.Text.UTF8Encoding]::new($true)
    [System.IO.File]::WriteAllText($filePath, $normalized, $encoding)

    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    if ($bytes.Length -lt 3 -or $bytes[0] -ne 0xEF -or $bytes[1] -ne 0xBB -or $bytes[2] -ne 0xBF) {
        throw "BOM UTF-8 ausente en $filePath"
    }

    if (Test-DoubleCrLf -Bytes $bytes) {
        throw "Persisten CRLF duplicados en $filePath"
    }

    Write-Output "OK $filePath"
}
