@echo off
title Deploy -> cuartaquinientosresidencial.runasp.net
color 0E
echo ============================================================
echo   Deploy GraphApi -> cuartaquinientosresidencial.runasp.net
echo ============================================================
echo.

cd /d "%~dp0GraphApi"

echo [1/2] Publicando con perfil Produccion...
dotnet publish -c Release /p:PublishProfile=Produccion /p:Password=t?4N3K!jn-5E

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ERROR] El publish fallo. Revisa los errores arriba.
    pause
    exit /b 1
)

echo.
echo [2/2] Deploy completado exitosamente.
color 0A
echo.
echo Sitio: https://cuartaquinientosresidencial.runasp.net/
echo.
pause
