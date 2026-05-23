# Production deployment

This app has two parts:

| Component | Stack | Typical host |
|-----------|--------|--------------|
| **Frontend** | TanStack Start (SSR) + static assets | Cloudflare Workers (`wrangler deploy`) |
| **Backend** | Express + PostgreSQL | Railway, Fly.io, VPS, or Docker |

Both builds must succeed before deploying:

```bash
cd backend && npm ci && npm run build
cd .. && npm ci && npm run build
```

---

## 1. Backend (API)

### Required environment variables

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Min 32 chars — run `node scripts/generate-jwt-secret.js` |
| `FRONTEND_URL` | Your public app URL(s), comma-separated for CORS |
| `ADMIN_USERNAME` | Initial admin (only when `admin_users` is empty) |
| `ADMIN_PASSWORD` | Min **12** characters in production |

### Recommended

| Variable | Description |
|----------|-------------|
| `OPENWEATHER_API_KEY` | Live weather in admin |
| `UPLOAD_DIR` | Persistent volume path (e.g. `/app/uploads`) |
| `USE_CLOUD_STORAGE` | `true` + AWS/R2 vars for scalable media |
| `COOKIE_SAME_SITE` | `none` if frontend and API are on **different** domains |
| `DISABLE_RATE_LIMIT` | Leave unset (limits enabled in production) |

### Start

```bash
cd backend
npm run build
npm start
```

Health check: `GET /api/health` → `{ "ok": true }` (includes DB ping).

### Docker (API + Postgres)

```bash
# Create .env in repo root with JWT_SECRET, DB_PASSWORD, FRONTEND_URL
docker compose up db backend -d
```

---

## 2. Frontend (Cloudflare Workers)

1. Set secrets/vars in Cloudflare (or `wrangler.jsonc` / dashboard):

   - `VITE_API_URL` = `https://api.your-domain.com` (your backend public URL)

2. If frontend and API are on **different domains**, set on the **backend**:

   - `COOKIE_SAME_SITE=none`
   - `FRONTEND_URL` must exactly match the Worker URL(s)

3. Deploy:

   ```bash
   npm run deploy:worker
   ```

**Same-origin (recommended):** Put the API behind the same hostname (`/api`, `/uploads`) via Cloudflare route rules, nginx, or `docker compose` frontend service. Leave `VITE_API_URL` unset so cookies use `SameSite=strict`.

---

## 3. Pre-launch checklist

- [ ] `JWT_SECRET` generated and stored securely (never committed)
- [ ] `ADMIN_PASSWORD` is strong (12+ chars); change default after first login
- [ ] `FRONTEND_URL` matches your live app URL (HTTPS)
- [ ] `GET /api/health` returns `ok: true`
- [ ] Admin login works at `/admin`
- [ ] Upload a test photo/video; file appears under `/uploads/...`
- [ ] Demo content skipped in production (only admin + empty DB seed unless `SEED_DEMO_DATA=true`)

---

## 4. Split-domain cookie note

Admin auth uses an **HttpOnly cookie**. Cross-origin setups require:

- Backend: `COOKIE_SAME_SITE=none`, `FRONTEND_URL=https://your-worker.example.com`
- Frontend build: `VITE_API_URL=https://api.example.com`
- Browser requests: `credentials: "include"` (already set in `src/lib/api.ts`)

Same-origin proxy avoids this complexity.

---

## 5. Mobile (Capacitor)

Build with an explicit API URL:

```bash
VITE_API_URL=https://api.your-domain.com npm run build:mobile
npm run cap:sync
```

Add your app origin to backend `FRONTEND_URL` if needed (`capacitor://localhost` is allowed by default).
