# Red Dental — Inicio local (SQLite)
param(
    [string]$Port = "5000"
)

$ErrorActionPreference = "Stop"
$backend = "C:\Users\Admin\.openclaw\workspace\OrtodonciaPlus\backend"
$frontend = "C:\Users\Admin\.openclaw\workspace\OrtodonciaPlus\frontend"
$env:PORT = $Port

Write-Host "🔧 Red Dental - Iniciando..." -ForegroundColor Cyan

# Build frontend si no existe
if (-not (Test-Path "$frontend\dist\index.html")) {
    Write-Host "📦 Compilando frontend..." -ForegroundColor Yellow
    Push-Location $frontend
    npm run build
    Pop-Location
    Write-Host "✅ Frontend compilado" -ForegroundColor Green
}

# Generar Prisma client y aplicar migraciones
Push-Location $backend
npx prisma generate 2>&1 | Out-Null
Write-Host "✅ Prisma client generado" -ForegroundColor Green

# Si la DB es SQLite local, aplicar push
$dbUrl = [System.Environment]::GetEnvironmentVariable("DATABASE_URL")
if (-not $dbUrl -or $dbUrl.StartsWith("file:")) {
    npx prisma db push 2>&1 | Out-Null
    Write-Host "✅ DB SQLite sincronizada" -ForegroundColor Green
}
Pop-Location

# Iniciar servidor
Write-Host "🚀 Servidor en http://localhost:$Port" -ForegroundColor Cyan
node "$backend\dist\server.js"
