# Troubleshooting - Thumbnails Not Showing

## Current Configuration ✅

**Your Computer's IP**: `192.168.1.85`

**Backend**: Running on `http://192.168.1.85:3001`
- CORS configured for: `http://192.168.1.85:8080`
- Thumbnails accessible at: `http://192.168.1.85:3001/uploads/`

**Frontend**: Running on `http://192.168.1.85:8080`
- API URL configured: `http://192.168.1.85:3001`

## ✅ Servers Are Running Correctly!

Both servers are configured and running with the correct IP addresses.

## 🔍 Why Thumbnails Might Not Show

### 1. Browser Cache (Most Common!)

Your browser has cached the old configuration. You need to **hard refresh**:

**Desktop:**
- Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Mobile:**
- Chrome: Settings → Privacy → Clear browsing data → Cached images
- Safari: Settings → Safari → Clear History and Website Data

### 2. Clear Application Cache

Open browser DevTools (F12) and:
1. Go to **Application** tab
2. Click **Clear storage**
3. Click **Clear site data**
4. Refresh the page

### 3. Try Incognito/Private Mode

This bypasses all cache:
- Chrome: `Ctrl + Shift + N`
- Firefox: `Ctrl + Shift + P`
- Safari: `Cmd + Shift + N`

## 🧪 Test URLs

### Test Backend Directly

**Health Check:**
```
http://192.168.1.85:3001/api/health
```
Should return: `{"ok":true,...}`

**Media API:**
```
http://192.168.1.85:3001/api/media
```
Should return JSON with media items

**Sample Thumbnail:**
```
http://192.168.1.85:3001/uploads/1779299689769-724577207-thumb.jpg
```
Should show an image

### Test Frontend

**Desktop:**
```
http://localhost:8080
```

**Mobile/Network:**
```
http://192.168.1.85:8080
```

## 🔧 Quick Fixes

### Fix 1: Hard Refresh (Try This First!)

1. Open the website
2. Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
3. Wait for page to fully reload

### Fix 2: Clear Browser Data

**Chrome:**
1. Press `Ctrl + Shift + Delete`
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh the page

**Firefox:**
1. Press `Ctrl + Shift + Delete`
2. Select "Cache"
3. Click "Clear Now"
4. Refresh the page

### Fix 3: Check Browser Console

1. Press `F12` to open DevTools
2. Go to **Console** tab
3. Look for errors (red text)
4. Check **Network** tab for failed requests

Common errors:
- `CORS error` → Backend CORS issue (should be fixed)
- `404 Not Found` → Thumbnail file doesn't exist
- `ERR_CONNECTION_REFUSED` → Backend not running

### Fix 4: Verify Configuration

Check if the frontend is using the correct API URL:

1. Open DevTools (F12)
2. Go to **Console** tab
3. Type: `import.meta.env.VITE_API_URL`
4. Should show: `http://192.168.1.85:3001`

## 📱 Mobile-Specific Issues

### Can't Connect from Mobile?

1. **Same WiFi**: Ensure mobile is on same network as computer
2. **Firewall**: Windows Firewall might be blocking
   - Go to: Windows Defender Firewall → Allow an app
   - Add Node.js or allow ports 8080 and 3001

3. **Test Backend from Mobile**:
   - Open: `http://192.168.1.85:3001/api/health`
   - Should see JSON response

### Thumbnails Load on Desktop but Not Mobile?

This is usually a cache issue:
1. Clear mobile browser cache
2. Try private/incognito mode
3. Force refresh the page

## 🐛 Debug Steps

### Step 1: Check Backend Logs

Look at the backend terminal for errors when loading thumbnails.

### Step 2: Check Network Requests

1. Open DevTools (F12)
2. Go to **Network** tab
3. Refresh the page
4. Look for thumbnail requests
5. Check if they're:
   - Going to the right URL (`192.168.1.85:3001`)
   - Returning 200 status
   - Actually loading images

### Step 3: Check Image URLs

1. Right-click on a broken thumbnail
2. Select "Inspect" or "Inspect Element"
3. Look at the `src` attribute
4. Should be: `http://192.168.1.85:3001/uploads/...`

If it shows `http://localhost:3001/uploads/...`, the frontend hasn't picked up the new configuration.

## ✅ Verification Checklist

- [ ] Backend running on port 3001
- [ ] Frontend running on port 8080
- [ ] Backend CORS shows: `http://192.168.1.85:8080`
- [ ] Frontend `.env` has: `VITE_API_URL=http://192.168.1.85:3001`
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Cleared browser cache
- [ ] Tried incognito/private mode
- [ ] Both devices on same WiFi (for mobile)
- [ ] Firewall allows ports 8080 and 3001

## 🆘 Still Not Working?

### Last Resort: Complete Reset

1. **Stop both servers** (Ctrl+C)
2. **Clear all caches**:
   ```powershell
   # Clear npm cache
   npm cache clean --force
   
   # Clear browser cache completely
   ```
3. **Restart servers**:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   npm run dev
   ```
4. **Open in incognito mode**
5. **Hard refresh** (Ctrl+Shift+R)

## 📞 Quick Test Command

Run this to verify everything:

```powershell
# Test backend health
curl http://192.168.1.85:3001/api/health

# Test thumbnail
curl http://192.168.1.85:3001/uploads/1779299689769-724577207-thumb.jpg

# Test frontend
curl http://192.168.1.85:8080
```

All should return 200 status.

---

**Most likely solution: Hard refresh your browser with Ctrl+Shift+R!** 🔄
