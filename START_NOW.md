# 🚀 Start Your Application NOW

Since you already have PostgreSQL installed, you can start immediately!

---

## ✅ Prerequisites Check

You already have:
- ✅ PostgreSQL installed and running
- ✅ Node.js installed
- ✅ Dependencies installed
- ✅ Environment files configured

---

## 🎯 Start in 2 Steps

### Step 1: Start Backend

Open a terminal and run:

```powershell
cd backend
npm run dev
```

**Expected output:**
```
✅ PostgreSQL connected: 2026-05-20T...
✅ Database tables created/verified
🌱 Seeding database...
🌱 Seeding complete!
🚀 USFLIX Backend running on http://localhost:3001
📡 API available at http://localhost:3001/api
🌐 CORS allowing: http://localhost:8080
```

If you see this, **backend is ready!** ✅

---

### Step 2: Start Frontend

Open a **NEW terminal** and run:

```powershell
npm run dev
```

**Expected output:**
```
VITE v7.3.3  ready in 4080 ms
➜  Local:   http://localhost:8080/
➜  Network: http://192.168.1.85:8080/
```

If you see this, **frontend is ready!** ✅

---

## 🌐 Access Your Application

Open your browser and go to:

**http://localhost:8080**

You should see your USFLIX homepage! 🎉

---

## 🧪 Test These Features

1. **Browse Albums** - Click on any album
2. **Play Videos** - Click on a video to play
3. **View Photos** - Click on photo albums
4. **Admin Panel** - Login with admin credentials

---

## ⚠️ Troubleshooting

### "Cannot connect to database"

**Check if PostgreSQL is running:**
```powershell
psql -U postgres -c "SELECT version();"
```

**If not running, start it:**
```powershell
# Windows (if installed as service)
net start postgresql-x64-16

# Or check Services app (services.msc)
```

---

### "Database 'usflix' does not exist"

**Create the database:**
```powershell
psql -U postgres -c "CREATE DATABASE usflix;"
```

Then restart the backend.

---

### "Port 3001 already in use"

**Kill the process using port 3001:**
```powershell
# Find process
netstat -ano | findstr :3001

# Kill it (replace PID with actual number)
taskkill /PID <PID> /F
```

---

### "Port 8080 already in use"

**Kill the process using port 8080:**
```powershell
# Find process
netstat -ano | findstr :8080

# Kill it (replace PID with actual number)
taskkill /PID <PID> /F
```

---

## 🎉 You're Done!

Your application is now running locally. You can:

- Browse and watch videos
- Upload new content (admin panel)
- Test all features
- Make changes and see them live

---

## 🚀 Next: Deploy to Production

When you're ready to deploy, check:
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Full deployment instructions
- **[NEXT_STEPS.md](NEXT_STEPS.md)** - Deployment options

---

## 💡 Quick Tips

**Stop the servers:**
- Press `Ctrl + C` in each terminal

**Restart after changes:**
- Backend: Automatically restarts (watch mode)
- Frontend: Automatically reloads (hot reload)

**View logs:**
- Backend: Check the terminal where you ran `npm run dev`
- Frontend: Check browser console (F12)

---

## 📚 Need Help?

- Backend not starting? Check PostgreSQL is running
- Frontend not loading? Check backend is running first
- Database errors? Check `backend/.env` has correct credentials

---

**That's it! Enjoy your personal Netflix! 🎬**
