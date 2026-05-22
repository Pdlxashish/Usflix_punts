# 🚀 Deployment Guide

This guide will help you deploy your USFLIX application to production.

---

## 📋 Pre-Deployment Checklist

Before deploying, complete these steps:

### 1. Generate Environment Variables

**Windows (PowerShell):**
```powershell
.\scripts\setup-env.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/setup-env.sh
./scripts/setup-env.sh
```

**Or manually generate JWT secret:**
```bash
node scripts/generate-jwt-secret.js
```

### 2. Install New Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ..
npm install
```

### 3. Test Locally

```bash
# Start database (if using Docker)
docker-compose up db -d

# Start backend
cd backend
npm run dev

# Start frontend (in another terminal)
npm run dev
```

Visit `http://localhost:8080` and verify everything works.

---

## 🎯 Deployment Options

Choose one of these deployment strategies:

### Option A: Railway + Vercel (Recommended - Easiest)
### Option B: Docker + VPS (Most Control)
### Option C: AWS/DigitalOcean (Scalable)

---

## 🚂 Option A: Railway + Vercel Deployment

### Step 1: Deploy Backend to Railway

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository

3. **Add PostgreSQL Database**
   - In your project, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically create and connect the database

4. **Configure Backend Service**
   - Click "New" → "GitHub Repo"
   - Select your repository
   - Railway will auto-detect and deploy

5. **Set Environment Variables**
   Go to your backend service → Variables tab and add:
   
   ```env
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=<your-generated-secret>
   JWT_EXPIRES_IN=24h
   FRONTEND_URL=https://your-app.vercel.app
   UPLOAD_DIR=./uploads
   MAX_FILE_SIZE=4294967296
   USE_CLOUD_STORAGE=false
   ```

6. **Get Backend URL**
   - Go to Settings → Networking
   - Copy the public URL (e.g., `https://your-app.up.railway.app`)

### Step 2: Deploy Frontend to Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Create `.env.production`**
   ```env
   VITE_API_URL=https://your-backend.up.railway.app
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Configure Environment Variables in Vercel**
   - Go to your project on vercel.com
   - Settings → Environment Variables
   - Add: `VITE_API_URL=https://your-backend.up.railway.app`

5. **Update Backend CORS**
   - Go back to Railway
   - Update `FRONTEND_URL` to your Vercel URL
   - Redeploy backend

### Step 3: Test Production Deployment

Visit your Vercel URL and test:
- ✅ Homepage loads
- ✅ Can browse albums
- ✅ Can play videos
- ✅ Can login to admin
- ✅ Can upload files

---

## 🐳 Option B: Docker Deployment

### Step 1: Prepare Environment

1. **Create `.env` file in project root:**
   ```env
   DB_PASSWORD=your-secure-password
   JWT_SECRET=your-generated-jwt-secret
   FRONTEND_URL=http://your-domain.com
   ```

2. **Update `backend/.env`:**
   ```env
   DATABASE_URL=postgresql://postgres:your-secure-password@db:5432/usflix
   JWT_SECRET=your-generated-jwt-secret
   NODE_ENV=production
   PORT=3001
   FRONTEND_URL=http://your-domain.com
   ```

### Step 2: Build and Run

```bash
# Build and start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Step 3: Access Application

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:3001`
- Database: `localhost:5432`

### Step 4: Deploy to VPS

1. **Copy files to server:**
   ```bash
   scp -r . user@your-server:/app
   ```

2. **SSH into server:**
   ```bash
   ssh user@your-server
   cd /app
   ```

3. **Start services:**
   ```bash
   docker-compose up -d
   ```

4. **Configure Nginx reverse proxy** (see below)

---

## 🌐 Nginx Configuration (for VPS)

Create `/etc/nginx/sites-available/usflix`:

```nginx
# Frontend
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Increase upload size limit
        client_max_body_size 4G;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/usflix /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 SSL/HTTPS Setup

### Using Certbot (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d api.your-domain.com

# Auto-renewal is configured automatically
```

---

## ☁️ Cloud Storage Setup (Optional but Recommended)

### Option 1: Cloudflare R2 (Recommended - Cheaper)

