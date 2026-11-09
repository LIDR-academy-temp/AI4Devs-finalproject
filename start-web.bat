@echo off
title Web - CuartaQuinientos
color 0B
echo ============================================
echo   Web Frontend - CuartaQuinientos
echo   http://localhost:5173
echo ============================================
echo.

cd /d "%~dp0Web"

echo [*] Verificando dependencias...
if not exist "node_modules\" (
    echo [!] node_modules no encontrado, instalando...
    npm install
)

echo.
echo [*] Iniciando servidor de desarrollo Vite...
echo [*] App disponible en: http://localhost:5173
echo.

npm run dev

pause
