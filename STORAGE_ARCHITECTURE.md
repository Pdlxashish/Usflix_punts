# Storage Architecture - Photos & Videos

## Overview
Your application uses a **hybrid storage approach**: files are stored on the filesystem, while metadata is stored in PostgreSQL database.

---

## 📁 File Storage (Filesystem)

### Location
```
backend/uploads/
```

### Configuration
From `backend/.env`:
```env
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=4294967296  # 4GB
```

### File Naming Convention
Files are saved with unique timestamped names:
```
{timestamp}-{random-number}.{extension}
Example: 1778740368692-620085758.jpg
```

### Supported File Types

#### Images
- JPEG, PNG, GIF, WebP, SVG
- HEIC/HEIF (iPhone photos - auto-converted to JPEG)
- AVIF, BMP, TIFF

#### Videos
- MP4, WebM, QuickTime (.mov)
- AVI, MKV, 3GP, MPEG

#### Audio (Voice Notes)
- MP3, WAV, OGG, AAC
- M4A, Opus, WebM audio

### HEIC Conversion
iPhone photos (HEIC/HEIF format) are automatically converted to JPEG for browser compatibility:
```typescript
// backend/src/routes/upload.ts
HEIC → JPEG (90% quality)
Original HEIC file is deleted after conversion
```

---

## 🗄️ Database Storage (PostgreSQL)

### Database Configuration
From `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:Punts1803@localhost:5432/usflix
```

### Schema: `media_items` Table

