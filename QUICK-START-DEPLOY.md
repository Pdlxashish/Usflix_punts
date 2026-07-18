# ⚡ Quick Start Deployment Guide

**Goal**: Deploy USFLIX to production in under 30 minutes.

## Prerequisites (5 minutes)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Create accounts** (all free):
   - [Render](https://render.com/) - Backend hosting
   - [Vercel](https://vercel.com/) - Frontend hosting
   - [Clerk](https://dashboard.clerk.com/) - Authentication

3. **Generate secrets**:
   ```bash
   npm run production:secrets
   ```
   Save the output - you'll need these JWT secrets.

---

## Step 1: Deploy Backend (10 minutes)

### A. Create Render Service
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### B. Add Database
1. Click **New +** → **PostgreSQL**
2. Name it `usflix-db`
3. Copy the **Internal Database URL**

### C. Set Environment Variables
In your service → Environment, add:

```env
CLERK_SECRET_KEY=sk_live_XXX                    # Get from Clerk Dashboard
DATABASE_URL=<paste Internal Database URL>      # From step B
JWT_SECRET=<from npm run production:secrets>
USER_JWT_SECRET=<from npm run production:secrets>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<choose strong password 12+ chars>
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://TEMP                       # Update after frontend deploy
UPLOAD_DIR=/opt/render/project/uploads
COOKIE_SAME_SITE=none
```

### D. Deploy
- Click **Create Web Service**
- Wait ~3 minutes for build
- Note your backend URL: `https://usflix-backend.onrender.com`

✅ **Test**: `curl https://your-backend.onrender.com/api/health`

---

## Step 2: Deploy Frontend (10 minutes)

### A. Create Vercel Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New...** → **Project**
3. Import your GitHub repo
4. Configure:
   - **Framework**: TanStack Start
   - **Build Command**: leave default (`npm run build`)
   - **Output Directory**: leave default

### B. Set Environment Variables
In Settings → Environment Variables, add:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_XXX         # Get from Clerk Dashboard
CLERK_SECRET_KEY=sk_live_XXX                    # Same as backend
VITE_API_URL=https://usflix-backend.onrender.com  # Your backend URL
# Optional: VITE_WS_URL=wss://usflix-backend.onrender.com/ws
```

Select: ✅ Production ✅ Preview ✅ Development

### C. Deploy
- Click **Deploy**
- Wait ~2 minutes
- Note your frontend URL: `https://your-app.vercel.app`

### D. Update Backend CORS
1. Go back to Render → Your service → Environment
2. Update `FRONTEND_URL` to your Vercel URL
3. Save (auto-redeploys)

---

## Step 3: Configure Clerk (5 minutes)

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Go to **API Keys** → Copy:
   - **Publishable Key** (pk_live_...)
   - **Secret Key** (sk_live_...)
3. Go to **Paths** → Add URLs:
   - Your Vercel URL
   - Your Render URL
4. Configure redirects:
   - **Sign-in**: `https://your-app.vercel.app/`
   - **Sign-up**: `https://your-app.vercel.app/`
   - **Sign-out**: `https://your-app.vercel.app/`

---

## Step 4: Test Everything (5 minutes)

### Backend Health
```bash
curl https://your-backend.onrender.com/api/health
# Should return: {"ok":true,"timestamp":"..."}
```

### Frontend
1. Open `https://your-app.vercel.app`
2. Click **Sign Up** or **Log In**
3. Create an account
4. Try uploading a photo

### Integration
- [ ] Can create account
- [ ] Can log in
- [ ] Can upload file
- [ ] Can view uploaded content

---

## 🎉 Done!

Your app is live! Here's what you deployed:

- **Frontend**: Hosted on Vercel with global CDN
- **Backend**: Running on Render with PostgreSQL
- **Auth**: Managed by Clerk
- **Cost**: $0/month (free tier) or $14/month (production tier)

---

## Next Steps

### Immediate
1. Save your URLs and credentials securely
2. Update README with deployment URLs
3. Share with team/users

### Within 24 Hours
1. Test thoroughly (different devices, browsers)
2. Set up uptime monitoring
3. Configure custom domain (optional)

### Within 1 Week
1. Add persistent disk for uploads (Render paid plan)
2. Set up database backups
3. Review logs and fix any issues

---

## Troubleshooting

**Backend takes 30+ seconds on first request?**
→ Free tier sleeps after 15 minutes. Upgrade to Starter ($7/mo) for always-on.

**CORS errors when calling API?**
→ Verify FRONTEND_URL in Render exactly matches your Vercel URL (no trailing slash).

**Clerk auth not working?**
→ Check you're using **live keys** (pk_live_/sk_live_), not test keys.

**Uploads not persisting?**
→ Free tier has ephemeral storage. Add persistent disk or upgrade plan.

---

## Upgrade to Production

When ready for real users, upgrade:

1. **Render Backend**: Free → Starter ($7/mo)
   - Always-on (no cold starts)
   - Better performance

2. **Render Database**: Free → Starter ($7/mo)
   - 10GB storage
   - Daily backups

3. **Add Disk Storage**: $0.25/GB/mo
   - 1GB minimum for uploads

4. **Vercel**: Free → Pro ($20/mo)
   - Required for commercial use

**Total**: ~$14-34/month for production

---

## Support

- **Deployment issues**: See full [DEPLOY.md](./DEPLOY.md)
- **Checklist**: See [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md)
- **Render**: https://render.com/docs
- **Vercel**: https://vercel.com/docs
- **Clerk**: https://clerk.com/docs
