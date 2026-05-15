@echo off
chcp 65001 > nul
echo ============================================
echo  GERANDO RELATORIO SDR - ANALISE EXCEL
echo ============================================
echo.

python --version > nul 2>&1
if errorlevel 1 (
    echo ERRO: Python nao encontrado no PATH.
    echo Instale Python 3.x em https://python.org e tente novamente.
    pause
    exit /b 1
)

echo Verificando dependencias...
python -c "import pandas, openpyxl" > nul 2>&1
if errorlevel 1 (
    echo Instalando dependencias necessarias...
    pip install pandas openpyxl
    echo.
)

echo Executando analise das planilhas SDR...
echo.

python "%~dp0gerar_relatorio_sdr.py"

echo.
if errorlevel 1 (
    echo ERRO ao gerar o relatorio. Verifique as mensagens acima.
    pause
    exit /b 1
)

echo Relatorio gerado com sucesso!
echo Local: %~dp0Relatorio_Analise_SDR.xlsx
echo.
echo Abrindo o relatorio...
start "" "%~dp0Relatorio_Analise_SDR.xlsx"

pause
