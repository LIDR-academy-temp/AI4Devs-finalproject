@echo off
title Deploy produccion MonsterASP (API + Web)
color 0E
echo ============================================================
echo   Deploy API + Web (runasp.net)
echo   API:  https://apicuartaquinientos.runasp.net
echo   Web:  https://cuartaquinientosresidencial.runasp.net
echo ============================================================
echo.
echo NOTA: Este script ya NO publica GraphApi en el sitio del portal.
echo       Si corriste una version vieja del .bat, restaura la Web con:
echo       powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Deploy-Produccion.ps1" -Solo Web
echo.

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Deploy-Produccion.ps1" -Solo Ambos

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ERROR] Deploy fallo. Revisa credenciales en *.publishSettings en la raiz del repo.
    pause
    exit /b 1
)

color 0A
echo.
echo Deploy completado.
pause
