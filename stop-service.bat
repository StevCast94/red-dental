@echo off
REM stop-service.bat [puerto] — Detiene un proceso por puerto
REM stop-service.bat 5000  → mata backend
REM stop-service.bat 5173  → mata frontend
REM stop-service.bat all   → mata ambos

if "%1"=="" (
  echo Uso: stop-service.bat [puerto|all]
  echo   stop-service.bat 5000   - Detiene backend
  echo   stop-service.bat 5173   - Detiene frontend
  echo   stop-service.bat all    - Detiene ambos
  exit /b 1
)

if "%1"=="all" (
  echo Deteniendo backend (puerto 5000)...
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000"') do (
    if not "%%a"=="" taskkill /PID %%a /F >nul 2>&1
  )
  echo Deteniendo frontend (puerto 5173)...
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173"') do (
    if not "%%a"=="" taskkill /PID %%a /F >nul 2>&1
  )
  echo Servicios detenidos.
  exit /b 0
)

echo Buscando proceso en puerto %1...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%1"') do (
  if not "%%a"=="" (
    taskkill /PID %%a /F >nul 2>&1
    echo Proceso %%a detenido (puerto %1)
  ) else (
    echo No se encontro proceso en puerto %1
  )
)
