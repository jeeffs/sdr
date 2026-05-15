# bump-sw.ps1 — incrementa AMBAS as versões do Service Worker
$swPath = "public\sw.js"
$swContent = Get-Content $swPath -Raw -Encoding UTF8

# CACHE_NAME (formato: 'sdr-v\d+' sem 'shell' depois)
$nameVer = ([regex]::Match($swContent, "sdr-v(\d+)'")).Groups[1].Value
if ($nameVer) {
    $newName = [int]$nameVer + 1
    $swContent = $swContent -replace "sdr-v$nameVer'", "sdr-v$newName'"
    Write-Host "CACHE_NAME:  sdr-v$nameVer -> sdr-v$newName" -ForegroundColor Green
}

# CACHE_SHELL (formato: 'sdr-shell-v\d+')
$shellVer = ([regex]::Match($swContent, "sdr-shell-v(\d+)")).Groups[1].Value
if ($shellVer) {
    $newShell = [int]$shellVer + 1
    $swContent = $swContent -replace "sdr-shell-v$shellVer", "sdr-shell-v$newShell"
    Write-Host "CACHE_SHELL: sdr-shell-v$shellVer -> sdr-shell-v$newShell" -ForegroundColor Green
}

[System.IO.File]::WriteAllText("$pwd\$swPath", $swContent, [System.Text.UTF8Encoding]::new($false))
