@echo off
cd /d "%~dp0"
echo Iniciando ColorMix Server...
start http://localhost:3000
npm run dev
pause
