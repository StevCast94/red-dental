@echo off
REM restart-frontend.bat — Reinicia SOLO el frontend de Red Dental

echo Deteniendo frontend en puerto 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173"') do (
  if not "%%a"=="" (
    taskkill /PID %%a /F >nul 2>&1
    echo Proceso %%a detenido
  )
)

timeout /t 2 /nobreak >nul

echo Iniciando frontend...
cd /d "%~dp0frontend"
start /B npx vite --port 5173
echo Frontend iniciado en puerto 5173
