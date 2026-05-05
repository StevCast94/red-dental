# Red Dental - Script Vigilante
# Corre en loop: cada 30s verifica que todo esté vivo
# Si algo se cae, lo reinicia automáticamente
# Ejecutar: Start-Process -WindowStyle Hidden powershell -ArgumentList "-NoProfile -File vigilante.ps1"

$workspace = "C:\Users\Admin\.openclaw\workspace\OrtodonciaPlus"
$cloudflared = "C:\Users\Admin\.openclaw\workspace\cloudflared.exe"

function Ensure-ProcessOnPort {
  param($Port, $Label, $ScriptBlock)
  $entry = netstat -ano | Select-String ":$Port " | Select-String "LISTENING" | Select-Object -First 1
  if (-not $entry) {
    Write-Host "[$(Get-Date -Format HH:mm:ss)] $Label caído en puerto $Port. Reiniciando..."
    Invoke-Command -ScriptBlock $ScriptBlock
    Start-Sleep 4
  }
}

function Ensure-Cloudflared {
  $proc = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
  if (-not $proc -or $proc.HasExited) {
    Write-Host "[$(Get-Date -Format HH:mm:ss)] cloudflared caído. Reiniciando..."
    Start-Process -NoNewWindow -FilePath $cloudflared -ArgumentList "tunnel --protocol quic --url http://127.0.0.1:5000" -RedirectStandardOutput "$workspace\cloudflared_out.txt"
    Start-Sleep 8
  } else {
    # Verificar que el túnel responde - probar health
    try {
      $log = Get-Content "$workspace\cloudflared_out.txt" -Raw -ErrorAction SilentlyContinue
      $regex = [regex] 'https://[a-z-]+\.trycloudflare\.com'
      $match = $regex.Match($log)
      if ($match.Success) {
        $url = $match.Value
        $r = Invoke-WebRequest "$url/api/health" -UseBasicParsing -TimeoutSec 5
        if ($r.StatusCode -eq 200) { return $url }
      }
    } catch { }
    # Si llegó aquí, matar y reiniciar
    Write-Host "[$(Get-Date -Format HH:mm:ss)] cloudflared no responde. Reiniciando..."
    $proc | Stop-Process -Force
    Start-Sleep 2
    Start-Process -NoNewWindow -FilePath $cloudflared -ArgumentList "tunnel --protocol quic --url http://127.0.0.1:5000" -RedirectStandardOutput "$workspace\cloudflared_out.txt"
    Start-Sleep 8
  }
  return $null
}

Write-Host "🧠 Vigilante de Red Dental iniciado"
Write-Host "Ctrl+C para detener (desde la consola)"
Write-Host "---"

while ($true) {
  Ensure-ProcessOnPort -Port 5000 -Label "Backend" -ScriptBlock {
    Set-Location "$workspace\backend"
    Start-Process -WindowStyle Hidden powershell -ArgumentList "-NoProfile -Command `"`$env:PORT='5000'; node dist/server.js`""
  }
  
  Ensure-ProcessOnPort -Port 5173 -Label "Frontend" -ScriptBlock {
    Set-Location "$workspace\frontend"
    Start-Process -WindowStyle Hidden powershell -ArgumentList "-NoProfile -Command `"npx vite --port 5173 --host`""
  }
  
  $url = Ensure-Cloudflared
  
  Start-Sleep 30
}
