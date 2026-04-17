# ============================================================
# BACKUP_E_DEPLOY.ps1 — SDR Soluções de Rua
# Faz backup do Firebase + deploy seguro
# Uso: .\BACKUP_E_DEPLOY.ps1
# ============================================================

$ErrorActionPreference = "Continue"
$DATA = Get-Date -Format "yyyy-MM-dd_HH-mm"
$PASTA_BACKUP = "BACKUP\deploy-$DATA"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   SDR — BACKUP + DEPLOY SEGURO" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Verifica se está no branch main ---
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "main") {
    Write-Host "[ERRO] Você está no branch '$branch'." -ForegroundColor Red
    Write-Host "       Só é permitido fazer deploy a partir do branch 'main'." -ForegroundColor Red
    Write-Host "       Rode: git checkout main; git merge develop" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/4] Branch: main ✓" -ForegroundColor Green

# --- 2. Backup do código atual (antes de qualquer mudança) ---
Write-Host "[2/4] Criando backup local do código..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $PASTA_BACKUP -Force | Out-Null
Copy-Item "public\admin.html"  "$PASTA_BACKUP\admin.html"  -Force
Copy-Item "public\index.html"  "$PASTA_BACKUP\index.html"  -Force
Copy-Item "public\sw.js"       "$PASTA_BACKUP\sw.js"       -Force
if (Test-Path "public\sdr-module.js") {
    Copy-Item "public\sdr-module.js" "$PASTA_BACKUP\sdr-module.js" -Force
}
Write-Host "    Backup salvo em: $PASTA_BACKUP" -ForegroundColor Green

# --- 3. Backup do Firebase Realtime Database ---
Write-Host "[3/4] Exportando banco Firebase..." -ForegroundColor Yellow
$backupResult = firebase database:get / --output "$PASTA_BACKUP\firebase-db-backup.json" --project solucaoderua 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "    Banco exportado: firebase-db-backup.json ✓" -ForegroundColor Green
} else {
    Write-Host "    [AVISO] Backup do banco falhou — continuando mesmo assim." -ForegroundColor Yellow
    Write-Host "    Motivo: $backupResult" -ForegroundColor DarkYellow
}

# --- 4. Deploy no Firebase Hosting ---
Write-Host "[4/4] Iniciando deploy..." -ForegroundColor Yellow
firebase deploy --only hosting --project solucaoderua

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "   DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "   Backup salvo em: $PASTA_BACKUP" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
