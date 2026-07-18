# Production Deployment Guide (Render + Vercel)

## Overview

USFLIX uses a split deployment model optimized for simplicity and cost:
- **Frontend**: Vercel (React SSR + static assets + CDN)
- **Backend**: Render (Express API + PostgreSQL + file uploads)

This setup provides:
- ✅ **Zero-config deployments** from GitHub
- ✅ **Generous free tiers** (Backend: Free for 90 days, then $7/mo; Frontend: Free for personal projects)
- ✅ **Automatic SSL certificates**
- ✅ **Built-in PostgreSQL** on Render
- ✅ **Simple environment management**

## Prerequisites

- GitHub account (for automatic deployments)
- [Render account](https://render.com/) (free signup)
- [Vercel account](https://vercel.com/) (free signup)
- [Clerk account](https://dashboard.clerk.com/) (free tier available)
- Your project pushed to a GitHub repository

---

## 🎯 Step-by-Step Deployment

### Part 1: Backend Deployment (Render)

#### 1.1 Generate JWT Secrets

Before deployment, generate secure JWT secrets:

```bash
npm run production:secrets
```

This creates strong random secrets. **Save these securely** - you'll need them in step 1.4.

#### 1.2 Push Your Code to GitHub

```bash
git add .
git commit -m "Prepare for Render + Vercel deployment"
git push origin main
```

#### 1.3 Create Backend Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `usflix-backend` (or your preferred name) |
| **Region** | Choose closest to your users |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (or Starter $7/mo for better performance) |

#### 1.4 Add Environment Variables

In Render Dashboard → Your Service → Environment:

Click **"Add Environment Variable"** and add each of these:

```env
# Required: Clerk Authentication
CLERK_SECRET_KEY=sk_live_YOUR_CLERK_SECRET_KEY

# Required: Database (auto-filled after step 1.5)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Required: JWT Secrets (use values from step 1.1)
JWT_SECRET=YOUR_GENERATED_JWT_SECRET_FROM_STEP_1_1
USER_JWT_SECRET=YOUR_OTHER_GENERATED_JWT_SECRET_FROM_STEP_1_1

# Required: Admin Account
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YOUR_STRONG_PASSWORD_MIN_12_CHARS

# Required: Server Config
NODE_ENV=production
PORT=3001

# Required: CORS (update after deploying frontend in Part 2)
FRONTEND_URL=https://your-app.vercel.app

# Optional: Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# File Uploads
UPLOAD_DIR=/opt/render/project/uploads
MAX_FILE_SIZE=4294967296

# Security
COOKIE_SAME_SITE=none
DISABLE_RATE_LIMIT=false
SEED_DEMO_DATA=false
```

#### 1.5 Add PostgreSQL Database

1. In Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `usflix-db`
   - **Region**: Same as your backend service
   - **Plan**: Free (or Starter $7/mo for production)
3. Click **"Create Database"**
4. After creation, click the database → **"Info"** → Copy **"Internal Database URL"**
5. Go back to your backend service → Environment → Update `DATABASE_URL` with the copied URL
6. Render will automatically redeploy with the new database connection

#### 1.6 Deploy Backend

Render will automatically build and deploy. Watch the logs:
- Build takes ~2-3 minutes
- First deployment includes database table creation and seeding
- Once you see **"🚀 USFLIX Backend running"**, it's live!

Your API will be available at: `https://usflix-backend.onrender.com` (or your chosen name)

---

### Part 2: Frontend Deployment (Vercel)

#### 2.1 Install Vercel CLI (Optional)

While Vercel can deploy directly from GitHub UI, the CLI provides more control:

```bash
npm install -g vercel
```

#### 2.2 Deploy Frontend to Vercel

**Option A: Using Vercel Dashboard (Recommended for beginners)**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure project:

| Setting | Value |
|---------|-------|
| **Framework Preset** | TanStack Start |
| **Root Directory** | `./` (leave as root) |
| **Build Command** | Leave default (`npm run build`) |
| **Output Directory** | Leave default |
| **Install Command** | Leave default (`npm install`) |

5. Click **"Deploy"**

**Option B: Using Vercel CLI**

```bash
# From project root (not backend folder)
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? Your account
# - Link to existing project? N
# - Project name? memory-flix-for-us
# - Directory? ./
# - Override settings? N
```

#### 2.3 Add Environment Variables in Vercel

After deployment, add environment variables:

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add these variables (select **Production**, **Preview**, and **Development**):

```env
# Required: Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY=sk_live_YOUR_CLERK_SECRET_KEY

# Required: Backend API URL (use your Render backend URL from Part 1)
VITE_API_URL=https://usflix-backend.onrender.com

# Optional: only set if you need to override the derived WebSocket URL
VITE_WS_URL=wss://usflix-backend.onrender.com/ws

# Optional: Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

3. Click **"Save"**
4. Trigger a redeploy: Go to **Deployments** → Click **"..."** on latest → **"Redeploy"**

#### 2.4 Update Backend CORS Configuration

Now that your frontend is deployed, update the backend's CORS settings:

1. Go to Render Dashboard → Backend Service → **Environment**
2. Update `FRONTEND_URL` to your Vercel URL:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
3. Save (Render will auto-redeploy)

#### 2.5 Add Custom Domain (Optional)

1. In Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Add your custom domain (e.g., `memoryflix.com`)
3. Follow Vercel's instructions to update DNS records
4. After domain is verified, update backend's `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://memoryflix.com
   ```

---

### Part 3: Configure Clerk Authentication

#### 3.1 Update Clerk Settings

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Go to **API Keys** and copy:
   - **Publishable Key** (starts with `pk_live_`)
   - **Secret Key** (starts with `sk_live_`)

#### 3.2 Configure Allowed Origins

1. In Clerk Dashboard → **Paths**
2. Add your production URLs:
   - Frontend: `https://your-app.vercel.app`
   - Backend: `https://usflix-backend.onrender.com`

#### 3.3 Configure Redirect URLs

1. In Clerk Dashboard → **Paths**
2. Set redirect URLs:
   - **Sign-in redirect**: `https://your-app.vercel.app/`
   - **Sign-up redirect**: `https://your-app.vercel.app/`
   - **Sign-out redirect**: `https://your-app.vercel.app/`

#### 3.4 Enable Authentication Methods

1. In Clerk Dashboard → **User & Authentication** → **Email, Phone, Username**
2. Enable desired methods:
   - ✅ Email address
   - ✅ Google (requires Google OAuth setup)

---

### Part 4: Google OAuth Setup (Optional)

If you want Google Sign-In:

#### 4.1 Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
5. Configure consent screen if prompted
6. Application type: **Web application**
7. Add **Authorized JavaScript origins**:
   ```
   https://your-app.vercel.app
   https://usflix-backend.onrender.com
   ```
8. Add **Authorized redirect URIs**:
   ```
   https://your-app.vercel.app
   https://usflix-backend.onrender.com/api/auth/google/callback
   ```
9. Click **"Create"** and copy the **Client ID**

#### 4.2 Update Environment Variables

Add the Google Client ID to both services:

**Vercel** (Frontend):
```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**Render** (Backend):
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Both will auto-redeploy after saving.

---

## 🎉 Verification & Testing

### Test Backend Health

```bash
curl https://usflix-backend.onrender.com/api/health
```

Expected response:
```json
{"ok": true, "timestamp": "2024-..."}
```

### Test Frontend

1. Open `https://your-app.vercel.app`
2. You should see the USFLIX homepage
3. Try creating an account or signing in
4. Upload a photo/video to test full functionality

### Check Logs

**Backend Logs (Render)**:
- Dashboard → Your Service → **Logs** tab

**Frontend Logs (Vercel)**:
- Dashboard → Your Project → **Deployments** → Click deployment → **Function Logs**

---

## 🔧 Monitoring & Maintenance

### View Real-Time Logs

**Backend (Render)**:
```bash
# In Render Dashboard → Service → Logs tab
# Or use Render CLI:
render logs -s usflix-backend
```

**Frontend (Vercel)**:
```bash
# In Vercel Dashboard → Deployments → Function Logs
# Or use Vercel CLI:
vercel logs your-app.vercel.app
```

### Scaling

**Backend (Render)**:
1. Dashboard → Service → **Settings**
2. Change **Instance Type**:
   - Free: 512MB RAM, shared CPU (sleeps after 15 min inactivity)
   - Starter ($7/mo): 512MB RAM, no sleep
   - Standard ($25/mo): 2GB RAM, dedicated CPU

**Frontend (Vercel)**:
- Automatic scaling included
- Free tier: 100GB bandwidth/month
- Pro ($20/mo): 1TB bandwidth/month

### Database Management

**Backup Database (Render)**:
1. Dashboard → Database → **Backups** tab
2. Manual backup: Click **"Create Backup"**
3. Automated backups available on paid plans

**Connect to Database**:
```bash
# Get connection string from Render Dashboard
# Use your preferred PostgreSQL client:
psql "postgresql://user:pass@host/db?sslmode=require"
```

### Update Application

**Backend Updates**:
1. Push changes to GitHub
2. Render auto-deploys from `main` branch
3. Monitor deployment in Logs tab

**Frontend Updates**:
1. Push changes to GitHub
2. Vercel auto-deploys from `main` branch
3. Preview deployments created for all branches

**Manual Redeploy** (if needed):
- Render: Dashboard → Service → **Manual Deploy** → **Deploy latest commit**
- Vercel: Dashboard → Deployments → **...** → **Redeploy**

### File Upload Storage

Render's free tier includes ephemeral storage (resets on restart). For production:

**Option 1: Upgrade to Persistent Disk (Render)**
1. Dashboard → Service → **Disks**
2. Add disk: `/opt/render/project/uploads` (mount path)
3. Size: 1GB+ depending on needs ($0.25/GB/month)

**Option 2: Use Cloud Storage** (future feature)
- AWS S3, Cloudflare R2, or similar
- Update `.env` with cloud storage credentials
- Set `USE_CLOUD_STORAGE=true`

---

## 🐛 Troubleshooting

### Backend Issues

**Problem: "Database unavailable" on health check**
```bash
# Check database status in Render Dashboard
# Verify DATABASE_URL is correctly set
# Restart service if needed
```

**Problem: 503 Service Unavailable**
```bash
# Free tier: Backend sleeps after 15 minutes inactivity
# First request after sleep takes ~30 seconds to wake up
# Solution: Upgrade to Starter plan ($7/mo) for always-on
```

**Problem: Upload fails**
```bash
# Check UPLOAD_DIR environment variable
# Ensure persistent disk is mounted (paid plan)
# Verify MAX_FILE_SIZE is set correctly
```

### Frontend Issues

**Problem: API calls fail with CORS error**
```bash
# Verify FRONTEND_URL in backend matches your Vercel URL exactly
# Check Clerk allowed origins include both URLs
# Ensure VITE_API_URL in frontend points to correct backend URL
```

**Problem: Build fails on Vercel**
```bash
# Check build logs in Vercel Dashboard
# Verify all environment variables are set
# Ensure Node version matches (20.19+)
# Try clearing build cache: Settings → General → Clear Cache
```

**Problem: Environment variables not updating**
```bash
# After changing env vars, must redeploy
# Vercel: Deployments → ... → Redeploy
# Changes only apply to new builds, not existing deployments
```

### Authentication Issues

**Problem: Clerk authentication not working**
```bash
# Verify CLERK_SECRET_KEY and VITE_CLERK_PUBLISHABLE_KEY match
# Check Clerk Dashboard → API Keys (use live keys, not test keys)
# Ensure domains are added in Clerk → Paths
# Clear browser cookies and try again
```

**Problem: Google Sign-In fails**
```bash
# Verify GOOGLE_CLIENT_ID is set in both frontend and backend
# Check Google Console → Authorized origins/redirect URIs
# Ensure origins use HTTPS (not HTTP)
# Test with incognito window to rule out cookie issues
```

### Database Issues

**Problem: Connection pool exhausted**
```bash
# Render free tier: 5 connections max
# Solution: Upgrade to Starter plan (20 connections)
# Or optimize queries to reduce concurrent connections
```

**Problem: Database migration needed**
```bash
# SSH-equivalent not available on Render free tier
# Run migrations via backend API endpoint
# Or use Render Shell (paid plans): Dashboard → Service → Shell
```

---

## 🔒 Security Checklist

Before going live, verify:

- [ ] **Secrets**: All JWT_SECRET values are strong (64+ chars) and different from development
- [ ] **Admin Password**: Changed from default, 12+ characters, mix of letters/numbers/symbols
- [ ] **CLERK_SECRET_KEY**: Using live key (sk_live_*), not test key
- [ ] **HTTPS**: Both frontend and backend use HTTPS
- [ ] **CORS**: FRONTEND_URL matches exactly (no trailing slash)
- [ ] **Cookie Settings**: COOKIE_SAME_SITE=none for split domains
- [ ] **Rate Limiting**: DISABLE_RATE_LIMIT=false in production
- [ ] **Demo Data**: SEED_DEMO_DATA=false in production
- [ ] **Database SSL**: DATABASE_URL includes ?sslmode=require
- [ ] **Clerk Domains**: Both URLs added to Clerk allowed origins
- [ ] **Google OAuth**: Authorized origins use production URLs
- [ ] **Environment Variables**: No secrets committed to Git
- [ ] **File Uploads**: Persistent disk configured (or cloud storage)

---

## 💰 Cost Breakdown

### Free Tier (Good for Development)

| Service | Free Tier | Limitations |
|---------|-----------|-------------|
| **Render Backend** | Free for 90 days | Sleeps after 15 min, 512MB RAM |
| **Render Database** | Free | 1GB storage, 5 connections |
| **Vercel Frontend** | Free forever | 100GB bandwidth, hobby use only |
| **Clerk Auth** | Free | 10,000 MAUs (Monthly Active Users) |
| **Total** | **$0/month** | Sleep delays, limited storage |

### Starter Tier (Recommended for Production)

| Service | Cost | Benefits |
|---------|------|----------|
| **Render Backend** | $7/month | Always-on, 512MB RAM |
| **Render Database** | $7/month | 10GB storage, 20 connections, daily backups |
| **Render Disk (1GB)** | $0.25/month | Persistent file uploads |
| **Vercel Frontend** | Free-$20/month | Pro for commercial use ($20) |
| **Clerk Auth** | Free-$25/month | Free up to 10k MAUs |
| **Total** | **$14.25-41.25/month** | Production-ready |

### Scaling Tier (High Traffic)

| Service | Cost | Specs |
|---------|------|-------|
| **Render Backend** | $25+/month | 2GB+ RAM, dedicated CPU |
| **Render Database** | $20+/month | 20GB+ storage |
| **Vercel Pro** | $20/month | 1TB bandwidth |
| **Clerk Growth** | $25+/month | 10k+ MAUs |
| **Total** | **$90+/month** | Scales with usage |

---

## 📚 Additional Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Clerk Docs**: https://clerk.com/docs
- **PostgreSQL Best Practices**: https://render.com/docs/databases
- **Node.js on Render**: https://render.com/docs/node-version

---

## 🆘 Getting Help

**Render Support**:
- Free tier: Community forum
- Paid plans: Email support
- Status: https://status.render.com

**Vercel Support**:
- Free tier: Community Discord
- Pro plans: Email support
- Status: https://www.vercel-status.com

**Clerk Support**:
- Free tier: Documentation + Discord
- Paid plans: Email support
- Status: https://status.clerk.com

---

## 🎓 Pro Tips

1. **Enable Preview Deployments**: Both Vercel and Render support preview URLs for branches - great for testing before merging to main

2. **Set up Alerts**: Configure uptime monitoring with services like UptimeRobot or BetterStack

3. **Use Environment-Specific Variables**: Leverage Vercel's preview/production environments to test with staging backend before prod

4. **Database Backups**: Download manual backups before major schema changes

5. **Monitor Cold Starts**: On free tier, first request after sleep takes ~30s. Upgrade to Starter to eliminate this.

6. **Optimize Images**: Use Sharp's auto-optimization for uploaded images to save storage and bandwidth

7. **CDN Caching**: Vercel automatically caches static assets. Configure cache headers for uploaded media files.

---

## 🚀 Next Steps

After successful deployment:

1. ✅ Test all features (auth, uploads, websockets)
2. ✅ Set up uptime monitoring
3. ✅ Configure automated database backups
4. ✅ Add custom domain
5. ✅ Set up error tracking (Sentry, LogRocket, etc.)
6. ✅ Enable database connection pooling
7. ✅ Plan for scaling as traffic grows

**Congratulations!** Your USFLIX app is now live on production-grade infrastructure. 🎉
