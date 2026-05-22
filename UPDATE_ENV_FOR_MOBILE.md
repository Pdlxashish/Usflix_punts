# 🚨 URGENT: Update .env for Mobile Testing

## The Issue
Thumbnails don't show on mobile because `localhost` doesn't work on phones!

## Quick Fix (2 Minutes)

### 1. Find Your Computer's IP

**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address" - it looks like `192.168.1.100`

**Mac/Linux:**
```bash
ifconfig
```
Look for your local IP (starts with `192.168` or `10.0`)

### 2. Update `.env` File

Open `.env` in the project root and change:

**FROM:**
```
VITE_API_URL=http://localhost:3001
```

**TO:**
```
VITE_API_URL=http://YOUR_IP_HERE:3001
```

Example:
```
VITE_API_URL=http://192.168.1.100:3001
```

### 3. Update `backend/.env`

**FROM:**
```
FRONTEND_URL=http://localhost:5173
```

**TO:**
```
FRONTEND_URL=http://YOUR_IP_HERE:5173
```

Example:
```
FRONTEND_URL=http://192.168.1.100:5173
```

### 4. Restart Servers

```bash
# Stop both servers (Ctrl+C)

# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
npm run dev
```

### 5. Test on Phone

1. Connect phone to **same WiFi** as computer
2. Open browser on phone
3. Go to: `http://YOUR_IP_HERE:5173`
4. Thumbnails should now work! ✅

## Example Complete Setup

If your IP is `192.168.1.100`:

**`.env` (root folder):**
```env
VITE_API_URL=http://192.168.1.100:3001
```

**`backend/.env`:**
```env
FRONTEND_URL=http://192.168.1.100:5173
PORT=3001
DATABASE_URL=file:./dev.db
JWT_SECRET=your-secret-here
UPLOAD_DIR=./uploads
```

**Access from phone:**
```
http://192.168.1.100:5173
```

## Still Not Working?

### Check Firewall (Windows)
1. Windows Defender Firewall → Allow an app
2. Find Node.js → Check both Private and Public

### Check Network
- Phone and computer on same WiFi? ✅
- Not using guest network? ✅
- VPN disabled? ✅

### Test Backend
Open on phone: `http://YOUR_IP:3001/api/health`

Should see: `{"ok":true,...}`

## That's It!

After updating the IP addresses and restarting, thumbnails will load on mobile devices.

See `MOBILE_SETUP_GUIDE.md` for detailed troubleshooting.
