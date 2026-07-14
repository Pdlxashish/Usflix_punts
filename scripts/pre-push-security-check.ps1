#!/usr/bin/env pwsh
# Pre-push security check script
# Run this before pushing to ensure no sensitive data is committed

Write-Host "Running security checks before push..." -ForegroundColor Cyan

$hasErrors = $false

# Check 1: Verify .env files are not staged
Write-Host "`nCheck 1: Verifying .env files are ignored..." -ForegroundColor Yellow
$envFiles = git ls-files | Select-String -Pattern "\.env$" | Select-String -Pattern ".env.example" -NotMatch
if ($envFiles) {
    Write-Host "ERROR: .env files found in git:" -ForegroundColor Red
    $envFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    $hasErrors = $true
} else {
    Write-Host "No .env files tracked" -ForegroundColor Green
}

# Check 2: Verify uploads directory is not staged
Write-Host "`nCheck 2: Verifying uploads directory is ignored..." -ForegroundColor Yellow
$uploadFiles = git ls-files | Select-String -Pattern "backend/uploads/"
if ($uploadFiles) {
    Write-Host "ERROR: Upload files found in git:" -ForegroundColor Red
    $uploadFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    $hasErrors = $true
} else {
    Write-Host "No upload files tracked" -ForegroundColor Green
}

# Check 3: Check for potential API keys in staged files
Write-Host "`nCheck 3: Scanning staged files for potential secrets..." -ForegroundColor Yellow
$stagedFiles = git diff --cached --name-only | Where-Object { $_ -match '\.(ts|tsx|js|jsx|json)$' }
$foundSecrets = $false
foreach ($file in $stagedFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        # Check for common secret patterns
        if ($content -match 'sk_live_|pk_live_|sk_test_[a-zA-Z0-9]+|pk_test_[a-zA-Z0-9]+') {
            Write-Host "WARNING: Potential API key found in: $file" -ForegroundColor Red
            $foundSecrets = $true
        }
        if ($content -match 'AKIA[0-9A-Z]+') {
            Write-Host "WARNING: Potential AWS key found in: $file" -ForegroundColor Red
            $foundSecrets = $true
        }
    }
}
if (-not $foundSecrets) {
    Write-Host "No obvious secrets detected in staged files" -ForegroundColor Green
}

# Check 4: Verify .gitignore includes necessary patterns
Write-Host "`nCheck 4: Verifying .gitignore configuration..." -ForegroundColor Yellow
$gitignore = Get-Content .gitignore -Raw
$requiredPatterns = @('.env', 'backend/uploads', '*.pem', '*.key')
$missingPatterns = @()
foreach ($pattern in $requiredPatterns) {
    if ($gitignore -notmatch [regex]::Escape($pattern)) {
        $missingPatterns += $pattern
    }
}
if ($missingPatterns.Count -gt 0) {
    Write-Host "WARNING: Missing patterns in .gitignore:" -ForegroundColor Yellow
    $missingPatterns | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
} else {
    Write-Host ".gitignore properly configured" -ForegroundColor Green
}

# Check 5: Verify sensitive files exist locally but are ignored
Write-Host "`nCheck 5: Verifying local .env files are ignored..." -ForegroundColor Yellow
if ((Test-Path ".env") -and (git check-ignore ".env")) {
    Write-Host "Frontend .env exists and is ignored" -ForegroundColor Green
} elseif (Test-Path ".env") {
    Write-Host "WARNING: .env exists but may not be properly ignored!" -ForegroundColor Red
    $hasErrors = $true
}

if ((Test-Path "backend/.env") -and (git check-ignore "backend/.env")) {
    Write-Host "Backend .env exists and is ignored" -ForegroundColor Green
} elseif (Test-Path "backend/.env") {
    Write-Host "WARNING: backend/.env exists but may not be properly ignored!" -ForegroundColor Red
    $hasErrors = $true
}

# Final result
Write-Host ""
if ($hasErrors) {
    Write-Host "Security check FAILED! Please fix the issues above before pushing." -ForegroundColor Red
    exit 1
} else {
    Write-Host "All security checks passed! Safe to push." -ForegroundColor Green
    exit 0
}
