# 🚀 Deployment Checklist

Use this checklist to ensure smooth deployment of USFLIX to Render + Vercel.

## Pre-Deployment

### 1. Code Preparation
- [ ] All changes committed to Git
- [ ] Code pushed to GitHub repository
- [ ] Environment files (.env) are in .gitignore
- [ ] No secrets or API keys in code
- [ ] Dependencies up to date (`npm audit` passes)

### 2. Generate Secrets
```bash
npm run production:secrets
```
- [ ] JWT_SECRET generated and saved
- [ ] USER_JWT_SECRET generated and saved
- [ ] Admin password created (12+ characters)

### 3. Third-Party Services
- [ ] Clerk account created at https://dashboard.clerk.com/
- [ ] Clerk app created with production keys
- [ ] Google Cloud Console project created (if using Google OAuth)
- [ ] Google OAuth credentials created (if needed)

---

## Backend Deployment (Render)

### 1. Create Web Service
- [ ] Logged into Render Dashboard
- [ ] Created new Web Service
- [ ] Connected GitHub repository
- [ ] Selected `backend` as root directory
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm start`

### 2. Environment Variables Set
- [ ] CLERK_SECRET_KEY (from Clerk Dashboard)
- [ ] DATABASE_URL (auto-filled after database creation)
- [ ] JWT_SECRET (from generation step)
- [ ] USER_JWT_SECRET (from generation step)
- [ ] ADMIN_USERNAME (your choice)
- [ ] ADMIN_PASSWORD (strong password, 12+ chars)
- [ ] NODE_ENV=production
- [ ] PORT=3001
- [ ] FRONTEND_URL (update after frontend deployment)
- [ ] GOOGLE_CLIENT_ID (if using Google OAuth)
- [ ] UPLOAD_DIR=/opt/render/project/uploads
- [ ] MAX_FILE_SIZE=4294967296
- [ ] COOKIE_SAME_SITE=none
- [ ] DISABLE_RATE_LIMIT=false
- [ ] SEED_DEMO_DATA=false

### 3. Database Setup
- [ ] PostgreSQL database created
- [ ] Database connected to backend service
- [ ] DATABASE_URL environment variable populated

### 4. First Deploy
- [ ] Backend deployed successfully
- [ ] Build logs show no errors
- [ ] Health check passes: `curl https://your-backend.onrender.com/api/health`
- [ ] Backend URL noted (e.g., https://usflix-backend.onrender.com)

---

## Frontend Deployment (Vercel)

### 1. Create Project
- [ ] Logged into Vercel Dashboard
- [ ] Imported GitHub repository
- [ ] Framework preset: Vite
- [ ] Root directory: `./`
- [ ] Build command: `npm run build`
- [ ] Output directory: `.output/public`

### 2. Environment Variables Set
- [ ] VITE_CLERK_PUBLISHABLE_KEY (from Clerk Dashboard)
- [ ] CLERK_SECRET_KEY (from Clerk Dashboard)
- [ ] VITE_API_URL (your Render backend URL)
- [ ] VITE_GOOGLE_CLIENT_ID (if using Google OAuth)

### 3. First Deploy
- [ ] Frontend deployed successfully
- [ ] Build logs show no errors
- [ ] Site accessible at Vercel URL
- [ ] Frontend URL noted (e.g., https://your-app.vercel.app)

### 4. Update Backend CORS
- [ ] Returned to Render Dashboard
- [ ] Updated FRONTEND_URL with Vercel URL
- [ ] Backend redeployed with new CORS settings

---

## Authentication Configuration

### Clerk Setup
- [ ] Production domain added to Clerk allowed origins
- [ ] Backend URL added to Clerk allowed origins
- [ ] Sign-in redirect URL configured
- [ ] Sign-up redirect URL configured
- [ ] Sign-out redirect URL configured
- [ ] Email authentication enabled
- [ ] Google authentication enabled (if using)

### Google OAuth (if applicable)
- [ ] OAuth consent screen configured
- [ ] Web application credentials created
- [ ] Authorized JavaScript origins added:
  - [ ] Frontend URL
  - [ ] Backend URL
- [ ] Authorized redirect URIs added:
  - [ ] Frontend URL
  - [ ] Backend callback URL
- [ ] Client ID copied to environment variables

---

## Testing

### Backend Tests
- [ ] Health endpoint responds: `curl https://your-backend.onrender.com/api/health`
- [ ] Database connection works
- [ ] API endpoints accessible
- [ ] CORS headers correct
- [ ] Rate limiting functional

### Frontend Tests
- [ ] Homepage loads
- [ ] User registration works
- [ ] User login works
- [ ] File upload works
- [ ] API calls succeed
- [ ] Google Sign-In works (if enabled)

### Integration Tests
- [ ] Create account on frontend
- [ ] Upload photo/video
- [ ] View uploaded content
- [ ] Test WebSocket features (if applicable)
- [ ] Test on mobile browser
- [ ] Test in incognito/private mode

---

## Production Hardening

### Security
- [ ] All secrets using strong random values
- [ ] Admin password is strong (12+ characters)
- [ ] Database SSL enabled (?sslmode=require in connection string)
- [ ] HTTPS enforced on both frontend and backend
- [ ] Rate limiting enabled
- [ ] Demo seed data disabled
- [ ] Security headers configured

### Performance
- [ ] Backend on always-on plan (or accept cold starts on free tier)
- [ ] Database on appropriate plan for traffic
- [ ] Persistent disk configured for uploads (or plan to add)
- [ ] CDN caching verified on frontend

### Monitoring
- [ ] Backend logs accessible in Render
- [ ] Frontend logs accessible in Vercel
- [ ] Database metrics accessible in Render
- [ ] Uptime monitoring configured (optional)
- [ ] Error tracking configured (optional)

---

## Post-Deployment

### Documentation
- [ ] Deployment URLs documented
- [ ] Admin credentials stored securely
- [ ] Environment variables backed up securely
- [ ] Team members granted access to services

### Domain Setup (Optional)
- [ ] Custom domain purchased
- [ ] DNS records configured in Vercel
- [ ] SSL certificate issued
- [ ] Backend FRONTEND_URL updated with custom domain
- [ ] Clerk redirect URLs updated with custom domain

### Backup Strategy
- [ ] Database backup schedule confirmed
- [ ] Manual backup tested
- [ ] Upload storage backup plan created

### Maintenance Plan
- [ ] Update procedure documented
- [ ] Rollback procedure understood
- [ ] Monitoring alerts configured
- [ ] Support contacts saved

---

## Common Issues & Solutions

### Backend sleeps (Free tier)
**Issue**: First request after 15 minutes takes 30+ seconds  
**Solution**: Upgrade to Starter plan ($7/mo) or accept cold starts

### CORS errors
**Issue**: API calls fail with CORS error  
**Solution**: Verify FRONTEND_URL in backend matches Vercel URL exactly (no trailing slash)

### Upload fails
**Issue**: Files don't persist after backend restart  
**Solution**: Add persistent disk in Render or upgrade to paid plan

### Authentication fails
**Issue**: Clerk authentication not working  
**Solution**: Verify all domains added to Clerk Dashboard and keys are live keys (not test)

### Database connection fails
**Issue**: "Database unavailable" error  
**Solution**: Check DATABASE_URL format includes ?sslmode=require

---

## Upgrade Path

When you're ready to scale:

1. **Render Backend**: Free → Starter ($7/mo)
   - Eliminates cold starts
   - Always-on service

2. **Render Database**: Free → Starter ($7/mo)
   - 10GB storage
   - Daily backups
   - Better performance

3. **Add Persistent Disk**: $0.25/GB/month
   - Required for production file uploads

4. **Vercel Pro**: Free → Pro ($20/mo)
   - Required for commercial use
   - 1TB bandwidth
   - Advanced analytics

5. **Clerk Growth**: Free → Growth ($25/mo)
   - Beyond 10k monthly active users

---

## 🎉 Success!

If all items are checked, your USFLIX app is successfully deployed!

**Next Steps**:
- Share the app URL with users
- Monitor logs for any issues
- Plan for scaling as traffic grows
- Set up automated backups
- Consider adding error tracking (Sentry)
- Add performance monitoring

**Support Resources**:
- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Clerk Docs: https://clerk.com/docs
- Project Issues: [Your GitHub repo]/issues

---

**Deployed on**: _____________  
**Backend URL**: _____________  
**Frontend URL**: _____________  
**Custom Domain**: _____________  
**Admin Email**: _____________
