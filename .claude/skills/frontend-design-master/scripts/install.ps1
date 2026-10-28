<#
.SYNOPSIS
  Instala o actualiza Frontend Design Master para Cursor y Claude Code.
.DESCRIPTION
  Copia primero a una carpeta temporal fuera del destino. Si el origen y destino
  son la misma carpeta, preserva el origen antes de moverlo para respaldarlo.
  Para actualizar, respalda la instalación actual y restaura en caso de fallo.
.EXAMPLE
  .\scripts\install.ps1 -Scope User
.EXAMPLE
  .\scripts\install.ps1 -Scope User -Force -WhatIf
.EXAMPLE
  .\scripts\install.ps1 -Scope Project -ProjectPath 'D:\Proyectos\MiApp' -Force
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [ValidateSet('User','Project')][string]$Scope = 'User',
  [string]$ProjectPath = '',
  [switch]$Force
)
$ErrorActionPreference = 'Stop'
$source = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if (-not (Test-Path -LiteralPath (Join-Path $source 'SKILL.md') -PathType Leaf)) {
  throw 'No se encontró SKILL.md en la carpeta fuente.'
}
if ($Scope -eq 'Project') {
  if ([string]::IsNullOrWhiteSpace($ProjectPath)) { throw 'Indica -ProjectPath para Scope Project.' }
  if (-not (Test-Path -LiteralPath $ProjectPath -PathType Container)) { throw "No existe ProjectPath: $ProjectPath" }
  $skillsPath = Join-Path $ProjectPath '.claude\skills'
} else {
  $skillsPath = Join-Path $HOME '.claude\skills'
}
$target = Join-Path $skillsPath 'frontend-design-master'
$exists = Test-Path -LiteralPath $target
if ($exists -and -not $Force) {
  throw "La skill ya existe en: $target. Usa -Force para respaldar y actualizar."
}
$description = if ($exists) { 'Respaldar y actualizar skill' } else { 'Instalar skill' }
if (-not $PSCmdlet.ShouldProcess($target, $description)) { return }

# Construir copia inmutable temporal antes de tocar el destino, incluso si source==target.
$stagingRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('fdm-' + [guid]::NewGuid().ToString('N'))
$stage = Join-Path $stagingRoot 'frontend-design-master'
$backup = $null
$installed = $false
$targetCopyStarted = $false
try {
  New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null
  Copy-Item -LiteralPath $source -Destination $stage -Recurse -ErrorAction Stop
  if (-not (Test-Path -LiteralPath (Join-Path $stage 'SKILL.md') -PathType Leaf)) {
    throw 'La copia temporal está incompleta (no contiene SKILL.md).'
  }
  New-Item -ItemType Directory -Path $skillsPath -Force | Out-Null
  if ($exists) {
    $backup = "$target.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')-$([guid]::NewGuid().ToString('N').Substring(0,6))"
    Move-Item -LiteralPath $target -Destination $backup -ErrorAction Stop
    Write-Host "Respaldo anterior: $backup"
  }
  $targetCopyStarted = $true
  Copy-Item -LiteralPath $stage -Destination $target -Recurse -ErrorAction Stop
  if (-not (Test-Path -LiteralPath (Join-Path $target 'SKILL.md') -PathType Leaf)) {
    throw 'No se completó la instalación: falta SKILL.md.'
  }
  $installed = $true
  Write-Host "Instalada: $target"
  Write-Host 'Reinicia la sesión de Cursor/Claude Code para refrescar su detección.'
} catch {
  if ($targetCopyStarted -and -not $installed -and (Test-Path -LiteralPath $target)) {
    Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction SilentlyContinue
  }
  if ($backup -and (Test-Path -LiteralPath $backup) -and -not (Test-Path -LiteralPath $target)) {
    Move-Item -LiteralPath $backup -Destination $target -ErrorAction Stop
    Write-Warning 'La versión anterior ha sido restaurada.'
  }
  throw
} finally {
  if (Test-Path -LiteralPath $stagingRoot) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
