# Start App - Launch both Backend and Frontend servers
# Run this script from the project root directory

Write-Host "🚀 Starting Memory Flix Application..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "backend") -or -not (Test-Path "package.json")) {
    Write-Host "❌ Error: This script must be run from the project root directory" -ForegroundColor Red
    Write-Host "   Current directory: $PWD" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Pre-flight checks..." -ForegroundColor Yellow

# Check if node_modules exist
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  Frontend dependencies not installed. Installing..." -ForegroundColor Yellow
    npm install
}

if (-not (Test-Path "backend/node_modules")) {
    Write-Host "⚠️  Backend dependencies not installed. Installing..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

Write-Host "✅ Dependencies checked" -ForegroundColor Green
Write-Host ""

# Function to start a process and return the job
function Start-ServiceProcess {
    param(
        [string]$Name,
        [string]$Command,
        [string]$WorkingDir,
        [string]$Color
    )
    
    Write-Host "🔄 Starting $Name..." -ForegroundColor $Color
    
    $job = Start-Job -ScriptBlock {
        param($dir, $cmd)
        Set-Location $dir
        Invoke-Expression $cmd
    } -ArgumentList $WorkingDir, $Command
    
    return $job
}

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Starting Services..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "1️⃣  Starting Backend Server (Port 3001)..." -ForegroundColor Magenta
$backendJob = Start-Job -ScriptBlock {
    Set-Location "$using:PWD\backend"
    npm run dev
}

Start-Sleep -Seconds 2

# Start Frontend
Write-Host "2️⃣  Starting Frontend Server (Port 8080)..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Green
Write-Host "✅ Services Started!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green
Write-Host ""

Write-Host "📊 Service Status:" -ForegroundColor Yellow
Write-Host "   Backend Job ID:  $($backendJob.Id)" -ForegroundColor Gray
Write-Host "   Frontend Job ID: $($frontendJob.Id)" -ForegroundColor Gray
Write-Host ""

Write-Host "🌐 Access your application:" -ForegroundColor Cyan
Write-Host "   Login Page:  https://localhost:8080/login" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "   Home Page:   https://localhost:8080/" -ForegroundColor White
Write-Host "   Backend API: http://localhost:3001/api" -ForegroundColor Gray
Write-Host ""

Write-Host "⚠️  Note: You'll see a browser security warning (self-signed SSL)" -ForegroundColor Yellow
Write-Host "   Click 'Advanced' → 'Proceed to localhost' to continue" -ForegroundColor Yellow
Write-Host ""

Write-Host "📝 View Logs:" -ForegroundColor Cyan
Write-Host "   Backend:  Receive-Job -Id $($backendJob.Id) -Keep" -ForegroundColor Gray
Write-Host "   Frontend: Receive-Job -Id $($frontendJob.Id) -Keep" -ForegroundColor Gray
Write-Host ""

Write-Host "🛑 To Stop Services:" -ForegroundColor Red
Write-Host "   Stop-Job -Id $($backendJob.Id)" -ForegroundColor Gray
Write-Host "   Stop-Job -Id $($frontendJob.Id)" -ForegroundColor Gray
Write-Host "   Or press Ctrl+C to stop this script" -ForegroundColor Gray
Write-Host ""

Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Green
Write-Host "🎉 Application is ready!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green
Write-Host ""
Write-Host "Open your browser and go to: https://localhost:8080/login" -ForegroundColor White -BackgroundColor DarkGreen
Write-Host ""

# Keep script running and show logs
Write-Host "📜 Live Logs (Press Ctrl+C to stop):" -ForegroundColor Cyan
Write-Host ""

try {
    while ($true) {
        # Show backend logs
        $backendLogs = Receive-Job -Id $backendJob.Id
        if ($backendLogs) {
            Write-Host "[BACKEND] $backendLogs" -ForegroundColor Magenta
        }
        
        # Show frontend logs
        $frontendLogs = Receive-Job -Id $frontendJob.Id
        if ($frontendLogs) {
            Write-Host "[FRONTEND] $frontendLogs" -ForegroundColor Cyan
        }
        
        Start-Sleep -Seconds 1
        
        # Check if jobs are still running
        if ($backendJob.State -ne "Running") {
            Write-Host "⚠️  Backend job stopped!" -ForegroundColor Red
            break
        }
        if ($frontendJob.State -ne "Running") {
            Write-Host "⚠️  Frontend job stopped!" -ForegroundColor Red
            break
        }
    }
}
finally {
    Write-Host ""
    Write-Host "🛑 Stopping services..." -ForegroundColor Red
    Stop-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
    Stop-Job -Id $frontendJob.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $frontendJob.Id -ErrorAction SilentlyContinue
    Write-Host "✅ Services stopped" -ForegroundColor Green
}
