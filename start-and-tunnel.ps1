# start-and-tunnel.ps1 - Arranca Red Dental + Tunel Cloudflare
Write-Host "=== Iniciando Red Dental ==="

# 1. Backend
$bk = Get-Job -Name "rd-backend" -ErrorAction SilentlyContinue
if (-not $bk -or $bk.State -ne "Running") {
  Write-Host "[1/4] Backend..."
  Start-Job -Name "rd-backend" -ScriptBlock {
    $env:PORT="5000"
    Set-Location "C:\Users\Admin\.openclaw\workspace\OrtodonciaPlus\backend"
    node dist/server.js
  } | Out-Null
  Start-Sleep 3
}

# 2. Frontend
$fe = Get-Job -Name "rd-frontend" -ErrorAction SilentlyContinue
if (-not $fe -or $fe.State -ne "Running") {
  Write-Host "[2/4] Frontend..."
  Start-Job -Name "rd-frontend" -ScriptBlock {
    Set-Location "C:\Users\Admin\.openclaw\workspace\OrtodonciaPlus\frontend"
    npx vite --port 5173
  } | Out-Null
  Start-Sleep 5
}

# 3. Esperar backend + frontend
$maxWait = 10
$waited = 0
while ($waited -lt $maxWait) {
  $bOk = $false
  $fOk = $false
  try { $r = Invoke-WebRequest "http://127.0.0.1:5000/api/health" -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { $bOk = $true } } catch {}
  try { $r = Invoke-WebRequest "http://127.0.0.1:5173/" -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { $fOk = $true } } catch {}
  if ($bOk -and $fOk) { Write-Host "   Backend+Frontend OK"; break }
  Start-Sleep 1
  $waited++
}

# 4. Proxy
Write-Host "[3/4] Proxy en 8080..."
Remove-Job -Name "rd-proxy" -Force -ErrorAction SilentlyContinue
Start-Job -Name "rd-proxy" -ScriptBlock {
  Set-Location "C:\Users\Admin\.openclaw\workspace\OrtodonciaPlus"
  node proxy.js
} | Out-Null
Start-Sleep 2

# Verificar proxy
$waited = 0
while ($waited -lt 8) {
  try { $r = Invoke-WebRequest "http://127.0.0.1:8080/" -UseBasicParsing -TimeoutSec 2; Write-Host "   Proxy OK: $($r.StatusCode)"; break } catch {}
  Start-Sleep 1
  $waited++
}

# 5. Tunnel Cloudflare
Write-Host "[4/4] Tunnel Cloudflare..."
Remove-Job -Name "rd-tunnel" -Force -ErrorAction SilentlyContinue
$cfPath = "C:\Users\Admin\.openclaw\workspace\cloudflared.exe"
$logFile = "C:\Users\Admin\.openclaw\workspace\cloudflared.log"
Remove-Item $logFile -ErrorAction SilentlyContinue

Start-Job -Name "rd-tunnel" -ScriptBlock {
  param($cf, $log)
  & $cf tunnel --url http://localhost:8080 *>> $log
} -ArgumentList $cfPath, $logFile | Out-Null

Start-Sleep 10

$log = Get-Content $logFile -ErrorAction SilentlyContinue
$urlLine = $log | Select-String "https://.*trycloudflare.com"
if ($urlLine) {
  $url = ($urlLine -replace '.*\s+(https://\S+).*','$1').Trim()
  Write-Host ""
  Write-Host "========================================"
  Write-Host "  RED DENTAL - TUNEL ACTIVO"
  Write-Host "  Link: $url"
  Write-Host "========================================"
  Write-Host "Servicios:"
  Write-Host "  Backend:  http://localhost:5000"
  Write-Host "  Frontend: http://localhost:5173"
  Write-Host "  Proxy:    http://localhost:8080"
} else {
  Write-Host "No se pudo leer la URL del tunel"
  $log | Select-Object -Last 10
}