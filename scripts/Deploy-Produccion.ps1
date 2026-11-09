# Deploy de API y Web a MonsterASP (runasp.net) via Web Deploy.
# Uso (desde la raiz del repo):  .\scripts\Deploy-Produccion.ps1 [-Solo Api|Web|Ambos]
# Credenciales: se leen de los .publishSettings locales (gitignored); nunca se escriben aqui.
# SECRETOS: este script NO sube appsettings.Production.json (skip msdeploy). Tras rotar SQL/JWT,
# actualizar el archivo en el panel del sitio API o variables de entorno — ver
# ContextoCuartaQuinientos/evidencia/20261109_SEGURIDAD_SECRETOS_GIT/INCIDENTE_SECRETOS_PRODUCCION.md
param([ValidateSet('Api','Web','Ambos')][string]$Solo = 'Ambos')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$msdeploy = "$env:ProgramFiles\IIS\Microsoft Web Deploy V3\msdeploy.exe"
if (-not (Test-Path $msdeploy)) { throw "Falta Web Deploy 3: https://www.iis.net/downloads/microsoft/web-deploy" }

function Get-Perfil($patron) {
  $f = Get-ChildItem $root -Filter $patron | Select-Object -First 1
  if (-not $f) { throw "No se encontro $patron en $root" }
  [xml]$x = Get-Content -LiteralPath $f.FullName
  $x.publishData.publishProfile | Where-Object publishMethod -eq 'MSDeploy' | Select-Object -First 1
}

function Publicar($perfil, $carpeta, $nombre) {
  Write-Host "==> Publicando $nombre en $($perfil.msdeploySite)" -ForegroundColor Cyan
  $dest = "contentPath=$($perfil.msdeploySite),ComputerName=https://$($perfil.publishUrl):8172/msdeploy.axd?site=$($perfil.msdeploySite),UserName=$($perfil.userName),Password=$($perfil.userPWD),AuthType=Basic"
  & $msdeploy -verb:sync "-source:contentPath=$carpeta" "-dest:$dest" `
    -allowUntrusted -enableRule:AppOffline `
    "-skip:objectName=filePath,absolutePath=appsettings\.Production\.json$" `
    "-skip:objectName=dirPath,absolutePath=App_Data$"
  if ($LASTEXITCODE -ne 0) { throw "Fallo deploy de $nombre" }
}

if ($Solo -in 'Api','Ambos') {
  $out = Join-Path $env:TEMP 'cq-api-publish'
  Remove-Item $out -Recurse -Force -ErrorAction SilentlyContinue
  dotnet test "$root\GraphApi\GraphApi.Tests" -c Release --filter "Category!=Smoke"; if ($LASTEXITCODE) { throw 'Tests API fallaron' }
  dotnet publish "$root\GraphApi\GraphApi.csproj" -c Release -o $out; if ($LASTEXITCODE) { throw 'Publish API fallo' }
  Publicar (Get-Perfil 'apicuartaquinientos*.publishSettings') $out 'API'
}

if ($Solo -in 'Web','Ambos') {
  Push-Location "$root\Web"
  try {
    npm ci; if ($LASTEXITCODE) { throw 'npm ci fallo' }
    npx vitest run; if ($LASTEXITCODE) { throw 'Tests Web fallaron' }
    npm run build; if ($LASTEXITCODE) { throw 'Build Web fallo' }
  } finally { Pop-Location }
  Publicar (Get-Perfil 'cuartaquinientosresidencial*.publishSettings') "$root\Web\dist" 'Web'
}

foreach ($u in 'https://apicuartaquinientos.runasp.net','https://cuartaquinientosresidencial.runasp.net') {
  try { $r = Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 60; Write-Host "$u -> $($r.StatusCode)" -ForegroundColor Green }
  catch { Write-Host "$u -> $($_.Exception.Message)" -ForegroundColor Yellow }
}
