@echo off
title PediCare AI - Lancement
color 0B

echo.
echo  ╔══════════════════════════════════════╗
echo  ║        PediCare AI - Demarrage       ║
echo  ╚══════════════════════════════════════╝
echo.

echo  [1/2] Demarrage du serveur backend...
start "PediCare - Serveur (port 5000)" cmd /k "cd /d %~dp0server && C:\npm.cmd run dev"

timeout /t 3 /nobreak >nul

echo  [2/2] Demarrage du client frontend...
start "PediCare - Client (port 5173)" cmd /k "cd /d %~dp0client && C:\npm.cmd run dev"

timeout /t 4 /nobreak >nul

echo.
echo  ✅ Tout est lance !
echo.
echo  Application : http://localhost:5173
echo  API         : http://localhost:5000
echo.
echo  Ouvrez votre navigateur sur : http://localhost:5173
echo.

start "" "http://localhost:5173"

pause
