@echo off
title GraphApi - CuartaQuinientos
color 0A
echo ============================================
echo   GraphApi - CuartaQuinientos
echo   https://localhost:7242/swagger
echo ============================================
echo.

cd /d "%~dp0GraphApi"

echo [*] Iniciando GraphApi (perfil https)...
echo [*] Swagger disponible en: https://localhost:7242/swagger
echo.

dotnet run --launch-profile https

pause
