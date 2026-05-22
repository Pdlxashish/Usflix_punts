# Thumbnail & Upload Fix Guide

This guide explains the fixes applied to resolve thumbnail display issues and upload failures.

## Problems Fixed

### 1. **Video Thumbnails Not Showing**
- **Problem**: Videos uploaded without thumbnails showed placeholder icons
- **Solution**: Automatic thumbnail generation from video frames using ffmpeg

### 2. **Hardcoded localhost URLs**
- **Problem**: `http://localhost:3001` URLs broke when accessing from mobile or different hosts
- **Solution**: Environment-based URL configuration using `VITE_API_URL`

### 3. **Upload Failures**
- **Problem**: Uploads failing due to CORS, authentication, or missing dependencies
- **Solution**: Proper error handling and dependency installation

## Installation Steps

### 1. Install FFmpeg (Required for Video Thumbnails)

FFmpeg is needed to extract video frames for thumbnails.

#### Windows:
```cmd
# Using Chocolatey
choco install ffmpeg

# Or download from: https://ffmpeg.org/download.html
# Add to PATH after installation
```

#### Mac:
```bash
brew install ffmpeg
```

#### Linux:
```bash
sudo apt update
sudo apt install ffmpeg
```

Verify installation:
```cmd
ffmpeg -version
```

### 2. Install Backend Dependencies

```cmd
cd backend
npm install
```

This will install:
- `fluent-ffmpeg` - Video processing library
- `@types/fluent-ffmpeg` - TypeScript types

### 3. Configure Environment Variables

#### Backend (.env)
```env
# Backend Environment Variables
DATABASE_URL=postgresql://postgres:password@localhost:5432/usflix
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

PORT=3001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8080

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=4294967296  # 4GB for videos
```

#### Frontend (.env)
```env
# API Backend URL
# Local development:
VITE_API_URL=http://localhost:3001

# Mobile testing (replace with your computer's IP):
# VITE_API_URL=http://192.168.1.100:3001

# Production:
# VITE_API_URL=https://your-backend-api.com
```

**To find your IP for mobile testing:**
- Windows: Run `ipconfig` in Command Prompt
- Mac/Linux: Run `ifconfig` in Terminal
- Look for IPv4 Address (usually starts with 192.168 or 10.0)

### 4. Start the Application

#### Terminal 1 - Backend:
```cmd
cd backend
npm run dev
```

#### Terminal 2 - Frontend:
```cmd
npm run dev
```

## Features Added

### Automatic Video Thumbnail Generation

When you upload a video, the system now:
1. Extracts a frame at the 1-second mark
2. Saves it as `{filename}-thumb.jpg`
3. Automatically sets it as the thumbnail
4. Extracts video duration

**Example:**
- Upload: `vacation.mp4`
- Generated thumbnail: `vacation-thumb.jpg`
- Stored in: `backend/uploads/`

### Browser-Compatible Media Formats

#### Supported Image Formats:
- JPEG, PNG, GIF, WebP, SVG
- HEIC/HEIF (iPhone photos - auto-converted to JPEG)
- AVIF, BMP, TIFF

#### Supported Video Formats:
- MP4 (H.264) - **Best compatibility**
- WebM
- MOV (QuickTime)
- MKV, AVI, 3GP, MPEG

**Note**: For best browser compatibility, use MP4 with H.264 codec.

#### Supported Audio Formats:
- MP3, WAV, OGG, AAC
- M4A, Opus, WebM audio

### Dynamic URL Configuration

The app now uses environment variables for all URLs:

```typescript
// Old (hardcoded):
src="http://localhost:3001/uploads/image.jpg"

// New (dynamic):
src={getMediaUrl(item.thumbnail)}
```

This works across:
- Local development
- Mobile testing on same network
- Production deployments

## File Size Limits

- **Images**: 50 MB
- **Videos**: 4 GB
- **Audio**: 100 MB

## Troubleshooting

### Thumbnails Still Not Showing

1. **Check FFmpeg installation:**
   ```cmd
   ffmpeg -version
   ```

2. **Check backend logs** for thumbnail generation errors:
   ```
   ✅ Generated thumbnail: vacation-thumb.jpg
   ```

3. **Verify uploads directory** exists and is writable:
   ```cmd
   cd backend
   dir uploads
   ```

4. **Check browser console** for 404 errors on thumbnail URLs

### Upload Failures

1. **CORS errors:**
   - Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL
   - Check browser console for CORS errors

2. **Authentication errors:**
   - Verify you're logged in as admin
   - Check JWT token in localStorage

3. **File size errors:**
   - Check file doesn't exceed limits
   - Verify `MAX_FILE_SIZE` in backend `.env`

4. **Network errors:**
   - Ensure backend is running on port 3001
   - Check `VITE_API_URL` in frontend `.env`

### Mobile Access Issues

1. **Can't connect from phone:**
   - Ensure phone and computer are on same WiFi network
   - Use computer's IP address, not `localhost`
   - Update `VITE_API_URL` to `http://YOUR_IP:3001`
   - Restart frontend after changing `.env`

2. **Images/videos not loading:**
   - Check `VITE_API_URL` is set correctly
   - Verify backend is accessible from phone: `http://YOUR_IP:3001/api/media`

## API Response Format

### Upload Response (with thumbnail):
```json
{
  "ok": true,
  "url": "/uploads/1234567890-video.mp4",
  "thumbnailUrl": "/uploads/1234567890-video-thumb.jpg",
  "duration": 125,
  "filename": "1234567890-video.mp4",
  "originalName": "vacation.mp4",
  "size": 52428800,
  "mimetype": "video/mp4"
}
```

### Media Item (in database):
```json
{
  "id": "m-1234567890",
  "type": "video",
  "title": "Vacation Video",
  "thumbnail": "/uploads/1234567890-video-thumb.jpg",
  "videoUrl": "/uploads/1234567890-video.mp4",
  "duration": 125,
  "category": "Vacations",
  "status": "ready"
}
```

## Testing

### Test Video Upload:
1. Go to Admin Panel → Quick Upload
2. Select a video file (MP4 recommended)
3. Upload and wait for processing
4. Check that thumbnail appears automatically
5. View the video on the main site

### Test Mobile Access:
1. Find your computer's IP address
2. Update frontend `.env` with `VITE_API_URL=http://YOUR_IP:3001`
3. Restart frontend: `npm run dev`
4. Open `http://YOUR_IP:8080` on your phone
5. Verify images and videos load correctly

## Additional Notes

- Thumbnails are generated at 1280x720 resolution (HD)
- HEIC images from iPhones are automatically converted to JPEG
- Video duration is automatically extracted and stored
- All media URLs are relative and work across environments
- Thumbnail generation happens during upload (may take a few seconds for large videos)

## Support

If you encounter issues:
1. Check backend console for error messages
2. Check browser console for network errors
3. Verify all environment variables are set correctly
4. Ensure FFmpeg is installed and in PATH
5. Check file permissions on uploads directory
