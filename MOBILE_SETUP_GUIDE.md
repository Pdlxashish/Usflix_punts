# Mobile Device Setup Guide

## The Problem

Your mobile phone **cannot access `localhost`** or `127.0.0.1` because those addresses refer to the device itself, not your computer. To test the app on your phone, you need to use your computer's **local network IP address**.

## Quick Fix (5 Minutes)

### Step 1: Find Your Computer's IP Address

#### On Windows:
1. Open Command Prompt (Win + R, type `cmd`, press Enter)
2. Type: `ipconfig`
3. Look for "IPv4 Address" under your active network adapter
4. It will look like: `192.168.1.100` or `192.168.0.50` or `10.0.0.5`

#### On Mac/Linux:
1. Open Terminal
2. Type: `ifconfig` or `ip addr`
3. Look for your local IP (usually starts with `192.168` or `10.0`)

**Example:** Let's say your IP is `192.168.1.100`

### Step 2: Update Your .env File

1. Open `.env` file in the project root
2. Change this line:
   ```
   VITE_API_URL=http://localhost:3001
   ```
   To:
   ```
   VITE_API_URL=http://192.168.1.100:3001
   ```
   (Replace `192.168.1.100` with YOUR computer's IP)

### Step 3: Update Backend CORS Settings

1. Open `backend/.env`
2. Change this line:
   ```
   FRONTEND_URL=http://localhost:5173
   ```
   To:
   ```
   FRONTEND_URL=http://192.168.1.100:5173
   ```

### Step 4: Restart Both Servers

```bash
# Stop both servers (Ctrl+C)

# Restart backend
cd backend
npm run dev

# Restart frontend (in new terminal)
npm run dev
```

### Step 5: Access from Your Phone

1. Make sure your phone is on the **same WiFi network** as your computer
2. Open browser on your phone
3. Go to: `http://192.168.1.100:5173` (use YOUR IP)
4. Thumbnails should now load! 🎉

## Troubleshooting

### Thumbnails Still Not Showing?

#### Check 1: Can you access the backend?
Open on your phone: `http://192.168.1.100:3001/api/health`

**Expected:** You should see: `{"ok":true,"timestamp":"...","env":"development"}`

**If it fails:** Your firewall might be blocking connections.

#### Check 2: Can you access uploaded images?
Open on your phone: `http://192.168.1.100:3001/uploads/[filename].jpg`

**If it fails:** Backend isn't serving files correctly.

#### Check 3: Check browser console
1. On Android Chrome: Menu → More Tools → Developer Tools
2. On iOS Safari: Settings → Safari → Advanced → Web Inspector
3. Look for errors related to image loading

### Firewall Issues (Windows)

If your phone can't connect:

1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Find Node.js and check both Private and Public
4. Or temporarily disable firewall for testing

### Firewall Issues (Mac)

1. System Preferences → Security & Privacy → Firewall
2. Click "Firewall Options"
3. Allow Node to accept incoming connections

### Network Issues

- **Different WiFi networks?** Phone and computer must be on the same network
- **Guest network?** Some guest networks block device-to-device communication
- **VPN active?** Disable VPN on your computer
- **Mobile data?** Won't work - must use WiFi

## Production Deployment

For production, you'll deploy to a real domain:

1. Deploy backend to a service (Railway, Render, Heroku, etc.)
2. Deploy frontend to Vercel, Netlify, or Cloudflare Pages
3. Update `.env` with production URLs:
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```

## Testing Checklist

Once you've updated the IP addresses:

- [ ] Backend health check works from phone
- [ ] Frontend loads on phone
- [ ] Home page thumbnails visible
- [ ] Album thumbnails visible
- [ ] Video thumbnails visible
- [ ] Uploaded images load correctly
- [ ] Can upload new images from phone
- [ ] Videos play correctly

## Common Mistakes

❌ **Using `localhost` in .env** - Won't work on mobile
✅ **Using your computer's IP** - Works on same network

❌ **Different WiFi networks** - Phone and computer must match
✅ **Same WiFi network** - Both devices connected to same router

❌ **Firewall blocking** - Computer blocks incoming connections
✅ **Firewall allows Node.js** - Connections permitted

❌ **Wrong IP address** - Using old or incorrect IP
✅ **Current IP address** - Check with `ipconfig` or `ifconfig`

## Quick Reference

### Your Current Setup (Update These)

```bash
# Frontend .env
VITE_API_URL=http://YOUR_IP_HERE:3001

# Backend .env
FRONTEND_URL=http://YOUR_IP_HERE:5173
PORT=3001

# Access from phone
http://YOUR_IP_HERE:5173
```

### Find Your IP (Quick Commands)

```bash
# Windows
ipconfig | findstr IPv4

# Mac/Linux
ifconfig | grep "inet "

# Alternative (all platforms with Node.js)
node -e "console.log(require('os').networkInterfaces())"
```

## Need More Help?

1. Check that both servers are running
2. Verify your IP hasn't changed (routers can reassign IPs)
3. Try accessing from computer browser first: `http://YOUR_IP:5173`
4. Check browser console for specific error messages
5. Verify uploaded files exist in `backend/uploads/` folder

## Static IP (Optional)

To avoid changing the IP every time:

1. Access your router settings (usually `192.168.1.1` or `192.168.0.1`)
2. Find DHCP settings
3. Reserve/assign a static IP for your computer's MAC address
4. Your IP will stay the same even after restarts
