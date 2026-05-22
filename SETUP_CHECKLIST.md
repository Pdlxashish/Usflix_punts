# ✅ Setup Checklist - Thumbnail & Upload Fixes

Use this checklist to ensure everything is set up correctly.

## 📋 Pre-Installation

- [ ] Windows computer with admin rights
- [ ] Node.js installed (v18 or higher)
- [ ] PostgreSQL database running
- [ ] Internet connection for downloading dependencies

## 🔧 Installation Steps

### Step 1: FFmpeg Installation
- [ ] Run: `choco install ffmpeg` (or download manually)
- [ ] Verify: `ffmpeg -version` shows version info
- [ ] FFmpeg is in PATH (command works from any directory)

### Step 2: Backend Dependencies
- [ ] Navigate to project root
- [ ] Run: `cd backend && npm install`
- [ ] Check: `backend/node_modules` folder exists
- [ ] Check: `fluent-ffmpeg` package is installed
- [ ] No error messages during installation

### Step 3: Frontend Dependencies
- [ ] Navigate to project root
- [ ] Run: `npm install`
- [ ] Check: `node_modules` folder exists
- [ ] No error messages during installation

### Step 4: Backend Configuration
- [ ] File `backend/.env` exists
- [ ] `DATABASE_URL` is set correctly
- [ ] `JWT_SECRET` is set
- [ ] `PORT=3001` is set
- [ ] `FRONTEND_URL=http://localhost:8080` is set
- [ ] `UPLOAD_DIR=./uploads` is set
- [ ] `MAX_FILE_SIZE=4294967296` is set

### Step 5: Frontend Configuration
- [ ] File `.env` exists
- [ ] `VITE_API_URL=http://localhost:3001` is set
- [ ] (Optional) Updated with your IP for mobile testing

### Step 6: File Verification
- [ ] File exists: `backend/src/utils/videoThumbnail.ts`
- [ ] File exists: `src/lib/api.ts`
- [ ] File exists: `install-dependencies.cmd`
- [ ] File exists: `start-dev.cmd`
- [ ] File exists: `START_HERE.md`
- [ ] File exists: `ACTION_PLAN.md`

## 🚀 Starting the Application

### Backend Server
- [ ] Open terminal in project root
- [ ] Run: `cd backend && npm run dev`
- [ ] See: "Backend server running on port 3001"
- [ ] No error messages
- [ ] Can access: http://localhost:3001/api/media

### Frontend Server
- [ ] Open second terminal in project root
- [ ] Run: `npm run dev`
- [ ] See: "Local: http://localhost:8080"
- [ ] No error messages
- [ ] Can access: http://localhost:8080

## 🧪 Testing

### Basic Functionality
- [ ] Frontend loads at http://localhost:8080
- [ ] Can navigate to different pages
- [ ] Images and existing media display
- [ ] No console errors (F12 → Console)

### Admin Access
- [ ] Can access Admin Panel
- [ ] Login works (if required)
- [ ] Can see existing media items
- [ ] Can see upload tabs

### Video Upload Test
- [ ] Go to Admin Panel → Quick Upload
- [ ] Select an MP4 video file
- [ ] Click upload
- [ ] Upload progress shows
- [ ] Upload completes successfully
- [ ] **CRITICAL:** Thumbnail appears automatically
- [ ] Backend logs show: "✅ Generated thumbnail"
- [ ] Check `backend/uploads/` folder for `-thumb.jpg` file

### Photo Upload Test
- [ ] Go to Admin Panel → Quick Upload
- [ ] Select a JPEG or PNG image
- [ ] Click upload
- [ ] Upload completes successfully
- [ ] Image displays correctly
- [ ] No placeholder icon

### HEIC Upload Test (if you have iPhone photos)
- [ ] Upload a HEIC file from iPhone
- [ ] Backend logs show: "✅ Converted HEIC → JPG"
- [ ] Image displays correctly
- [ ] Check `backend/uploads/` for `.jpg` file (not `.heic`)

### Thumbnail Display Test
- [ ] Go to Albums page
- [ ] All media items show thumbnails
- [ ] No placeholder icons (except for voice notes)
- [ ] Thumbnails load quickly
- [ ] Click a video to play it

