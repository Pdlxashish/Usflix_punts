# Setup Localhost Access Script
# This script configures the app for localhost-only access

Write-Host "🔧 Setting up localhost access..." -ForegroundColor Cyan
Write-Host ""

# Update frontend .env
$frontendEnv = @"
# Frontend Environment Variables

# API Backend URL
VITE_API_URL=http://localhost:3001
"@

Write-Host "📝 Updating frontend .env..." -ForegroundColor Cyan
Set-Content -Path ".env" -Value $frontendEnv
Write-Host "✅ Frontend .env updated" -ForegroundColor Green
Write-Host ""

# Update backend .env
$backendEnvPath = "backend\.env"
$backendEnvContent = Get-Content $backendEnvPath -Raw

# Replace FRONTEND_URL line
$backendEnvContent = $backendEnvContent -replace 'FRONTEND_URL=.*', "FRONTEND_URL=http://localhost:8080"

Write-Host "📝 Updating backend .env..." -ForegroundColor Cyan
Set-Content -Path $backendEnvPath -Value $backendEnvContent
Write-Host "✅ Backend .env updated" -ForegroundColor Green
Write-Host ""

# Display instructions
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✨ Localhost Configuration Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "🖥️  Access from desktop:" -ForegroundColor Yellow
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
