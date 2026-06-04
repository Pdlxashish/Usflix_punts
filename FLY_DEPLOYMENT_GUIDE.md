# Fly.io deployment guide

This guide deploys only the Express backend. The frontend is configured for
Cloudflare Workers via `npm run deploy:worker`.

## Prerequisites

- Fly CLI installed
- PostgreSQL database URL
- Strong JWT secret
- Public frontend URL

Generate a JWT secret:

```bash
node scripts/generate-jwt-secret.js
```

## Deploy

```bash
cd backend
fly auth login
fly launch --no-deploy
fly volumes create usflix_uploads --size 10 --region sjc
fly secrets set DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
fly secrets set JWT_SECRET="replace-with-strong-secret"
fly secrets set ADMIN_USERNAME="admin"
fly secrets set ADMIN_PASSWORD="replace-with-strong-admin-password"
fly secrets set FRONTEND_URL="https://your-frontend.example.com"
fly deploy
```

For split frontend/API domains, set cross-site cookies explicitly:

```bash
fly secrets set COOKIE_SAME_SITE="none"
fly apps restart usflix-backend
```

## Verify

```bash
fly status
fly logs
curl https://your-fly-app.fly.dev/api/health
```

## Upload storage

`backend/fly.toml` mounts `/app/uploads` from the `usflix_uploads` Fly volume.
Create that volume before deploying. Without persistent storage, uploaded media
can be lost during redeploys or machine replacement.

## Updating

```bash
cd backend
fly deploy
```

## Troubleshooting

- Database failures: verify `DATABASE_URL` and check `fly logs`.
- CORS failures: set `FRONTEND_URL` to the exact frontend origin.
- Login cookie failures on split domains: set `COOKIE_SAME_SITE=none` and use HTTPS.
- Missing uploads after restart: verify `fly volumes list` and the mount in `backend/fly.toml`.
