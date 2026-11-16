@echo off
cd /d "%~dp0"
echo =======================================================
echo  Starting LearnBridge ALX Test Website & LMS Platform
echo  Author: pleaselogmein2738-4236 (pleaselogmein2738@gmail.com)
echo  Serving ALX Test Website at http://localhost:4173
echo =======================================================
start "" http://localhost:4173
py -m http.server 4173
pause
