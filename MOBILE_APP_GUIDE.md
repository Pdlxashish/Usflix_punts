# Memory Flix — iOS & Android App Guide

This guide covers everything from deploying the backend to submitting the app
to the App Store and Google Play.

---

## Overview

The app uses **Capacitor** to wrap the existing React web app into a native
iOS and Android shell. The web assets are bundled into the app at build time
and call your deployed backend over HTTPS.

```
┌─────────────────────────────────┐
│  iOS App / Android App          │
│  (Capacitor native shell)       │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Web UI (React / Vite)    │  │
│  │  bundled inside the app   │  │
│  └───────────┬───────────────┘  │
│              │ HTTPS API calls  │
└──────────────┼──────────────────┘
               ▼
   ┌───────────────────────┐
   │  Backend (Railway /   │
   │  VPS / Render)        │
   │  + PostgreSQL DB      │
   └───────────────────────┘
```

---

## Step 1 — Deploy the Backend First

The mobile app needs a live backend URL before you can build it.

### Option A: Railway (Recommended — free tier available)

1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select this repository
4. Railway auto-detects the `railway.toml` and deploys the backend
5. Add a **PostgreSQL** database: New → Database → PostgreSQL
6. Set these environment variables in Railway (Settings → Variables):

```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<run: node scripts/generate-jwt-secret.js>
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://capacitor://localhost
PORT=3001
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=4294967296
USE_CLOUD_STORAGE=false
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<choose a strong password>
OPENWEATHER_API_KEY=<optional — get free at openweathermap.org>
```

> **Important:** Set `FRONTEND_URL` to `capacitor://localhost` so the native
> app's CORS origin is allowed. You can add multiple values by also including
> your web domain if you deploy a web version.

7. Copy your Railway backend URL — it looks like:
   `https://your-app.up.railway.app`

### Option B: Render / Fly.io / VPS

Follow the `DEPLOYMENT_GUIDE.md` for Docker or VPS deployment.
The key requirement is that the backend is reachable over **HTTPS**.

---

## Step 2 — Configure Cloud Storage (Recommended)

Local file uploads won't persist on Railway's ephemeral filesystem.
Set up Cloudflare R2 (free 10 GB/month) or AWS S3:

```
USE_CLOUD_STORAGE=true
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET_NAME=memory-flix
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

---

## Step 3 — Install Dependencies

```bash
npm install
```

This installs Capacitor core, iOS, Android, and the CLI.

---

## Step 4 — Build the Web Assets for Mobile

Create a `.env.mobile` file (copy from `.env.mobile.example`):

```bash
# Windows
copy .env.mobile.example .env.mobile

# Mac/Linux
cp .env.mobile.example .env.mobile
```

Edit `.env.mobile` and set your backend URL:

```env
VITE_API_URL=https://your-app.up.railway.app
```

Build the web assets using the mobile env:

```bash
# Windows
set VITE_API_URL=https://your-app.up.railway.app && npm run build

# Mac/Linux
VITE_API_URL=https://your-app.up.railway.app npm run build
```

Then sync to native projects:

```bash
npm run cap:sync
```

---

## Step 5 — Add Native Platforms

Run these once to create the `ios/` and `android/` folders:

```bash
# Add iOS (requires macOS + Xcode)
npx cap add ios

