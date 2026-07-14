#!/bin/bash
# Pre-push security check script
# Run this before pushing to ensure no sensitive data is committed

echo "🔒 Running security checks before push..."

hasErrors=0

# Check 1: Verify .env files are not staged
echo ""
echo "📋 Check 1: Verifying .env files are ignored..."
envFiles=$(git ls-files | grep -E "\.env$" | grep -v ".env.example")
if [ -n "$envFiles" ]; then
    echo "❌ ERROR: .env files found in git:"
    echo "$envFiles" | sed 's/^/  - /'
    hasErrors=1
else
    echo "✅ No .env files tracked"
fi

# Check 2: Verify uploads directory is not staged
echo ""
echo "📋 Check 2: Verifying uploads directory is ignored..."
uploadFiles=$(git ls-files | grep "backend/uploads/")
if [ -n "$uploadFiles" ]; then
    echo "❌ ERROR: Upload files found in git:"
    echo "$uploadFiles" | sed 's/^/  - /'
    hasErrors=1
else
    echo "✅ No upload files tracked"
fi

# Check 3: Check for potential API keys in staged files
echo ""
echo "📋 Check 3: Scanning staged files for potential secrets..."
stagedFiles=$(git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx|json)$')
foundSecrets=0
for file in $stagedFiles; do
    if [ -f "$file" ]; then
        # Check for common secret patterns
        if grep -qE 'sk_live_|pk_live_|sk_test_[a-zA-Z0-9]{20,}|pk_test_[a-zA-Z0-9]{20,}' "$file"; then
            echo "⚠️  WARNING: Potential API key found in: $file"
            foundSecrets=1
        fi
        if grep -qE 'AKIA[0-9A-Z]{16}' "$file"; then
            echo "⚠️  WARNING: Potential AWS key found in: $file"
            foundSecrets=1
        fi
        if grep -qE "password\s*=\s*['\"][^'\"]{8,}['\"]|token\s*=\s*['\"][a-zA-Z0-9]{20,}['\"]" "$file"; then
            echo "⚠️  WARNING: Potential hardcoded password/token in: $file"
            foundSecrets=1
        fi
    fi
done
if [ $foundSecrets -eq 0 ]; then
    echo "✅ No obvious secrets detected in staged files"
fi

# Check 4: Verify .gitignore includes necessary patterns
echo ""
echo "📋 Check 4: Verifying .gitignore configuration..."
requiredPatterns=(".env" "backend/uploads" "*.pem" "*.key")
missingPatterns=()
for pattern in "${requiredPatterns[@]}"; do
    if ! grep -qF "$pattern" .gitignore; then
        missingPatterns+=("$pattern")
    fi
done
if [ ${#missingPatterns[@]} -gt 0 ]; then
    echo "⚠️  WARNING: Missing patterns in .gitignore:"
    printf '  - %s\n' "${missingPatterns[@]}"
else
    echo "✅ .gitignore properly configured"
fi

# Check 5: Verify sensitive files exist locally but are ignored
echo ""
echo "📋 Check 5: Verifying local .env files are ignored..."
if [ -f ".env" ] && git check-ignore ".env" > /dev/null 2>&1; then
    echo "✅ Frontend .env exists and is ignored"
elif [ -f ".env" ]; then
    echo "⚠️  WARNING: .env exists but may not be properly ignored!"
    hasErrors=1
fi

if [ -f "backend/.env" ] && git check-ignore "backend/.env" > /dev/null 2>&1; then
    echo "✅ Backend .env exists and is ignored"
elif [ -f "backend/.env" ]; then
    echo "⚠️  WARNING: backend/.env exists but may not be properly ignored!"
    hasErrors=1
fi

# Final result
echo ""
if [ $hasErrors -eq 1 ]; then
    echo "❌ Security check FAILED! Please fix the issues above before pushing."
    exit 1
else
    echo "✅ All security checks passed! Safe to push."
    exit 0
fi
