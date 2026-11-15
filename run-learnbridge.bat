@echo off
cd /d "%~dp0"
echo Starting LearnBridge on port 4173 (0.0.0.0 - accessible from anywhere)
echo Press Ctrl+C to stop server.
start "LearnBridge" http://localhost:4173
py -3 -m http.server 4173 --bind 0.0.0.0
