@echo off
cd /d C:\Users\Admin\.openclaw\workspace\OrtodonciaPlus\backend
:: Esperar a que PostgreSQL termine de iniciar
timeout /t 5 /nobreak >nul
:: Iniciar PM2 si no está corriendo
C:\Users\Admin\AppData\Roaming\npm\pm2.cmd resurrect 2>nul || C:\Users\Admin\AppData\Roaming\npm\pm2.cmd start ecosystem.config.js
