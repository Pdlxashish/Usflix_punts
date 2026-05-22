@echo off
echo ========================================
echo Memory Flix - Installing Dependencies
echo ========================================
echo.

echo [1/3] Checking FFmpeg installation...
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: FFmpeg is not installed!
    echo.
    echo FFmpeg is required for video thumbnail generation.
    echo Please install it using one of these methods:
    echo.
    echo   1. Using Chocolatey: choco install ffmpeg
    echo   2. Download from: https://ffmpeg.org/download.html
    echo.
    echo After installation, add FFmpeg to your PATH and run this script again.
    echo.
    pause
    exit /b 1
) else (
    echo ✓ FFmpeg is installed
)
echo.

echo [2/3] Installing backend dependencies...
cd backend
if not exist "node_modules" (
    echo Installing backend packages...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install backend dependencies
        pause
        exit /b 1
    )
) else (
    echo Updating backend packages...
    call npm install
)
cd ..
echo ✓ Backend dependencies installed
echo.

echo [3/3] Installing frontend dependencies...
if not exist "node_modules" (
    echo Installing frontend packages...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install frontend dependencies
        pause
        exit /b 1
    )
) else (
    echo Frontend dependencies already installed
)
echo ✓ Frontend dependencies installed
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Configure backend/.env (see backend/.env.example)
echo   2. Configure .env (see .env.example)
echo   3. Run: npm run dev (in two terminals - one for backend, one for frontend)
echo.
echo For mobile access:
echo   1. Find your IP: ipconfig
echo   2. Update .env: VITE_API_URL=http://YOUR_IP:3001
echo.
echo See THUMBNAIL_FIX_GUIDE.md for detailed instructions.
echo.
pause
