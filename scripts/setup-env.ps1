# Create local environment files for development.

Write-Host "Setting up environment files..." -ForegroundColor Green

$JWT_SECRET = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

if (-not (Test-Path "backend\.env")) {
    Write-Host "Creating backend\.env..." -ForegroundColor Yellow

    $backendEnv = @"
# Backend Environment Variables
DATABASE_URL=postgresql://postgres:changeme@localhost:5432/usflix
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me-in-development
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:8080,https://localhost:8080,http://localhost:5173
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=4294967296
USE_CLOUD_STORAGE=false
"@

    $backendEnv | Out-File -FilePath "backend\.env" -Encoding UTF8
    Write-Host "Created backend\.env" -ForegroundColor Green
} else {
    Write-Host "backend\.env already exists, skipping." -ForegroundColor Yellow
}

if (-not (Test-Path ".env")) {
    Write-Host "Creating frontend .env..." -ForegroundColor Yellow

    $frontendEnv = @"
# Frontend Environment Variables
VITE_API_URL=http://localhost:3001
"@

    $frontendEnv | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "Created frontend .env" -ForegroundColor Green
} else {
    Write-Host ".env already exists, skipping." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Environment setup complete." -ForegroundColor Green
Write-Host "JWT secret generated for local development: $JWT_SECRET" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update DATABASE_URL if your local PostgreSQL credentials differ."
Write-Host "2. Keep JWT_SECRET private and never commit backend\.env."
Write-Host "3. Use DEPLOYMENT.md for production-specific settings."
