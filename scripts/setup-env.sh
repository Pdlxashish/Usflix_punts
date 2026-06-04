#!/bin/bash
set -euo pipefail

echo "Setting up environment files..."

JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

if [ ! -f backend/.env ]; then
    echo "Creating backend/.env..."
    cat > backend/.env << EOF
# Backend Environment Variables
DATABASE_URL=postgresql://postgres:changeme@localhost:5432/usflix
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me-in-development
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:8080,https://localhost:8080,http://localhost:5173
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=4294967296
USE_CLOUD_STORAGE=false
EOF
    echo "Created backend/.env"
else
    echo "backend/.env already exists, skipping."
fi

if [ ! -f .env ]; then
    echo "Creating frontend .env..."
    cat > .env << EOF
# Frontend Environment Variables
VITE_API_URL=http://localhost:3001
EOF
    echo "Created frontend .env"
else
    echo ".env already exists, skipping."
fi

echo ""
echo "Environment setup complete."
echo "JWT secret generated for local development: ${JWT_SECRET}"
echo ""
echo "Next steps:"
echo "1. Update DATABASE_URL if your local PostgreSQL credentials differ."
echo "2. Keep JWT_SECRET private and never commit backend/.env."
echo "3. Use DEPLOYMENT.md for production-specific settings."
