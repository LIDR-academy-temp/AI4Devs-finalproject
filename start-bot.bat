@echo off
title Bot Telegram - CuartaQuinientos
color 0E
echo ============================================
echo   Bot Telegram - CuartaQuinientos
echo ============================================
echo.

cd /d "%~dp0Bot"

echo [*] Verificando entorno Python...

if not exist ".venv\" (
    echo [!] Entorno virtual no encontrado, creando...
    python -m venv .venv
    echo [*] Instalando dependencias...
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call .venv\Scripts\activate.bat
)

if not exist ".env" (
    echo.
    echo [!] AVISO: Archivo .env no encontrado.
    echo     Copia .env.example a .env y configura tu token de Telegram.
    echo.
    pause
    exit /b 1
)

echo.
echo [*] Iniciando Bot de Telegram...
echo.

python bot\main.py

pause
