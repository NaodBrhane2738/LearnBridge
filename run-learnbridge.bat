@echo off
cd /d "%~dp0"
echo Starting LearnBridge at http://127.0.0.1:4173
echo Press Ctrl+C to stop the local server.
start "LearnBridge" http://127.0.0.1:4173
py -3 -m http.server 4173 --bind 127.0.0.1
