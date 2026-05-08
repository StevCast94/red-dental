# restart-backend.ps1
# Reinicia el backend de RED Dental de forma segura
# NO mata procesos Node del agente OpenClaw
param(
    [switch]$Build,
    [switch]$Prod
)

$backendDir = "C:\Users\Admin\.openclaw\workspace\OrtodonciaPlus\backend"
$frontendDir = "C:\Users\Admin\.openclaw\workspace\OrtodonciaPlus\frontend"

Write-Host "=== Reiniciando RED Dental Backend ===" -ForegroundColor Cyan

# 1. Matar servidor existente por puerto (seguro)
Write-Host "Deteniendo servidor en puerto 5000..." -ForegroundColor Yellow
$pid = (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue).OwningProcess
if ($pid) {
    Stop-Process -Id $pid -Force
    Write-Host "  ✅ Proceso $pid detenido" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ No hay servidor corriendo en puerto 5000" -ForegroundColor Yellow
}
Start-Sleep -Seconds 2

# 2. Compilar si se pide
if ($Build) {
    Write-Host "Compilando backend..." -ForegroundColor Yellow
    Set-Location $backendDir
    $env:DATABASE_URL = "file:./dev.db"
    npx tsc 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error de compilación" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✅ Compilación exitosa" -ForegroundColor Green
}

# 3. Iniciar servidor
Write-Host "Iniciando servidor..." -ForegroundColor Yellow
Set-Location $backendDir

if ($Prod) {
    # Para probar contra producción, solo muestra health
    $health = Invoke-RestMethod -Uri "https://red-dental-production.up.railway.app/api/health" -TimeoutSec 10
    Write-Host "  🏭 Producción online: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} else {
    $env:DATABASE_URL = "file:./dev.db"
    Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$backendDir'; `$env:DATABASE_URL='file:./dev.db'; node dist/server.js`""
    Start-Sleep -Seconds 4
    
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($health) {
        Write-Host "  ✅ Backend local corriendo: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ No se pudo iniciar el servidor" -ForegroundColor Red
    }
}

Write-Host "=== Listo ===" -ForegroundColor Cyan
