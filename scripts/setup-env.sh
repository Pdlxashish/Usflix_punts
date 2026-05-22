#!/bin/bash
# Setup environment files for deployment

echo "🚀 Setting up environment files..."

# Generate JWT secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Backend .env
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env..."
    cat > backend/.env << EOF
# Backend Environment Variables

# PostgreSQL Database
DATABASE_URL=postgresql://postgres:changeme@localhost:5432/usflix

# JWT Authentication
JWT_SECRET=${JWT_SECRET}
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
EOF
    echo "✅ Created backend/.env"
else
    echo "⚠️  backend/.env already exists, skipping..."
fi

# Frontend .env
if [ ! -f .env ]; then
    echo "📝 Creating frontend .env..."
    cat > .env << EOF
# Frontend Environment Variables

# API Backend URL
VITE_API_URL=http://localhost:3001
EOF
    echo "✅ Created frontend .env"
else
    echo "⚠️  .env already exists, skipping..."
fi

echo ""
echo "✅ Environment setup complete!"
echo ""
echo "🔐 Your JWT Secret: ${JWT_SECRET}"
echo ""
echo "⚠️  IMPORTANT:"
echo "1. Update DATABASE_URL in backend/.env with your database credentials"
echo "2. Keep your JWT_SECRET safe and never commit it to version control"
echo "3. Update FRONTEND_URL and VITE_API_URL for production deployment"
echo ""
