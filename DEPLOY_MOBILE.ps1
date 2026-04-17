# SDR - Deploy Mobile
# Execute: botão direito → "Executar com PowerShell"

$SDR = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobile = Join-Path $SDR "APP\interface\mobile.html"
$publicIndex = Join-Path $SDR "public\index.html"
$backup = Join-Path $SDR "BACKUP\index.html.antes-mobile-$(Get-Date -Format 'yyyyMMdd-HHmm')"

Write-Host ""
Write-Host "=== SDR Deploy Mobile ===" -ForegroundColor Cyan
Write-Host ""

# 1. Backup
Write-Host "[1/3] Backup do index atual..." -ForegroundColor Yellow
Copy-Item $publicIndex $backup -Force
Write-Host "      Salvo: $backup" -ForegroundColor Gray

# 2. Copia mobile.html -> public/index.html
Write-Host ""
Write-Host "[2/3] Copiando mobile.html -> public\index.html..." -ForegroundColor Yellow
Copy-Item $mobile $publicIndex -Force
if (Test-Path $publicIndex) {
    $newSize = (Get-Item $publicIndex).Length
    Write-Host "      OK! Tamanho: $([math]::Round($newSize/1KB)) KB" -ForegroundColor Green
} else {
    Write-Host "      ERRO: arquivo nao encontrado apos copia!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

# 3. Firebase deploy
Write-Host ""
Write-Host "[3/3] Firebase deploy..." -ForegroundColor Yellow
Set-Location $SDR
try {
    firebase deploy --only hosting
    Write-Host ""
    Write-Host "✅ Deploy concluido! https://solucaoderua.web.app" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Firebase CLI nao encontrado ou erro no deploy." -ForegroundColor Red
    Write-Host "   Execute manualmente: firebase deploy --only hosting" -ForegroundColor Yellow
    Write-Host "   Na pasta: $SDR" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Pressione Enter para fechar"
