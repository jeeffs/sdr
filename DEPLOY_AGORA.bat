@echo off
cd /d "%~dp0"
echo Fazendo deploy do SDR...
firebase deploy --only hosting
echo.
pause
