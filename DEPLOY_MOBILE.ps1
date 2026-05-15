# SDR — Deploy Mobile (com validação de integridade e smoke test)
# Execute: botão direito → "Executar com PowerShell"
#
# Mudanças desta versão (15/05/2026):
#   - [1/5] Valida APP\interface\mobile.html ANTES de qualquer cópia
#           (trunca? script não fecha? aborta sem tocar em produção)
#   - [5/5] Smoke test em https://solucaoderua.web.app após deploy
#           (se algo estiver quebrado, mostra como reverter)
#
# Comportamento: idêntico ao anterior quando tudo está OK.
# Diferença: bloqueia o deploy se o arquivo estiver corrompido.

# ── Setup ─────────────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$SDR         = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobile      = Join-Path $SDR "APP\interface\mobile.html"
$publicIndex = Join-Path $SDR "public\index.html"
$backupDir   = Join-Path $SDR "BACKUP"
$backup      = Join-Path $backupDir "index.html.antes-mobile-$(Get-Date -Format 'yyyyMMdd-HHmm')"

# Garante que BACKUP\ existe
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

function Stop-WithError {
    param([string]$Reason, [string]$Fix)
    Write-Host ""
    Write-Host "❌ ABORTADO: $Reason" -ForegroundColor Red
    if ($Fix) {
        Write-Host "" 
        Write-Host "Como resolver:" -ForegroundColor Yellow
        Write-Host "  $Fix" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Produção NÃO foi afetada — nada foi enviado ao Firebase." -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Pressione Enter para fechar"
    exit 1
}

Write-Host ""
Write-Host "=== SDR Deploy Mobile ===" -ForegroundColor Cyan
Write-Host ""

# ── [1/5] Validar mobile.html origem ──────────────────────────────────────
Write-Host "[1/5] Validando integridade de APP\interface\mobile.html..." -ForegroundColor Yellow

if (-not (Test-Path $mobile)) {
    Stop-WithError -Reason "Arquivo $mobile não encontrado." `
                   -Fix    "Verifique se a pasta APP\interface\ existe e contém mobile.html."
}

$size    = (Get-Item $mobile).Length
$content = Get-Content $mobile -Raw -Encoding UTF8

# Tamanho plausível (mobile.html hoje > 430KB; ajuste se o app encolher legitimamente)
if ($size -lt 400000) {
    Stop-WithError -Reason "mobile.html só tem $size bytes (esperado > 400KB)." `
                   -Fix    "Restaure de BACKUP\ ou do histórico de versões do Firebase Hosting:`n  Firebase Console → Hosting → Histórico de versões → Reverter"
}

# Fecha com </html>?
$trimmed = $content.TrimEnd()
if (-not $trimmed.EndsWith("</html>")) {
    $lastChars = $trimmed.Substring([Math]::Max(0, $trimmed.Length - 80))
    Stop-WithError -Reason "mobile.html NÃO termina com </html> — provavelmente truncado.`n         Últimos 80 chars: ...$lastChars" `
                   -Fix    "O arquivo está corrompido. Restaure de:`n  - BACKUP\index.html.antes-mobile-* (mais recente válido), OU`n  - Firebase Console → Hosting → versão anterior"
}

# Tags <script> balanceadas?
$open  = ([regex]::Matches($content, '<script(?:\s|>)')).Count
$close = ([regex]::Matches($content, '</script>')).Count
if ($open -ne $close) {
    Stop-WithError -Reason "Tags <script> desbalanceadas: $open abertas vs $close fechadas." `
                   -Fix    "Há JavaScript não fechado no arquivo — provavelmente truncamento.`nRestaure de BACKUP\ ou do Firebase Hosting."
}

# Bloco crítico de auth presente? (assinatura textual conhecida)
if ($content -notmatch 'firebase\.initializeApp') {
    Stop-WithError -Reason "mobile.html não contém firebase.initializeApp — arquivo incompleto." `
                   -Fix    "Verifique APP\interface\mobile.html. Algo grave aconteceu."
}

Write-Host "      ✓ $([math]::Round($size/1KB)) KB · $open scripts pareados · fecha em </html>" -ForegroundColor Green

# ── [2/5] Backup ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/5] Backup do public\index.html atual..." -ForegroundColor Yellow

if (Test-Path $publicIndex) {
    Copy-Item $publicIndex $backup -Force
    Write-Host "      ✓ Salvo: $backup" -ForegroundColor Green
} else {
    Write-Host "      ⚠ public\index.html não existe (primeiro deploy?) — pulando backup" -ForegroundColor DarkYellow
}

# ── [3/5] Copia mobile.html → public\index.html ───────────────────────────
Write-Host ""
Write-Host "[3/5] Copiando mobile.html → public\index.html..." -ForegroundColor Yellow

Copy-Item $mobile $publicIndex -Force
$copiedSize = (Get-Item $publicIndex).Length
if ($copiedSize -ne $size) {
    Stop-WithError -Reason "Cópia incompleta: origem=$size bytes, destino=$copiedSize bytes." `
                   -Fix    "Algo interrompeu a cópia. Tente de novo. Se persistir, verifique permissões em public\."
}
Write-Host "      ✓ Tamanho: $([math]::Round($copiedSize/1KB)) KB" -ForegroundColor Green

# ── [4/5] Firebase deploy ─────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/5] Firebase deploy..." -ForegroundColor Yellow
Set-Location $SDR

$deployOk = $false
try {
    firebase deploy --only hosting
    if ($LASTEXITCODE -eq 0) { $deployOk = $true }
} catch {
    Write-Host ""
    Write-Host "❌ Erro ao executar firebase: $($_.Exception.Message)" -ForegroundColor Red
}

if (-not $deployOk) {
    Write-Host ""
    Write-Host "❌ Deploy falhou. Verifique:" -ForegroundColor Red
    Write-Host "   - firebase login (token válido?)" -ForegroundColor Yellow
    Write-Host "   - conexão de internet" -ForegroundColor Yellow
    Write-Host "   - firebase --version (instalado?)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Produção mantém versão anterior. Backup local: $backup" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Pressione Enter para fechar"
    exit 1
}

# ── [5/5] Smoke test em produção ──────────────────────────────────────────
Write-Host ""
Write-Host "[5/5] Smoke test em https://solucaoderua.web.app ..." -ForegroundColor Yellow
Start-Sleep -Seconds 6  # aguarda propagação no CDN

$smokeOk = $false
try {
    $resp = Invoke-WebRequest -Uri "https://solucaoderua.web.app/" -UseBasicParsing -TimeoutSec 15
    $body = $resp.Content

    $checks = @{
        "Status 200"        = ($resp.StatusCode -eq 200)
        "Tamanho > 400KB"   = ($body.Length -gt 400000)
        "Fecha em </html>"  = ($body.TrimEnd().EndsWith("</html>"))
        "Tem firebase init" = ($body -match 'firebase\.initializeApp')
    }

    $allOk = $true
    foreach ($k in $checks.Keys) {
        if ($checks[$k]) {
            Write-Host "      ✓ $k" -ForegroundColor Green
        } else {
            Write-Host "      ✗ $k — FALHOU" -ForegroundColor Red
            $allOk = $false
        }
    }
    $smokeOk = $allOk
} catch {
    Write-Host "      ✗ Não consegui acessar o site: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
if ($smokeOk) {
    Write-Host "✅ Deploy concluído e validado!" -ForegroundColor Green
    Write-Host "   https://solucaoderua.web.app" -ForegroundColor Cyan
    Write-Host "   Backup desta versão: $backup" -ForegroundColor DarkGray
} else {
    Write-Host "⚠ DEPLOY FEITO mas SMOKE TEST FALHOU." -ForegroundColor Red
    Write-Host ""
    Write-Host "A produção pode estar quebrada. Opções de rollback:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. Firebase Console (mais seguro):" -ForegroundColor Cyan
    Write-Host "     https://console.firebase.google.com/project/solucaoderua/hosting" -ForegroundColor White
    Write-Host "     → Histórico de versões → 'Reverter' na versão anterior" -ForegroundColor White
    Write-Host ""
    Write-Host "  2. Restaurar local + redeploy:" -ForegroundColor Cyan
    Write-Host "     Copy-Item `"$backup`" `"$publicIndex`" -Force" -ForegroundColor White
    Write-Host "     Copy-Item `"$backup`" `"$mobile`" -Force" -ForegroundColor White
    Write-Host "     firebase deploy --only hosting" -ForegroundColor White
}

Write-Host ""
Read-Host "Pressione Enter para fechar"
