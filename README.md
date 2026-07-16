# USFLIX

A personal memory streaming app for photos, videos, voice notes, albums, profiles, and comments.

## Stack

- **Frontend**: React 19, TanStack Start/Router, Vite, Tailwind CSS, Radix UI
- **Backend**: Express, TypeScript, PostgreSQL, JWT authentication, Multer uploads
- **Deployment**: Cloudflare Workers (frontend) + Fly.io (backend)

## Project Structure

```
backend/        Express API, database, auth, file uploads
src/            TanStack Start frontend app
public/         PWA assets and static files
scripts/        Setup and utility scripts
shared/         Shared TypeScript types
```

## Local Development

### Prerequisites
- Node.js 20.19+ and npm 10+
- PostgreSQL database (local or Docker)

### Setup

1. **Install dependencies:**
```bash
npm install
cd backend && npm install
```

2. **Configure environment variables:**

Create `.env` in root:
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_DEV_HTTPS=true
```

Create `backend/.env`:
```env
CLERK_SECRET_KEY=your_clerk_secret
DATABASE_URL=postgresql://postgres:password@localhost:5432/usflix
JWT_SECRET=generate_with_npm_run_production:secrets
USER_JWT_SECRET=generate_different_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:8080,https://localhost:8080
```

3. **Generate JWT secrets:**
```bash
npm run production:secrets
```

4. **Start PostgreSQL:**
```bash
docker run --name usflix-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=usflix -p 5432:5432 -d postgres:16
```

5. **Start development servers:**
```bash
# Terminal 1 - Backend API
npm run dev:api

# Terminal 2 - Frontend
npm run dev
```

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:3001/api/health`

## Production Deployment

### Backend (Fly.io)

1. **Install Fly CLI and login:**
```bash
fly auth login
```

2. **Deploy backend:**
```bash
cd backend
fly launch
fly volumes create usflix_uploads --size 10
fly secrets set CLERK_SECRET_KEY=xxx DATABASE_URL=xxx JWT_SECRET=xxx ...
fly deploy
```

### Frontend (Cloudflare Workers)

1. **Configure wrangler and deploy:**
```bash
npm run build
npm run deploy:worker
```

## Environment Variables

### Frontend (.env)
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key  
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID (optional)
- `VITE_API_URL` - Backend URL (leave empty for same-origin)

### Backend (backend/.env)
- `CLERK_SECRET_KEY` - Clerk authentication
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT token secret (32+ chars)
- `USER_JWT_SECRET` - User JWT secret (32+ chars)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` - Admin credentials
- `FRONTEND_URL` - Allowed CORS origins
- `NODE_ENV` - Environment (development/production)

See `.env.example` and `backend/.env.example` for full configuration.

## Scripts

```bash
# Development
npm run dev                 # Start frontend dev server
npm run dev:api             # Start backend dev server

# Build
npm run build               # Build frontend
npm run build:api           # Build backend
npm run build:all           # Build both

# Quality Checks  
npm run typecheck           # TypeScript type checking
npm run lint                # ESLint
npm run verify              # Run all checks + build

# Deployment
npm run deploy:worker       # Deploy frontend to Cloudflare
npm run production:secrets  # Generate JWT secrets

# Capacitor (Mobile)
npm run cap:build           # Build and sync mobile app
npm run cap:android         # Open Android Studio
npm run cap:ios             # Open Xcode
```

## Security

⚠️ **Never commit sensitive files to git:**
- `.env` and `backend/.env` files
- `backend/uploads/` directory  
- Any `*.pem`, `*.key` files
- Database backups or credentials

All sensitive files are already in `.gitignore`.

## License

Private project - All rights reserved