1. **Create R2 Bucket**
   - Go to Cloudflare Dashboard → R2
   - Create bucket (e.g., `usflix-media`)
   - Enable public access

2. **Get API Credentials**
   - Go to R2 → Manage R2 API Tokens
   - Create API token with read/write permissions

3. **Update Environment Variables**
   ```env
   USE_CLOUD_STORAGE=true
   R2_ACCOUNT_ID=your-account-id
   R2_ACCESS_KEY_ID=your-access-key
   R2_SECRET_ACCESS_KEY=your-secret-key
   R2_BUCKET_NAME=usflix-media
   R2_PUBLIC_URL=https://your-bucket.r2.dev
   ```

### Option 2: AWS S3

1. **Create S3 Bucket**
   - Go to AWS Console → S3
   - Create bucket with public read access

2. **Create IAM User**
   - Go to IAM → Users → Create user
   - Attach policy: `AmazonS3FullAccess`
   - Generate access keys

3. **Update Environment Variables**
   ```env
   USE_CLOUD_STORAGE=true
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_S3_BUCKET=usflix-media
   AWS_REGION=us-east-1
   ```

---

## 📊 Monitoring & Maintenance

### Health Checks

Your application includes health check endpoints:

- Backend: `https://api.your-domain.com/api/health`
- Frontend: `https://your-domain.com/health`

### Logging

**View Docker logs:**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

**View Railway logs:**
- Go to your service → Deployments → Click on deployment → View logs

### Database Backups

**Manual backup:**
```bash
# Docker
docker-compose exec db pg_dump -U postgres usflix > backup.sql

# Railway
railway run pg_dump $DATABASE_URL > backup.sql
```

**Restore backup:**
```bash
# Docker
docker-compose exec -T db psql -U postgres usflix < backup.sql

# Railway
railway run psql $DATABASE_URL < backup.sql
```

### Automated Backups

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * cd /app && docker-compose exec -T db pg_dump -U postgres usflix > /backups/usflix-$(date +\%Y\%m\%d).sql
```

---

## 🔧 Troubleshooting

### Backend won't start

1. Check environment variables are set correctly
2. Verify database connection: `DATABASE_URL`
3. Check logs: `docker-compose logs backend`

### Frontend can't connect to backend

1. Verify `VITE_API_URL` is set correctly
2. Check CORS settings in backend
3. Verify backend is accessible from frontend

### File uploads failing

1. Check `MAX_FILE_SIZE` setting
2. Verify upload directory permissions
3. If using cloud storage, check credentials

### Database connection errors

1. Verify `DATABASE_URL` format
2. Check database is running
3. Verify network connectivity

---

## 📈 Performance Optimization

### Enable Caching

Add Redis for caching:

```yaml
# docker-compose.yml
redis:
  image: redis:alpine
  ports:
    - "6379:6379"
```

### CDN Setup

Use Cloudflare CDN:
1. Add your domain to Cloudflare
2. Enable caching rules
3. Enable image optimization

### Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX idx_media_category ON media_items(category);
CREATE INDEX idx_media_status ON media_items(status);
CREATE INDEX idx_media_type ON media_items(type);
```

---

## 🎉 Post-Deployment

### 1. Test Everything

- [ ] Homepage loads
- [ ] Videos play
- [ ] Images display
- [ ] Admin login works
- [ ] File uploads work
- [ ] Comments work
- [ ] Profiles work

### 2. Set Up Monitoring

- [ ] Add uptime monitoring (UptimeRobot, Pingdom)
- [ ] Set up error tracking (Sentry)
- [ ] Configure alerts

### 3. Security

- [ ] Enable HTTPS
- [ ] Set strong passwords
- [ ] Enable firewall
- [ ] Regular backups
- [ ] Keep dependencies updated

---

## 🆘 Need Help?

If you encounter issues:

1. Check the logs first
2. Verify environment variables
3. Test database connection
4. Check network/firewall settings
5. Review this guide again

Common issues and solutions are in the Troubleshooting section above.

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

**Congratulations! Your USFLIX application is now production-ready! 🎉**
