# 🔧 Troubleshooting Guide: Render + Vercel

Common issues when deploying USFLIX to Render (backend) and Vercel (frontend).

---

## Table of Contents
1. [Backend Issues (Render)](#backend-issues-render)
2. [Frontend Issues (Vercel)](#frontend-issues-vercel)
3. [Database Issues](#database-issues)
4. [Authentication Issues](#authentication-issues)
5. [File Upload Issues](#file-upload-issues)
6. [CORS and Network Issues](#cors-and-network-issues)
7. [Performance Issues](#performance-issues)

---

## Backend Issues (Render)

### Issue 1: "Build failed" during deployment

**Symptoms**: Build fails with npm errors

**Common Causes**:
- Missing dependencies
- Node version mismatch
- Build command incorrect

**Solutions**:

```bash
# 1. Check package.json engines
"engines": {
  "node": ">=20.19 <25",
  "npm": ">=10"
}

# 2. Verify build command in Render
Build Command: npm install && npm run build

# 3. Check backend/package.json scripts
"scripts": {
  "build": "tsc"
}

# 4. Clear build cache
# In Render: Settings → Build & Deploy → Clear build cache
```

---

### Issue 2: "Service Unavailable" (503 error)

**Symptoms**: Backend URL returns 503, app won't start

**Common Causes**:
- Environment variables missing
- Database connection fails
- Port mismatch

**Solutions**:

```bash
# 1. Check logs in Render Dashboard → Logs tab
# Look for error messages

# 2. Verify required environment variables
CLERK_SECRET_KEY     # Must be set
DATABASE_URL         # Must be valid
JWT_SECRET           # Must be set
USER_JWT_SECRET      # Must be set
NODE_ENV=production  # Must be set
PORT=3001           # Must match start command

# 3. Test database connection
# In logs, look for: "❌ Database connection failed"

# 4. Verify start command
Start Command: npm start

# In backend/package.json:
"scripts": {
  "start": "node dist/index.js"
}
```

---

### Issue 3: Backend "sleeps" / slow first request

**Symptoms**: First request after 15 minutes takes 30+ seconds

**Cause**: Render free tier spins down after inactivity

**Solutions**:

**Option A: Upgrade to paid plan** (Recommended for production)
```
Render Dashboard → Service → Settings
Change Instance Type: Free → Starter ($7/month)
✅ Eliminates cold starts
✅ Always-on service
```

**Option B: Keep it awake with pings** (Free tier workaround)
```bash
# Use a service like UptimeRobot or Cron-job.org
# Ping your backend every 10 minutes:
curl https://your-backend.onrender.com/api/health

# Or add to your frontend (not recommended):
setInterval(() => {
  fetch('/api/health')
}, 600000) // every 10 minutes
```

**Option C: Accept cold starts**
- Inform users first load may be slow
- Show loading message: "Waking up server..."

---

### Issue 4: Environment variables not updating

**Symptoms**: Changed env vars but app still uses old values

**Solutions**:

```bash
# 1. Save changes in Render Dashboard
Dashboard → Service → Environment → Save Changes

# 2. Render auto-redeploys, but check logs
Dashboard → Events tab → Look for "Deploy succeeded"

# 3. Manual redeploy if needed
Dashboard → Manual Deploy → Deploy latest commit

# 4. Verify new values in logs
# Add temporary log in your code:
console.log('FRONTEND_URL:', process.env.FRONTEND_URL)
```

---

## Frontend Issues (Vercel)

### Issue 1: Build fails with "command not found"

**Symptoms**: Vercel build fails, can't find npm/vite

**Solutions**:

```bash
# 1. Verify Vercel project settings
Settings → General:
- Framework Preset: Vite
- Build Command: npm run build
- Output Directory: .output/public
- Install Command: npm install

# 2. Check root directory is correct
- Should be: ./ (project root, not /backend)

# 3. Verify package.json has build script
"scripts": {
  "build": "vite build"
}

# 4. Node version
# Vercel auto-detects from package.json engines
# Or set in Settings → General → Node.js Version
```

---

### Issue 2: Environment variables not working

**Symptoms**: App can't connect to backend, Clerk not working

**Solutions**:

```bash
# 1. Check variables are set for all environments
Settings → Environment Variables
✅ Production
✅ Preview
✅ Development

# 2. Variables must start with VITE_ to be exposed
VITE_API_URL=https://...          # ✅ Accessible in frontend
API_URL=https://...                # ❌ Not accessible

# Exception: CLERK_SECRET_KEY doesn't need VITE_ prefix

# 3. Redeploy after adding variables
Deployments → Latest → ... → Redeploy

# 4. Verify in browser console
console.log(import.meta.env.VITE_API_URL)
```

---

### Issue 3: Page shows 404 or blank screen

**Symptoms**: Deployment succeeds but site doesn't load

**Solutions**:

```bash
# 1. Check build output directory
Settings → General → Output Directory: .output/public

# 2. Verify build succeeded
Deployments → Click deployment → Check logs
Look for: "Build Completed"

# 3. Check for build errors in logs
Common issues:
- TypeScript errors
- Missing dependencies
- Import path issues

# 4. Test build locally
npm run build
npm run preview
# If works locally, issue is with Vercel config
```

---

### Issue 4: Function timeout errors

**Symptoms**: API calls from frontend time out

**Solutions**:

```bash
# 1. Check VITE_API_URL points to correct backend
# Should be: https://your-backend.onrender.com
# NOT: http://localhost:3001

# 2. Verify backend is running
curl https://your-backend.onrender.com/api/health

# 3. Check Vercel function logs
Deployments → Latest → Functions
Look for timeout or error messages

# 4. Increase timeout (if using serverless functions)
# In vercel.json:
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

---

## Database Issues

### Issue 1: "Database connection failed"

**Symptoms**: Backend logs show can't connect to PostgreSQL

**Solutions**:

```bash
# 1. Verify DATABASE_URL format
# Should be: postgresql://user:pass@host:5432/db?sslmode=require
#                                                  ^^^^^^^^^^^^^^^^
#                                                  SSL is required!

# 2. Check database is running
Render Dashboard → Database → Status should be "Available"

# 3. Get correct connection string
Database → Info tab → Copy "Internal Database URL"
# Use Internal URL (not External) for backend service

# 4. Test connection manually
# In Render Shell (paid plan) or local:
psql "postgresql://user:pass@host/db?sslmode=require" -c "SELECT 1;"
```

---

### Issue 2: "Connection pool exhausted"

**Symptoms**: Errors after multiple requests, "sorry, too many clients"

**Solutions**:

```bash
# 1. Check your database plan
Render Free: Max 5 connections
Render Starter: Max 20 connections

# 2. Optimize connection usage in code
# backend/src/db/connection.ts
const pool = new Pool({
  max: 5, // Don't exceed your plan limit
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

# 3. Close connections properly
try {
  const result = await pool.query(...)
  // Don't close pool here, just return result
} finally {
  // Don't call pool.end() in routes
}

# 4. Upgrade database plan if needed
Dashboard → Database → Change Plan → Starter
```

---

### Issue 3: Database schema not created

**Symptoms**: Tables don't exist, "relation does not exist" errors

**Solutions**:

```bash
# 1. Check if seed script ran
# In Render logs, look for:
# "✅ Database tables created"
# "✅ Database seeded"

# 2. Re-run database setup
# Trigger a redeploy:
Dashboard → Manual Deploy → Deploy latest commit

# 3. Manually run migrations (if needed)
# Connect to database and run:
# (Get SQL from backend/src/db/schema.ts)

# 4. Check SEED_DEMO_DATA setting
# If false, demo data won't be created
# Set to true for initial setup, then false for production
```

---

## Authentication Issues

### Issue 1: Clerk "Invalid publishable key"

**Symptoms**: Login page shows Clerk error

**Solutions**:

```bash
# 1. Verify using LIVE keys, not TEST keys
Clerk Dashboard → API Keys
❌ pk_test_...  # Test key (for development)
✅ pk_live_...  # Live key (for production)

# 2. Check keys match between frontend and backend
Vercel: VITE_CLERK_PUBLISHABLE_KEY=pk_live_XXX
Render: CLERK_SECRET_KEY=sk_live_XXX
# Must be from same Clerk app!

# 3. Verify domain is added in Clerk
Clerk Dashboard → Domains
✅ your-app.vercel.app
✅ your-backend.onrender.com
```

---

### Issue 2: "Not allowed by CORS" after login

**Symptoms**: Login succeeds but redirect fails with CORS error

**Solutions**:

```bash
# 1. Check FRONTEND_URL in backend exactly matches Vercel URL
# In Render → Environment:
FRONTEND_URL=https://your-app.vercel.app
#            ^^^^^^^                     ^
#            Must use https://          No trailing slash!

# 2. Verify Clerk redirect URLs
Clerk Dashboard → Paths:
Sign-in redirect: https://your-app.vercel.app/
Sign-up redirect: https://your-app.vercel.app/
# Must match FRONTEND_URL exactly

# 3. Check COOKIE_SAME_SITE setting
# For split domains (different Vercel/Render URLs):
COOKIE_SAME_SITE=none  # Required!

# For same domain (custom domain for both):
COOKIE_SAME_SITE=lax   # More secure
```

---

### Issue 3: Google Sign-In not working

**Symptoms**: Google button doesn't appear or fails

**Solutions**:

```bash
# 1. Verify GOOGLE_CLIENT_ID is set
Vercel: VITE_GOOGLE_CLIENT_ID=XXX.apps.googleusercontent.com
Render: GOOGLE_CLIENT_ID=XXX.apps.googleusercontent.com

# 2. Check Google Console settings
console.cloud.google.com → Credentials
Authorized JavaScript origins:
✅ https://your-app.vercel.app
✅ https://your-backend.onrender.com

Authorized redirect URIs:
✅ https://your-app.vercel.app
✅ https://your-backend.onrender.com/api/auth/google/callback

# 3. Enable Google in Clerk
Clerk Dashboard → User & Authentication → Social Connections
✅ Google must be enabled

# 4. Verify HTTPS
Google OAuth requires HTTPS (not HTTP)
Both your URLs should start with https://
```

---

## File Upload Issues

### Issue 1: "Upload failed" or 413 error

**Symptoms**: Large files fail to upload

**Solutions**:

```bash
# 1. Check MAX_FILE_SIZE setting
Render → Environment:
MAX_FILE_SIZE=4294967296  # 4GB in bytes

# 2. Verify nginx/proxy limits
# Render handles this automatically, but check logs

# 3. Frontend timeout
# Increase axios/fetch timeout for large uploads:
const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
  signal: AbortSignal.timeout(120000) // 2 minute timeout
})

# 4. Check file size on frontend before upload
if (file.size > 4 * 1024 * 1024 * 1024) {
  alert('File too large (max 4GB)')
  return
}
```

---

### Issue 2: Uploaded files disappear after backend restart

**Symptoms**: Uploads work but files gone after redeploy

**Cause**: Render free tier has ephemeral storage

**Solutions**:

**Option A: Add persistent disk** (Recommended)
```bash
# Render Dashboard → Service → Disks
1. Click "Add Disk"
2. Name: uploads
3. Mount Path: /opt/render/project/uploads
4. Size: 1GB minimum ($0.25/GB/month)
5. Save

# Verify UPLOAD_DIR matches mount path:
UPLOAD_DIR=/opt/render/project/uploads
```

**Option B: Use cloud storage**
```bash
# Set up Cloudflare R2, AWS S3, or similar
# In Render → Environment:
USE_CLOUD_STORAGE=true
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=usflix-uploads
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

**Option C: Upgrade to paid plan**
```bash
# Render Starter plan includes persistent storage
# But still recommend adding disk for uploads
```

---

### Issue 3: "ENOENT: no such file or directory"

**Symptoms**: Upload route returns 404 for uploaded files

**Solutions**:

```bash
# 1. Verify UPLOAD_DIR exists and is writable
# In backend/src/index.ts, check static file serving:
app.use('/uploads', express.static(path.resolve(uploadDir)))

# 2. Check file path in database
# Should be relative: /uploads/user123/photo.jpg
# NOT absolute: /opt/render/project/uploads/user123/photo.jpg

# 3. Verify disk is mounted (if using persistent disk)
Render → Service → Disks → Should show "Mounted"

# 4. Check logs for write errors
# Look for: "Failed to save file" or EACCES errors
```

---

## CORS and Network Issues

### Issue 1: "No 'Access-Control-Allow-Origin' header"

**Symptoms**: Frontend can't call backend API

**Solutions**:

```bash
# 1. Verify FRONTEND_URL in backend
Render → Environment → FRONTEND_URL
Should match Vercel URL EXACTLY:
✅ https://your-app.vercel.app
❌ https://your-app.vercel.app/  # Trailing slash
❌ http://your-app.vercel.app    # Wrong protocol

# 2. Check CORS middleware in backend
# In backend/src/index.ts:
const allowedOrigins = new Set([
  ...getAllowedFrontendOrigins(), // Reads FRONTEND_URL
])

# 3. Test CORS headers
curl -I https://your-backend.onrender.com/api/health \
  -H "Origin: https://your-app.vercel.app"

# Should see:
# Access-Control-Allow-Origin: https://your-app.vercel.app
# Access-Control-Allow-Credentials: true

# 4. Redeploy backend after changing FRONTEND_URL
```

---

### Issue 2: "Failed to fetch" / Network request failed

**Symptoms**: API calls fail with generic network error

**Solutions**:

```bash
# 1. Verify VITE_API_URL is correct
# In Vercel → Environment Variables:
VITE_API_URL=https://your-backend.onrender.com
#            ^^^^^^^ Must be https, not http
#                                           ^^^ No trailing slash

# 2. Check backend is responding
curl https://your-backend.onrender.com/api/health

# 3. Check browser console for actual error
# Open DevTools → Network tab → Click failed request
# Look for:
# - CORS error → Fix FRONTEND_URL
# - 503 error → Backend is down or sleeping
# - Timeout → Backend too slow (upgrade plan)

# 4. Verify API routes in frontend use correct base
// Should use relative URLs:
fetch('/api/collections')  // ✅ Proxied to VITE_API_URL

// Or absolute:
fetch(import.meta.env.VITE_API_URL + '/api/collections')  // ✅

// Not:
fetch('http://localhost:3001/api/collections')  // ❌ Local URL
```

---

### Issue 3: Mixed content warnings

**Symptoms**: "Mixed Content: The page was loaded over HTTPS, but..."

**Solutions**:

```bash
# 1. Ensure ALL URLs use HTTPS
✅ VITE_API_URL=https://your-backend.onrender.com
❌ VITE_API_URL=http://your-backend.onrender.com

# 2. Check image/upload URLs in code
# Should be:
const imageUrl = `https://your-backend.onrender.com/uploads/${file}`
# NOT:
const imageUrl = `http://your-backend.onrender.com/uploads/${file}`

# 3. Use protocol-relative URLs (if needed)
const imageUrl = `//your-backend.onrender.com/uploads/${file}`

# 4. Check Content Security Policy
# In Vercel, add to vercel.json if needed
```

---

## Performance Issues

### Issue 1: Slow page loads

**Symptoms**: Frontend takes long to load

**Solutions**:

```bash
# 1. Check Vercel build output size
Deployments → Latest → Build logs
Look for bundle size warnings

# 2. Optimize images
# Use Vite's built-in optimization
# Or lazy load images:
<img loading="lazy" src="..." />

# 3. Code splitting
# Vite does this automatically, but verify:
npm run build
# Check dist/ folder for multiple JS chunks

# 4. Enable caching
# In vercel.json:
{
  "headers": [{
    "source": "/_next/static/(.*)",
    "headers": [{
      "key": "Cache-Control",
      "value": "public, max-age=31536000, immutable"
    }]
  }]
}
```

---

### Issue 2: Slow API responses

**Symptoms**: Backend API calls take multiple seconds

**Solutions**:

```bash
# 1. Check if backend is sleeping (free tier)
# Solution: Upgrade to Starter plan or keep it awake

# 2. Optimize database queries
# Add indexes for frequently queried columns:
CREATE INDEX idx_collections_user_id ON collections(user_id);

# 3. Check database performance
Render → Database → Metrics
Look for slow queries

# 4. Use connection pooling
# Already implemented in backend/src/db/connection.ts
# Verify max connections match your plan:
const pool = new Pool({ max: 5 }) // Free tier

# 5. Monitor Render metrics
Dashboard → Service → Metrics
Check CPU, Memory usage
```

---

### Issue 3: WebSocket connection fails

**Symptoms**: Real-time features don't work

**Solutions**:

```bash
# 1. Verify WebSocket support
# Render supports WebSockets on all plans

# 2. Check WebSocket URL
# Should use wss:// (not ws://)
const ws = new WebSocket('wss://your-backend.onrender.com/ws')

# 3. Verify CORS allows WebSocket
# In backend CORS config, ensure:
credentials: true

# 4. Check logs for WebSocket errors
Render → Logs → Filter for "WebSocket" or "ws"

# 5. Test WebSocket connection
# Use a tool like: https://www.websocket.org/echo.html
# Connect to: wss://your-backend.onrender.com/ws
```

---

## Quick Diagnostic Commands

Run these to quickly diagnose issues:

```bash
# Backend health
curl https://your-backend.onrender.com/api/health

# Frontend build
npm run build && npm run preview

# Database connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Check CORS headers
curl -I https://your-backend.onrender.com/api/health \
  -H "Origin: https://your-app.vercel.app"

# Test upload
curl -X POST https://your-backend.onrender.com/api/upload \
  -F "file=@test.jpg" \
  -H "Authorization: Bearer YOUR_JWT"
```

---

## Still Having Issues?

### 1. Check Platform Status
- Render: https://status.render.com
- Vercel: https://www.vercel-status.com
- Clerk: https://status.clerk.com

### 2. Enable Debug Logging

**Backend** (Render):
```bash
# Add to Environment:
DEBUG=*
LOG_LEVEL=debug

# Or in code (temporary):
console.log('DEBUG:', { 
  FRONTEND_URL: process.env.FRONTEND_URL,
  DATABASE_URL: process.env.DATABASE_URL?.slice(0, 30) + '...',
  NODE_ENV: process.env.NODE_ENV 
})
```

**Frontend** (Vercel):
```typescript
// Add to code (temporary):
console.log('ENV:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  MODE: import.meta.env.MODE
})
```

### 3. Review Full Deployment Guide
See [DEPLOY.md](./DEPLOY.md) for complete setup instructions.

### 4. Check Logs

**Render**: Dashboard → Service → Logs  
**Vercel**: Dashboard → Deployments → Function Logs

### 5. Community Support

- Render Community: https://community.render.com
- Vercel Discord: https://vercel.com/discord
- Clerk Discord: https://clerk.com/discord

---

## Prevention Checklist

Avoid issues by following this before deployment:

- [ ] All environment variables set correctly
- [ ] Used live keys (pk_live_/sk_live_), not test keys
- [ ] FRONTEND_URL matches Vercel URL exactly (no trailing slash)
- [ ] VITE_API_URL uses https:// and points to Render URL
- [ ] Database URL includes ?sslmode=require
- [ ] Strong admin password set (12+ characters)
- [ ] COOKIE_SAME_SITE=none for split domains
- [ ] Persistent disk added for file uploads (or cloud storage)
- [ ] Tested locally with production environment first
- [ ] Reviewed logs after deployment
- [ ] Tested all core features (auth, uploads, API calls)

---

**Last Updated**: 2024  
**For**: USFLIX deployment on Render + Vercel

See also:
- [DEPLOY.md](./DEPLOY.md) - Full deployment guide
- [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md) - Step-by-step checklist
- [QUICK-START-DEPLOY.md](./QUICK-START-DEPLOY.md) - 30-minute quick start
