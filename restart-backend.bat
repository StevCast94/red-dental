@echo off
REM restart-backend.bat — Reinicia SOLO el backend de Red Dental
REM Ejecutar desde la carpeta del proyecto

echo Deteniendo backend en puerto 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000"') do (
  if not "%%a"=="" (
    taskkill /PID %%a /F >nul 2>&1
    echo Proceso %%a detenido
  )
)

timeout /t 2 /nobreak >nul

echo Iniciando backend...
cd /d "%~dp0backend"
start /B node dist/server.js
echo Backend iniciado en puerto 5000
