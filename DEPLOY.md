# Production Deployment Guide

## Overview

USFLIX uses a split deployment model:
- **Frontend**: Cloudflare Workers (SSR + static assets)
- **Backend**: Fly.io (Express API + PostgreSQL + file uploads)

## Prerequisites

- [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) installed
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- Clerk account at https://dashboard.clerk.com/
- PostgreSQL database (use Fly Postgres or external service)

## Step 1: Backend (Fly.io)

### 1.1 Login and Create App
```bash
cd backend
fly auth login
fly launch --no-deploy
```

### 1.2 Create Upload Volume
```bash
fly volumes create usflix_uploads --size 10 --region sjc
```

### 1.3 Set Environment Secrets

Generate JWT secrets first:
```bash
cd ..
npm run production:secrets
```

Then set all secrets:
```bash
cd backend
fly secrets set \
  CLERK_SECRET_KEY="sk_live_your_key" \
  DATABASE_URL="postgresql://user:pass@host/db?sslmode=require" \
  JWT_SECRET="your-generated-secret" \
  USER_JWT_SECRET="your-other-generated-secret" \
  ADMIN_USERNAME="admin" \
  ADMIN_PASSWORD="your-strong-password" \
  GOOGLE_CLIENT_ID="your-google-client-id" \
  FRONTEND_URL="https://yourdomain.com"
```

### 1.4 Setup Database

**Option A: Fly Postgres (Simple)**
```bash
fly postgres create --name usflix-db
fly postgres attach usflix-db
```

**Option B: External Service (Recommended)**
- Use Supabase, Neon, or similar
- Set `DATABASE_URL` secret with connection string

### 1.5 Deploy
```bash
fly deploy
```

Your API will be available at: `https://your-app.fly.dev`

## Step 2: Frontend (Cloudflare Workers)

### 2.1 Update Configuration

Edit `wrangler.jsonc`:
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "usflix-frontend",
  "compatibility_date": "2025-09-24",
  "compatibility_flags": ["nodejs_compat"],
  "main": "src/server.ts"
}
```

### 2.2 Set Environment Variables

Create `.dev.vars` (local testing only, never commit):
```env
CLERK_SECRET_KEY=sk_live_your_key
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_key
VITE_API_URL=https://your-backend.fly.dev
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 2.3 Build and Deploy
```bash
npm run build
wrangler deploy
```

### 2.4 Set Production Environment Variables

In Cloudflare Dashboard → Workers & Pages → Your Worker → Settings → Environment Variables:
- `CLERK_SECRET_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_API_URL`
- `VITE_GOOGLE_CLIENT_ID`

### 2.5 Add Custom Domain

In Cloudflare Dashboard:
1. Go to your Worker
2. Click "Triggers" → "Custom Domains"
3. Add your domain

## Post-Deployment

### Verify Health
```bash
# Backend
curl https://your-backend.fly.dev/api/health

# Frontend
curl https://yourdomain.com
```

### Configure Clerk

In Clerk Dashboard (https://dashboard.clerk.com/):
1. Add your production domain to "Allowed Origins"
2. Configure redirect URLs
3. Enable required authentication methods (Email, Google, etc.)

### Google OAuth (Optional)

If using Google Sign-In:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `https://yourdomain.com`
   - `https://your-backend.fly.dev`
4. Copy Client ID to environment variables

## Monitoring & Maintenance

### View Logs
```bash
# Backend logs
fly logs

# Frontend logs
wrangler tail
```

### Scale Backend
```bash
# Increase memory/CPU
fly scale vm shared-cpu-2x --memory 512

# Scale instances
fly scale count 2
```

### Database Backups

For Fly Postgres:
```bash
fly postgres backup list
fly postgres backup create
```

For external services, use their backup tools.

### Upload Storage

Uploads are stored in Fly volume. To backup:
```bash
# SSH into machine
fly ssh console

# Inside machine
tar -czf /tmp/uploads-backup.tar.gz /app/uploads

# Download from another terminal
fly ssh sftp get /tmp/uploads-backup.tar.gz
```

## Troubleshooting

### Backend Issues
```bash
# Check app status
fly status

# View logs
fly logs

# SSH into machine
fly ssh console

# Restart app
fly apps restart
```

### Frontend Issues
```bash
# Check deployment
wrangler deployments list

# Rollback if needed
wrangler rollback

# View real-time logs
wrangler tail
```

### Database Connection

Test database connectivity:
```bash
fly ssh console
# Inside console:
psql $DATABASE_URL -c "SELECT 1;"
```

### CORS Errors

Ensure `FRONTEND_URL` in backend includes your frontend domain:
```bash
fly secrets set FRONTEND_URL="https://yourdomain.com"
```

## Security Checklist

- [ ] All secrets set via Fly Secrets / Cloudflare Env Vars (never in code)
- [ ] Strong passwords for admin (12+ characters)
- [ ] JWT secrets are 32+ characters and randomly generated
- [ ] HTTPS enabled on both frontend and backend
- [ ] Clerk configured with production domains
- [ ] Rate limiting enabled (default in production)
- [ ] Database uses SSL connection
- [ ] Upload volume has backups configured

## Updating

### Update Backend
```bash
cd backend
npm run build
fly deploy
```

### Update Frontend
```bash
npm run build
wrangler deploy
```

## Cost Estimates

**Fly.io Backend:**
- Shared CPU: ~$2/month
- 256MB RAM: Included
- 10GB Volume: ~$2/month
- Total: ~$4-5/month

**Cloudflare Workers:**
- 100k requests/day: Free
- Beyond free tier: $5/month + $0.50/million requests

**Database:**
- Fly Postgres: ~$2/month (dev size)
- External (Supabase/Neon): Free tier available

**Estimated Total: $5-10/month** (depending on usage)

## Support

For issues:
1. Check logs first (`fly logs` / `wrangler tail`)
2. Verify environment variables are set
3. Test health endpoints
4. Review Clerk configuration

## Useful Links

- [Fly.io Docs](https://fly.io/docs/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Clerk Docs](https://clerk.com/docs)
