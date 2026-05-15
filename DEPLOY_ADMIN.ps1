# SDR - Deploy Admin (vite build + firebase)
# Execute: botão direito → "Executar com PowerShell"

$SDR = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "=== SDR Deploy Admin ===" -ForegroundColor Cyan
Write-Host ""

Set-Location $SDR

# 1. Build (vite)
Write-Host "[1/2] Rodando vite build..." -ForegroundColor Yellow
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build falhou (exit code $LASTEXITCODE)" -ForegroundColor Red
        Read-Host "Pressione Enter para fechar"
        exit 1
    }
    Write-Host "      Build OK!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao executar npm run build: $_" -ForegroundColor Red
    Read-Host "Pressione Enter para fechar"
    exit 1
}

# 2. Firebase deploy (hosting only)
Write-Host ""
Write-Host "[2/2] Firebase deploy..." -ForegroundColor Yellow
try {
    firebase deploy --only hosting
    Write-Host ""
    Write-Host "✅ Deploy concluido! https://solucaoderua.web.app/admin" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Firebase CLI nao encontrado ou erro no deploy." -ForegroundColor Red
    Write-Host "   Execute manualmente: firebase deploy --only hosting" -ForegroundColor Yellow
    Write-Host "   Na pasta: $SDR" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Pressione Enter para fechar"
