# Production deployment

This project has two deployable services:

| Service | Stack | Production target |
| --- | --- | --- |
| Frontend | TanStack Start, Vite, React | Cloudflare Workers via Wrangler |
| Backend | Express, TypeScript, PostgreSQL | Fly.io, Railway, VPS, or Docker |

Run both builds before deploying:

```bash
npm run build:api
npm run build
```

## Backend

Required production variables:

| Variable | Notes |
| --- | --- |
| `NODE_ENV=production` | Enables production validation and secure defaults. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `JWT_SECRET` | Strong random value, at least 32 characters. |
| `FRONTEND_URL` | Exact public frontend origin, comma-separated if needed. |
| `ADMIN_USERNAME` | Initial admin seed user when admin table is empty. |
| `ADMIN_PASSWORD` | At least 12 characters in production. |

Useful optional variables:

| Variable | Notes |
| --- | --- |
| `COOKIE_SAME_SITE=none` | Required when frontend and API are on different HTTPS domains. |
| `OPENWEATHER_API_KEY` | Enables live weather data. |
| `UPLOAD_DIR` | Use a persistent volume path in production, such as `/app/uploads`. |
| `SEED_DEMO_DATA=true` | Only set if you intentionally want demo media in production. |

Health check:

```bash
curl https://your-api.example.com/api/health
```

## Fly.io backend

The committed `backend/fly.toml` expects a persistent upload volume named `usflix_uploads`.

```bash
cd backend
fly launch --no-deploy
fly volumes create usflix_uploads --size 10 --region sjc
fly secrets set DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
fly secrets set JWT_SECRET="$(node ../scripts/generate-jwt-secret.js)"
fly secrets set ADMIN_USERNAME="admin"
fly secrets set ADMIN_PASSWORD="replace-with-a-strong-admin-password"
fly secrets set FRONTEND_URL="https://your-frontend.example.com"
fly deploy
```

If frontend and backend are on separate domains, also set:

```bash
fly secrets set COOKIE_SAME_SITE="none"
```

## Frontend on Cloudflare Workers

Use same-origin `/api` routing when possible. If the API is on a separate domain, build with:

```bash
VITE_API_URL=https://your-api.example.com npm run deploy:worker
```

For local development, keep `VITE_API_URL` unset or set it to `http://localhost:3001`.

## Docker production smoke test

Create a root `.env` with `JWT_SECRET`, `DB_PASSWORD`, and `FRONTEND_URL`, then run:

```bash
docker compose up --build
```

The frontend is served on `http://localhost:8080`; the backend API is served on `http://localhost:3001`.

## Pre-launch checklist

- Rotate any secret that was ever pasted into a file, chat, terminal transcript, or deployment guide.
- Confirm `npm run verify` passes in CI or on a clean machine.
- Confirm `/api/health` returns `ok: true`.
- Confirm admin login works over HTTPS.
- Upload a small image and confirm it still exists after a backend restart/redeploy.
- Confirm `FRONTEND_URL`, `VITE_API_URL`, and `COOKIE_SAME_SITE` match your domain strategy.
