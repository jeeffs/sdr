@echo off
title Validador de Planilhas - Prestadores
echo ============================================
echo   VALIDADOR DE PLANILHAS - PRESTADORES
echo ============================================
echo.

:: Verificar Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado!
    echo Instale Python em: https://www.python.org/downloads/
    echo Marque "Add Python to PATH" durante a instalacao.
    pause
    exit /b 1
)

:: Verificar/instalar openpyxl
python -c "import openpyxl" >nul 2>&1
if errorlevel 1 (
    echo Instalando dependencia openpyxl...
    pip install openpyxl
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar openpyxl.
        pause
        exit /b 1
    )
)

echo Iniciando aplicativo...
echo.
python "%~dp0validador_app.py"

if errorlevel 1 (
    echo.
    echo [ERRO] O aplicativo encerrou com erro.
    pause
)