### URL Test
- [ ] Inspect thumbnail image (right-click → Inspect)
- [ ] Check src attribute
- [ ] Should use environment URL, not hardcoded localhost
- [ ] Example: `http://localhost:3001/uploads/...`

## 📱 Mobile Testing (Optional)

### Network Setup
- [ ] Computer and phone on same WiFi network
- [ ] Found computer's IP address: `ipconfig`
- [ ] IP address noted (e.g., 192.168.1.100)

### Configuration
- [ ] Updated `.env`: `VITE_API_URL=http://YOUR_IP:3001`
- [ ] Restarted frontend server
- [ ] Frontend shows new URL in terminal

### Mobile Access
- [ ] Open browser on phone
- [ ] Navigate to: `http://YOUR_IP:8080`
- [ ] Site loads correctly
- [ ] Images display
- [ ] Videos display
- [ ] Thumbnails show
- [ ] Can navigate pages

### Mobile Upload Test
- [ ] Login to admin on mobile
- [ ] Upload a photo from phone
- [ ] Upload completes
- [ ] Photo displays correctly

## 🔍 Verification

### Backend Logs Check
Look for these messages in backend console:
- [ ] "✅ Generated thumbnail: {filename}-thumb.jpg"
- [ ] "✅ Converted {filename} → {filename}.jpg" (for HEIC)
- [ ] No error messages about FFmpeg
- [ ] No CORS errors

### Frontend Console Check
Open browser console (F12):
- [ ] No red error messages
- [ ] No 404 errors for images
- [ ] No CORS errors
- [ ] Network tab shows successful requests

### File System Check
- [ ] `backend/uploads/` folder exists
- [ ] Contains uploaded files
- [ ] Contains `-thumb.jpg` files for videos
- [ ] File permissions allow read/write

### Database Check
- [ ] Media items have `thumbnail` field populated
- [ ] Video items have `duration` field populated
- [ ] All uploads are in database

## 🐛 Troubleshooting Checklist

### If FFmpeg Errors
- [ ] Reinstall FFmpeg
- [ ] Add to PATH manually
- [ ] Restart terminal/computer
- [ ] Verify: `ffmpeg -version`

### If Upload Fails
- [ ] Check backend is running
- [ ] Check logged in as admin
- [ ] Check file size within limits
- [ ] Check backend logs for errors
- [ ] Check browser console for errors

### If Thumbnails Don't Show
- [ ] FFmpeg installed correctly
- [ ] Backend logs show thumbnail generation
- [ ] Check `backend/uploads/` for thumb files
- [ ] Clear browser cache
- [ ] Hard refresh (Ctrl+Shift+R)

### If Mobile Can't Connect
- [ ] Same WiFi network
- [ ] Correct IP in `.env`
- [ ] Frontend restarted after .env change
- [ ] Windows Firewall allows ports 3001, 8080
- [ ] Try: `http://YOUR_IP:3001/api/media` in phone browser

## ✅ Final Verification

### All Systems Go
- [ ] FFmpeg installed and working
- [ ] Backend running without errors
- [ ] Frontend running without errors
- [ ] Video uploads generate thumbnails
- [ ] Photo uploads display correctly
- [ ] Thumbnails show on all pages
- [ ] No console errors
- [ ] (Optional) Mobile access works

### Documentation Read
- [ ] Read START_HERE.md
- [ ] Read ACTION_PLAN.md
- [ ] Understand how to use Quick Upload
- [ ] Know where to find troubleshooting info

## 🎉 Success!

If all items are checked, you're ready to use your enhanced media platform!

**What to do next:**
1. Upload your media collection
2. Organize into albums
3. Customize branding
4. Share with others

**Need help?** Check:
- START_HERE.md - Quick reference
- ACTION_PLAN.md - Detailed guide
- THUMBNAIL_FIX_GUIDE.md - Troubleshooting
- SOLUTION_SUMMARY.md - Technical details

---

**Setup Date:** _______________

**Completed By:** _______________

**Notes:** _______________________________________________
