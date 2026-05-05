@echo off
REM start-all.bat — Arranca backend + frontend de Red Dental
REM Cada uno en su propia ventana

echo ========================================
echo  Red Dental - Iniciando servicios
echo ========================================

echo [1/2] Iniciando backend (puerto 5000)...
cd /d "%~dp0backend"
start "Backend - Red Dental" cmd /c "echo Backend en http://localhost:5000 && node dist/server.js && pause"

timeout /t 2 /nobreak >nul

echo [2/2] Iniciando frontend (puerto 5173)...
cd /d "%~dp0frontend"
start "Frontend - Red Dental" cmd /c "echo Frontend en http://localhost:5173 && npx vite --port 5173 && pause"

echo.
echo ========================================
echo  Servicios iniciados:
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:5173
echo ========================================
echo  Para detener, cierra las ventanas.
echo ========================================