```sql
CREATE TABLE media_items (
  id VARCHAR(100) PRIMARY KEY,              -- e.g., "m-1778740368692"
  type VARCHAR(10) NOT NULL,                -- 'photo', 'video', 'voice'
  title VARCHAR(200) NOT NULL,
  year VARCHAR(10) NOT NULL,
  tagline TEXT DEFAULT '',
  description TEXT DEFAULT '',
  thumbnail VARCHAR(500),                   -- URL: /uploads/filename.jpg
  category VARCHAR(200) NOT NULL,           -- Collection name
  sort_rank INTEGER DEFAULT 0,
  video_url VARCHAR(500),                   -- URL: /uploads/filename.mp4
  audio_url VARCHAR(500),                   -- URL: /uploads/filename.mp3
  duration INTEGER,                         -- Duration in seconds
  photos JSONB DEFAULT '[]',                -- Array of photo objects
  status VARCHAR(30) DEFAULT 'ready',       -- 'ready', 'processing', 'error'
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Related Tables

#### Collections
```sql
CREATE TABLE collections (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  parent_id VARCHAR(100),                   -- For nested collections
  sort_rank INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Hero Banners
```sql
CREATE TABLE hero_banners (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  subtitle TEXT DEFAULT '',
  media_url VARCHAR(500) NOT NULL,          -- URL: /uploads/filename
  type VARCHAR(10) NOT NULL,                -- 'image' or 'video'
  linked_media_id VARCHAR(100),             -- References media_items(id)
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Comments
```sql
CREATE TABLE comments (
  id VARCHAR(100) PRIMARY KEY,
  media_id VARCHAR(100) NOT NULL,           -- References media_items(id)
  profile_id VARCHAR(100) NOT NULL,
  text TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  video_time DOUBLE PRECISION,              -- Timestamp in video
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔄 Upload Flow

### 1. File Upload (POST /api/upload)
```
Client → Backend → Multer → Filesystem
                         ↓
                    HEIC Conversion (if needed)
                         ↓
                    Return file URL
```

### 2. Create Media Item (POST /api/media)
```
Client sends:
{
  type: "video",
  title: "Our Beach Trip",
  videoUrl: "/uploads/1778740368692-620085758.mp4",
  thumbnail: "/uploads/1778740368692-620085758.jpg",
  category: "Vacations",
  duration: 120
}
                         ↓
                    Save to database
                         ↓
                    Return media ID
```

### 3. Serve Files
Files are served statically via Express:
```typescript
// backend/src/index.ts
app.use("/uploads", express.static(path.resolve(uploadDir)));
```

Access: `http://localhost:3001/uploads/filename.jpg`

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│  (Upload Form / Admin Panel)                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ 1. POST /api/upload (multipart/form-data)
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Multer Middleware                                    │  │
│  │  - Validates file type                                │  │
│  │  - Generates unique filename                          │  │
│  │  - Saves to ./uploads/                                │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │  HEIC Converter (if needed)                           │  │
│  │  - Converts HEIC → JPEG                               │  │
│  │  - Deletes original HEIC                              │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│                     │ Returns: { url: "/uploads/file.jpg" } │
└─────────────────────┼────────────────────────────────────────┘
                     │
                     │ 2. POST /api/media (with file URL)
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    POSTGRESQL                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  media_items table                                    │  │
│  │  - Stores metadata                                    │  │
│  │  - Stores file URLs (references to filesystem)       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                     │
                     │ 3. GET /api/media
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│  Displays media with URLs pointing to:                      │
│  http://localhost:3001/uploads/filename.jpg                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Points

### ✅ Advantages of This Approach

1. **Scalability**: Files stored separately from database
2. **Performance**: Database queries are fast (only metadata)
3. **Flexibility**: Easy to move files to CDN/cloud storage later
4. **Simplicity**: No need for complex blob storage in database

### ⚠️ Current Limitations

1. **No Cloud Storage**: Files stored locally (not suitable for production)
2. **No Backup**: Files could be lost if server fails
3. **No CDN**: Files served directly from backend (slower)
4. **Single Server**: Can't scale horizontally easily

### 🚀 Production Recommendations

For production deployment, consider:

1. **Cloud Storage**: AWS S3, Cloudflare R2, or Google Cloud Storage
2. **CDN**: CloudFlare, AWS CloudFront for faster delivery
3. **Backup**: Automated backups of both files and database
4. **Video Processing**: FFmpeg for video transcoding/optimization
5. **Image Optimization**: Sharp for thumbnail generation

---

## 📝 Example: Complete Upload Process

### Step 1: Upload File
```bash
POST /api/upload
Content-Type: multipart/form-data

file: beach-video.mp4
```

**Response:**
```json
{
  "ok": true,
  "url": "/uploads/1778740368692-620085758.mp4",
  "filename": "1778740368692-620085758.mp4",
  "originalName": "beach-video.mp4",
  "size": 52428800,
  "mimetype": "video/mp4"
}
```

### Step 2: Create Media Item
```bash
POST /api/media
Content-Type: application/json

{
  "type": "video",
  "title": "Beach Vacation 2024",
  "year": "2024",
  "tagline": "Our amazing beach trip",
  "description": "We spent a week at the beach...",
  "videoUrl": "/uploads/1778740368692-620085758.mp4",
  "thumbnail": "/uploads/1778740368692-620085758-thumb.jpg",
  "category": "Vacations",
  "duration": 180,
  "status": "ready"
}
```

**Response:**
```json
{
  "ok": true,
  "id": "m-1778740368692"
}
```

### Step 3: Retrieve Media
```bash
GET /api/media/m-1778740368692
```

**Response:**
```json
{
  "id": "m-1778740368692",
  "type": "video",
  "title": "Beach Vacation 2024",
  "year": "2024",
  "tagline": "Our amazing beach trip",
  "description": "We spent a week at the beach...",
  "videoUrl": "/uploads/1778740368692-620085758.mp4",
  "thumbnail": "/uploads/1778740368692-620085758-thumb.jpg",
  "category": "Vacations",
  "sortRank": 1,
  "duration": 180,
  "status": "ready"
}
```

---

## 🔧 Maintenance

### Check Upload Directory Size
```bash
# Windows
dir backend\uploads /s

# Linux/Mac
du -sh backend/uploads
```

### Clean Up Orphaned Files
Files in `uploads/` folder that don't have corresponding database entries should be cleaned up periodically.

### Database Backup
```bash
pg_dump -U postgres usflix > backup.sql
```

### File Backup
```bash
# Copy uploads folder
xcopy backend\uploads backup\uploads /E /I
```
