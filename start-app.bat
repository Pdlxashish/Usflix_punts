@echo off
echo.
echo ==========================================
echo   Starting Memory Flix Application
echo ==========================================
echo.

REM Start Backend in new window
echo [1/2] Starting Backend Server (Port 3001)...
start "Backend Server" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul

REM Start Frontend in new window
echo [2/2] Starting Frontend Server (Port 8080)...
start "Frontend Server" cmd /k "npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ==========================================
echo   Services Started Successfully!
echo ==========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: https://localhost:8080
echo.
echo Login Page: https://localhost:8080/login
echo.
echo Note: You'll see a browser security warning.
echo       Click 'Advanced' then 'Proceed to localhost'
echo.
echo Close the Backend and Frontend windows to stop the servers.
echo.
pause
