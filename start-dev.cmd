@echo off
echo ========================================
echo Memory Flix - Development Server
echo ========================================
echo.

echo Checking FFmpeg...
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: FFmpeg not found! Video thumbnails won't work.
    echo Install: choco install ffmpeg
    echo.
)

echo Starting backend server...
start "Memory Flix Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting frontend server...
start "Memory Flix Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo Servers Starting...
echo ========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:8080
echo.
echo Two terminal windows will open.
echo Close this window or press Ctrl+C to exit.
echo.
pause
