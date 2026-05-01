# ============================================================
# BACKUP_E_DEPLOY.ps1 - SDR Solucoes de Rua
# Faz backup do Firebase + build Vite + deploy seguro
# Uso normal:           .\BACKUP_E_DEPLOY.ps1
# Sem rebuild do Vite:  .\BACKUP_E_DEPLOY.ps1 -SkipBuild
# (use -SkipBuild quando o sdr-bundle.js ja esta correto no repo)
# ============================================================

param([switch]$SkipBuild)

$ErrorActionPreference = "Continue"
$DATA = Get-Date -Format "yyyy-MM-dd_HH-mm"
$PASTA_BACKUP = "BACKUP\deploy-$DATA"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   SDR - BACKUP + DEPLOY SEGURO" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Verifica se esta no branch main ---
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "main") {
    Write-Host "[ERRO] Voce esta no branch '$branch'." -ForegroundColor Red
    Write-Host "       So e permitido fazer deploy a partir do branch 'main'." -ForegroundColor Red
    Write-Host "       Rode: git checkout main; git merge develop" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/6] Branch: main OK" -ForegroundColor Green

# --- 2. Backup do codigo atual (antes de qualquer mudanca) ---
Write-Host "[2/6] Criando backup local do codigo..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $PASTA_BACKUP -Force | Out-Null
Copy-Item "public\admin.html"  "$PASTA_BACKUP\admin.html"  -Force
Copy-Item "public\index.html"  "$PASTA_BACKUP\index.html"  -Force
Copy-Item "public\sw.js"       "$PASTA_BACKUP\sw.js"       -Force
if (Test-Path "public\sdr-module.js") {
    Copy-Item "public\sdr-module.js" "$PASTA_BACKUP\sdr-module.js" -Force
}
if (Test-Path "public\sdr-bundle.js") {
    Copy-Item "public\sdr-bundle.js" "$PASTA_BACKUP\sdr-bundle.js" -Force
}
Write-Host "    Backup salvo em: $PASTA_BACKUP" -ForegroundColor Green

# --- 3. Backup do Firebase Realtime Database ---
Write-Host "[3/6] Exportando banco Firebase..." -ForegroundColor Yellow
$backupResult = firebase database:get / --output "$PASTA_BACKUP\firebase-db-backup.json" --project solucaoderua 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "    Banco exportado: firebase-db-backup.json OK" -ForegroundColor Green
} else {
    Write-Host "    [AVISO] Backup do banco falhou - continuando mesmo assim." -ForegroundColor Yellow
    Write-Host "    Motivo: $backupResult" -ForegroundColor DarkYellow
}

# --- 4. Build Vite (gera public/sdr-bundle.js) ---
if ($SkipBuild) {
    Write-Host "[4/6] Build Vite ignorado (flag -SkipBuild ativa)" -ForegroundColor Yellow
    Write-Host "      Usando sdr-bundle.js existente no repositorio" -ForegroundColor Yellow
} else {
    Write-Host "[4/6] Compilando modulos Vite..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] Build Vite falhou. Deploy cancelado." -ForegroundColor Red
        exit 1
    }
    Write-Host "    Build concluido: public/sdr-bundle.js OK" -ForegroundColor Green
}

# --- 5. Deploy das Security Rules do banco ---
Write-Host "[5/6] Deployando Security Rules do banco..." -ForegroundColor Yellow
firebase deploy --only database --project solucaoderua
if ($LASTEXITCODE -ne 0) {
    Write-Host "    [AVISO] Deploy das rules falhou - continuando com hosting." -ForegroundColor Yellow
} else {
    Write-Host "    Security Rules deployadas: database.rules.json OK" -ForegroundColor Green
}

# --- 6. Deploy no Firebase Hosting ---
Write-Host "[6/6] Iniciando deploy do hosting..." -ForegroundColor Yellow
firebase deploy --only hosting --project solucaoderua

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "   DEPLOY CONCLUIDO COM SUCESSO!" -ForegroundColor Green
Write-Host "   Backup salvo em: $PASTA_BACKUP" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
