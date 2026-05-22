# PowerShell script to setup environment files for deployment

Write-Host "🚀 Setting up environment files..." -ForegroundColor Green

# Generate JWT secret
$JWT_SECRET = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Backend .env
if (-not (Test-Path "backend\.env")) {
    Write-Host "📝 Creating backend\.env..." -ForegroundColor Yellow
    
    $backendEnv = @"
# Backend Environment Variables

# PostgreSQL Database
DATABASE_URL=postgresql://postgres:changeme@localhost:5432/usflix

# JWT Authentication
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8080

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=4294967296

# Cloud Storage (Optional)
USE_CLOUD_STORAGE=false
"@
    
    $backendEnv | Out-File -FilePath "backend\.env" -Encoding UTF8
    Write-Host "✅ Created backend\.env" -ForegroundColor Green
} else {
    Write-Host "⚠️  backend\.env already exists, skipping..." -ForegroundColor Yellow
}

# Frontend .env
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating frontend .env..." -ForegroundColor Yellow
    
    $frontendEnv = @"
# Frontend Environment Variables

# API Backend URL
VITE_API_URL=http://localhost:3001
"@
    
    $frontendEnv | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Created frontend .env" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env already exists, skipping..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🔐 Your JWT Secret: $JWT_SECRET" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT:" -ForegroundColor Yellow
Write-Host "1. Update DATABASE_URL in backend\.env with your database credentials"
Write-Host "2. Keep your JWT_SECRET safe and never commit it to version control"
Write-Host "3. Update FRONTEND_URL and VITE_API_URL for production deployment"
Write-Host ""
