# Setup Mobile Access Script
# This script configures the app for mobile device access

Write-Host "🔧 Setting up mobile access..." -ForegroundColor Cyan
Write-Host ""

# Get local IP address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" } | Select-Object -First 1).IPAddress

if (-not $localIP) {
    Write-Host "❌ Could not detect local IP address" -ForegroundColor Red
    Write-Host "Please check your network connection" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Detected local IP: $localIP" -ForegroundColor Green
Write-Host ""

# Update frontend .env
$frontendEnv = @"
# Frontend Environment Variables

# API Backend URL
# For mobile testing, use your computer's local IP address
# Change this to http://localhost:3001 when testing only on desktop
VITE_API_URL=http://${localIP}:3001
"@

Write-Host "📝 Updating frontend .env..." -ForegroundColor Cyan
Set-Content -Path ".env" -Value $frontendEnv
Write-Host "✅ Frontend .env updated" -ForegroundColor Green
Write-Host ""

# Update backend .env
$backendEnvPath = "backend\.env"
$backendEnvContent = Get-Content $backendEnvPath -Raw

# Replace FRONTEND_URL line
$backendEnvContent = $backendEnvContent -replace 'FRONTEND_URL=.*', "FRONTEND_URL=http://${localIP}:8080"

Write-Host "📝 Updating backend .env..." -ForegroundColor Cyan
Set-Content -Path $backendEnvPath -Value $backendEnvContent
Write-Host "✅ Backend .env updated" -ForegroundColor Green
Write-Host ""

# Display instructions
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✨ Mobile Access Configuration Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 Access from mobile device:" -ForegroundColor Yellow
Write-Host "   http://${localIP}:8080" -ForegroundColor White
Write-Host ""
Write-Host "🖥️  Desktop access still works:" -ForegroundColor Yellow
Write-Host "   http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT: Restart both servers for changes to take effect!" -ForegroundColor Red
Write-Host ""
Write-Host "To restart:" -ForegroundColor Yellow
Write-Host "  1. Stop both servers (Ctrl+C)" -ForegroundColor White
Write-Host "  2. Backend: cd backend && npm run dev" -ForegroundColor White
Write-Host "  3. Frontend: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
