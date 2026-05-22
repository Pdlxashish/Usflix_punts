# Video Thumbnail Generation

This backend automatically generates thumbnails for uploaded videos using FFmpeg.

## How It Works

When a video is uploaded via the `/api/upload` endpoint:

1. The video file is saved to the `uploads/` directory
2. FFmpeg extracts a frame at the 1-second mark
3. The frame is saved as a JPEG thumbnail (`{video-name}-thumb.jpg`)
4. The thumbnail URL is returned in the upload response
5. The frontend saves the thumbnail URL to the database

## Requirements

- **FFmpeg** must be installed and available in your system PATH
- Check if FFmpeg is installed: `ffmpeg -version`

### Installing FFmpeg

**Windows:**
- Download from: https://ffmpeg.org/download.html
- Or use Chocolatey: `choco install ffmpeg`

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

## Regenerating Thumbnails

If you have existing videos without thumbnails, run:

```bash
npm run regenerate-thumbnails
```

This script will:
- Find all videos in the database
- Generate thumbnails for each video
- Update the database with the new thumbnail URLs

## Thumbnail Settings

Thumbnails are generated with these settings:
- **Resolution**: 1280x720 (HD)
- **Format**: JPEG
- **Frame position**: 1 second into the video
- **Naming**: `{original-filename}-thumb.jpg`

## Customization

To change thumbnail settings, edit `src/utils/videoThumbnail.ts`:

```typescript
// Change resolution
size: "1920x1080"  // Full HD

// Change frame position (in seconds)
timeInSeconds: 2  // Extract frame at 2 seconds

// Change quality
.outputOptions(['-q:v', '2'])  // Lower number = higher quality (1-31)
```

## Troubleshooting

### Thumbnails not generating

1. **Check FFmpeg installation:**
   ```bash
   ffmpeg -version
   ```

2. **Check backend logs** for error messages when uploading videos

3. **Manually regenerate thumbnails:**
   ```bash
   npm run regenerate-thumbnails
   ```

4. **Check file permissions** on the `uploads/` directory

### Thumbnail quality issues

- Increase resolution in `videoThumbnail.ts`
- Extract frame from a different timestamp
- Adjust JPEG quality settings

## API Response

When uploading a video, the API returns:

```json
{
  "ok": true,
  "url": "/uploads/1234567890-video.mp4",
  "thumbnailUrl": "/uploads/1234567890-video-thumb.jpg",
  "duration": 45,
  "filename": "1234567890-video.mp4",
  "originalName": "my-video.mp4",
  "size": 12345678,
  "mimetype": "video/mp4"
}
```

The `thumbnailUrl` field contains the path to the generated thumbnail.
