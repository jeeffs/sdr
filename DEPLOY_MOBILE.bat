@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   SDR — Deploy Mobile + Admin            ║
echo ╚══════════════════════════════════════════╝
echo.

set "SDR_DIR=%~dp0"
set "MOBILE=%SDR_DIR%APP\interface\mobile.html"
set "PUBLIC_INDEX=%SDR_DIR%public\index.html"
set "BACKUP=%SDR_DIR%BACKUP\index.html.before-mobile-deploy"

:: 1. Backup do index atual
echo [1/3] Fazendo backup do index.html atual...
copy /Y "%PUBLIC_INDEX%" "%BACKUP%" >nul
if %errorlevel%==0 (
    echo      Backup salvo em BACKUP\index.html.before-mobile-deploy
) else (
    echo      Backup falhou mas continuando...
)

:: 2. Copiar mobile.html para public/index.html
echo.
echo [2/3] Copiando mobile.html → public\index.html...
copy /Y "%MOBILE%" "%PUBLIC_INDEX%" >nul
if %errorlevel%==0 (
    echo      ✅ Substituicao feita com sucesso!
) else (
    echo      ❌ ERRO ao copiar. Abortando.
    pause
    exit /b 1
)

:: 3. Firebase deploy
echo.
echo [3/3] Executando firebase deploy...
cd /d "%SDR_DIR%"
call firebase deploy --only hosting
if %errorlevel%==0 (
    echo.
    echo ✅ Deploy concluido! Acesse: https://solucaoderua.web.app
) else (
    echo.
    echo ❌ Deploy falhou. Verifique se voce esta logado no Firebase:
    echo    firebase login
)

echo.
pause
