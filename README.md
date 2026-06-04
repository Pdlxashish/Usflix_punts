# USFLIX

A personal memory streaming app for photos, videos, voice notes, albums, profiles, comments, and an admin upload workflow.

## Stack

- Frontend: React 19, TanStack Start/Router, Vite, Tailwind CSS, Radix UI
- Backend: Express, TypeScript, PostgreSQL, JWT cookies, Multer uploads
- Deployment: Cloudflare Workers frontend, Fly.io/Railway/Docker backend

## Project structure

```text
backend/        Express API, database schema, auth, uploads
src/            TanStack Start frontend
public/         PWA assets
scripts/        Local setup and utility scripts
shared/         Shared TypeScript types
```

## Local setup

Install dependencies:

```bash
npm install
cd backend && npm install
```

Create local environment files:

```powershell
.\scripts\setup-env.ps1
```

or:

```bash
./scripts/setup-env.sh
```

Start PostgreSQL with Docker:

```bash
docker compose up db -d
```

Run the app:

```bash
npm run dev:api
npm run dev
```

Frontend: `http://localhost:8080`

Backend health: `http://localhost:3001/api/health`

## Verification

```bash
npm run typecheck
npm run lint
npm run build:api
npm run build
```

Or run the combined gate:

```bash
npm run verify
```

There is no dedicated unit-test suite yet; the current release gate is typecheck, lint, and production builds.

## Deployment

Read [DEPLOYMENT.md](DEPLOYMENT.md) before deploying.

Minimum backend production secrets:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

For Fly.io local upload storage, create the configured `usflix_uploads` volume before deploying.

## Security notes

- Never commit `.env` files or real deployment secrets.
- Rotate any secret that was previously pasted into docs, terminal output, or source files.
- Use HTTPS in production.
- Use `COOKIE_SAME_SITE=none` only for split frontend/API domains, and only over HTTPS.