# Add Android (requires Android Studio)
npx cap add android
```

---

## Step 6 — iOS App

### Requirements
- macOS (required — Xcode only runs on Mac)
- Xcode 15+ (free from Mac App Store)
- Apple Developer account ($99/year for App Store distribution)

### Open in Xcode

```bash
npm run cap:ios
```

### Configure in Xcode

1. Select the `App` target → **Signing & Capabilities**
2. Set your **Team** (Apple Developer account)
3. Change **Bundle Identifier** to match `capacitor.config.ts` → `com.memoryflix.forus`
   (or whatever you want — must be unique in the App Store)
4. Add app icons: replace `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   with your icon files (use [appicon.co](https://appicon.co) to generate all sizes)
5. Add a splash screen image to `ios/App/App/Assets.xcassets/Splash.imageset/`

### Test on a real device

Connect your iPhone, select it in Xcode's device picker, press **Run (▶)**.

### Submit to App Store

1. In Xcode: **Product → Archive**
2. In the Organizer window: **Distribute App → App Store Connect**
3. Follow the prompts — Xcode uploads the build
4. Go to [App Store Connect](https://appstoreconnect.apple.com)
5. Fill in app metadata, screenshots, description
6. Submit for review (usually 1–3 days)

---

## Step 7 — Android App

### Requirements
- Android Studio (free, works on Windows/Mac/Linux)
- Google Play Developer account ($25 one-time fee)

### Open in Android Studio

```bash
npm run cap:android
```

### Configure in Android Studio

1. Open `android/app/src/main/res/` and replace the launcher icons
   (use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/))
2. Edit `android/app/src/main/AndroidManifest.xml` if you need permissions
   (camera, location are already handled by Capacitor plugins)
3. Edit `android/app/build.gradle` to set your version code/name

### Test on a device

Connect an Android phone with USB debugging enabled, press **Run (▶)** in Android Studio.

### Build a release APK / AAB

1. **Build → Generate Signed Bundle / APK**
2. Choose **Android App Bundle** (required for Play Store)
3. Create or use an existing keystore — **keep this file safe, you can never change it**
4. Build the release bundle

### Submit to Google Play

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app
3. Upload the `.aab` file under **Production → Releases**
4. Fill in store listing, screenshots, content rating
5. Submit for review (usually a few hours to 1 day)

---

## Updating the App

When you make changes to the web code:

```bash
# 1. Build updated web assets (with your backend URL)
VITE_API_URL=https://your-app.up.railway.app npm run build

# 2. Sync to native projects
npm run cap:sync

# 3. Open native IDE and rebuild
npm run cap:ios      # or cap:android
```

For backend-only changes, just redeploy the backend — no app update needed.

---

## App Icons & Splash Screen

You need:
- **App icon**: 1024×1024 PNG (no transparency for iOS)
- **Splash screen**: 2732×2732 PNG (centered logo on black background)

Recommended tools:
- [appicon.co](https://appicon.co) — generates all iOS/Android icon sizes
- [apetools.webpgr.com](https://apetools.webpgr.com) — splash screen generator

Place generated files in:
- iOS icons: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Android icons: `android/app/src/main/res/mipmap-*/`

---

## Troubleshooting

### "Network request failed" in the app
- Verify `VITE_API_URL` was set correctly when you ran `npm run build`
- Check the backend is running and accessible over HTTPS
- Verify the backend `FRONTEND_URL` includes `capacitor://localhost`

### CORS errors
- The backend now allows `capacitor://localhost` and `http://localhost`
- Make sure you redeployed the backend after the CORS update

### Videos won't play
- Ensure your backend/storage serves videos with proper `Content-Range` headers
- For large files, use cloud storage (R2/S3) rather than local uploads

### GPS / location not working on iOS
- Add `NSLocationWhenInUseUsageDescription` to `ios/App/App/Info.plist`
- Capacitor handles the permission prompt automatically

### White screen on launch
- Run `npm run build` again and `npm run cap:sync`
- Check browser console via Safari (iOS) or Chrome DevTools (Android) remote debugging

---

## Quick Reference

| Command | What it does |
|---------|-------------|
| `npm run build` | Build web assets |
| `npm run cap:sync` | Copy web assets + sync plugins to native |
| `npm run cap:ios` | Open Xcode |
| `npm run cap:android` | Open Android Studio |
| `npm run cap:run:ios` | Build + run on connected iOS device |
| `npm run cap:run:android` | Build + run on connected Android device |
