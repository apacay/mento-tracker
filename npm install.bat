@echo off
cd /d "%~dp0"
echo Instalando dependencias...
npm install express sqlite3 cors
echo Instalación completada.
pause
