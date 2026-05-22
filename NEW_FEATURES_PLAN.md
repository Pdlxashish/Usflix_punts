# 🎉 New Features Implementation Plan

## Features Being Implemented

1. **🎵 Our Playlist / Song of the Day**
2. **🌤️ Weather Widget for Both Locations**
3. **🎨 Shared Canvas / Drawing Board**
4. **🌙 Good Morning / Good Night Messages**

---

## ✅ Completed Steps

### 1. Database Schema ✓
Added four new tables to `backend/src/db/schema.ts`:
- `playlist_songs` - Store songs with Spotify/YouTube links
- `weather_locations` - Store location data for weather
- `canvas_drawings` - Store drawing data and thumbnails
- `time_greetings` - Store time-based greeting messages

---

## 📋 Implementation Steps

### Step 1: Backend API Routes
Create 4 new route files in `backend/src/routes/`:
- `playlist.ts` - CRUD for songs
- `weather.ts` - Weather location management
- `canvas.ts` - Drawing save/load
- `greetings.ts` - Time-based messages

### Step 2: Register Routes
Update `backend/src/index.ts` to register new routes

### Step 3: Frontend Components
Create 4 new components in `src/components/site/`:
- `OurPlaylist.tsx` - Music player with Spotify/YouTube embeds
- `WeatherWidget.tsx` - Dual location weather display
- `SharedCanvas.tsx` - Interactive drawing board
- `TimeGreeting.tsx` - Dynamic greeting based on time

### Step 4: Admin Components
Create 4 new admin components in `src/components/admin/`:
- `PlaylistAdmin.tsx` - Manage songs
- `WeatherAdmin.tsx` - Manage locations
- `CanvasAdmin.tsx` - View/delete drawings
- `GreetingsAdmin.tsx` - Manage greeting messages

### Step 5: Integration
- Add components to homepage (`src/routes/index.tsx`)
- Add admin panels to Romance tab
- Ensure mobile responsiveness

---

## 🎯 Feature Details

### Feature 1: Our Playlist 🎵

**Database Fields:**
- title, artist
- spotify_url, youtube_url
- memory_note (why this song is special)
- is_our_song (mark as "our song")
- is_song_of_day (current song of the day)

**Frontend Features:**
- Embedded Spotify/YouTube player
- Song list with memories
- "Our Song" highlight
- Song of the Day rotation
- Mobile-friendly player

**Admin Features:**
- Add songs with URLs
- Mark as "our song"
- Set song of the day
- Add memory notes

### Feature 2: Weather Widget 🌤️

**Database Fields:**
- profile_id (link to profile)
- location_name, latitude, longitude
- is_primary (main location)

**Frontend Features:**
- Show weather for both locations
- Temperature, conditions, icon
- "It's sunny where you are!"
- Distance between locations
- Uses OpenWeatherMap API (free)

**Admin Features:**
- Set locations for each profile
- Update coordinates
- Toggle primary location

### Feature 3: Shared Canvas 🎨

**Database Fields:**
- profile_id (who drew it)
- drawing_data (JSON canvas data)
- thumbnail_url
- title

**Frontend Features:**
- Interactive drawing canvas
- Color picker
- Brush sizes
- Eraser tool
- Save drawings
- View gallery of past drawings
- Mobile touch support

**Admin Features:**
- View all drawings
- Delete drawings
- Download drawings

### Feature 4: Time Greetings 🌙

**Database Fields:**
- time_of_day (morning/afternoon/evening/night)
- message
- is_active
- sort_rank

**Frontend Features:**
- Auto-detect time of day
- Show appropriate greeting
- Smooth transitions
- Personalized messages
- Animated text

**Admin Features:**
- Create greetings for each time
- Multiple messages per time
- Enable/disable greetings
- Preview greetings

---

## 📱 Mobile Responsiveness

All features will include:
- Responsive layouts (mobile-first)
- Touch-friendly controls
- Optimized for small screens
- Swipe gestures where appropriate
- Adaptive font sizes
- Collapsible sections

---

## 🎨 Design Consistency

All features will match existing design:
- Same color scheme (primary/accent)
- Consistent spacing and padding
- Matching animations
- Similar card styles
- Unified typography

---

## 🚀 Next: Starting Implementation

I'll now create all the necessary files for these features!
