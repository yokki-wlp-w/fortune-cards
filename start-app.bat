@echo off
rem Double-click this file to start the app and open it in the browser.
cd /d "%~dp0"
echo Starting the app... Keep this window open while you use it.
start "" http://localhost:5173/
call npm run dev -- --port 5173 --strictPort
echo.
echo The app has stopped. If you see "Port 5173 is already in use", the app is already running - just use the browser.
pause
