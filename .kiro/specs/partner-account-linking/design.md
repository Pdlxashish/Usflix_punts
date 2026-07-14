# Technical Design Document

## Introduction

This document specifies the technical design for the Partner Account Linking & Shared Experience System. The system extends the existing Clerk authentication, profile system, and partner invitation infrastructure to provide real-time synchronization, GPS location sharing, and unified shared contexts across all couple-focused features.

## Architecture Overview

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐    │
│  │ Link Flow UI │  │ Shared       │  │ GPS Sync          │    │
│  │ - Search     │  │ Context UI   │  │ - Geolocation API │    │
│  │ - QR Code    │  │ - Albums     │  │ - Map Display     │    │
│  │ - Invite     │  │ - Messages   │  │ - Permission Mgmt │    │
│  └──────────────┘  │ - Drawing    │  └───────────────────┘    │
│                     │ - Activities │                             │
│                     └──────────────┘                             │
│              ▲              ▲                    ▲               │
│              │ REST API     │ WebSocket          │ REST API      │
│              ▼              ▼                    ▼               │
├─────────────────────────────────────────────────────────────────┤
│                        Backend Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐    │
│  │ Link Service │  │ Sync Engine  │  │ GPS Service       │    │
│  │ - Create     │  │ - WebSocket  │  │ - Location Store  │    │
│  │ - Accept     │  │ - Broadcast  │  │ - Distance Calc   │    │
│  │ - Revoke     │  │ - Event      │  │ - Update Stream   │    │
│  │ - Unlink     │  │   Routing    │  └───────────────────┘    │
│  └──────────────┘  └──────────────┘                             │
│                                                                   │
│  ┌───────────────────────────────────────────────────────┐     │
│  │              Shared Context Services                   │     │
│  │  - Album Service   - Message Service                   │     │
│  │  - Drawing Service - Activity Service                  │     │
│  │  - Memory Service  - Banner Service                    │     │
│  └───────────────────────────────────────────────────────┘     │
│              │                                                    │
│              ▼                                                    │
├─────────────────────────────────────────────────────────────────┤
│                        Data Layer                                │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              PostgreSQL Database                      │      │
│  │  - partner_links     - shared_messages                │      │
│  │  - profile_locations - media_items                    │      │
│  │  - couple_activities - canvas_drawings                │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema Design

### New Tables

#### partner_links
Stores active partner relationships with couple_id.

```sql
CREATE TABLE IF NOT EXISTS partner_links (
  id VARCHAR(100) PRIMARY KEY,
  couple_id VARCHAR(100) UNIQUE NOT NULL,
  user_a_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_a_id, user_b_id),
  CHECK (user_a_id < user_b_id) -- Ensure consistent ordering
);

CREATE INDEX idx_partner_links_user_a ON partner_links (user_a_id);
CREATE INDEX idx_partner_links_user_b ON partner_links (user_b_id);
CREATE INDEX idx_partner_links_couple_id ON partner_links (couple_id);
```

#### shared_messages
Stores chat messages between partners.

```sql
CREATE TABLE IF NOT EXISTS shared_messages (
  id VARCHAR(100) PRIMARY KEY,
  couple_id VARCHAR(100) NOT NULL,
  sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  read_by_partner BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_shared_messages_couple_id ON shared_messages (couple_id, created_at DESC);
CREATE INDEX idx_shared_messages_sender ON shared_messages (sender_user_id);
```

#### couple_activities
Tracks romance activity completion and streaks.

```sql
CREATE TABLE IF NOT EXISTS couple_activities (
  id VARCHAR(100) PRIMARY KEY,
  couple_id VARCHAR(100) NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  user_a_completed BOOLEAN NOT NULL DEFAULT FALSE,
  user_b_completed BOOLEAN NOT NULL DEFAULT FALSE,
  user_a_response JSONB,
  user_b_response JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(couple_id, activity_type, activity_date)
);

CREATE INDEX idx_couple_activities_couple_id ON couple_activities (couple_id, activity_date DESC);
```

#### location_updates
Stores real-time GPS coordinates.

```sql
CREATE TABLE IF NOT EXISTS location_updates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  couple_id VARCHAR(100),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  device_id VARCHAR(100)
);

CREATE INDEX idx_location_updates_user_id ON location_updates (user_id, timestamp DESC);
CREATE INDEX idx_location_updates_couple_id ON location_updates (couple_id, timestamp DESC);
```

### Schema Modifications

#### profiles table
Add couple_id column to existing profiles table.

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS couple_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_profiles_couple_id ON profiles (couple_id);
```

#### media_items table
Add couple_id for shared album filtering.

```sql
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS couple_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_media_items_couple_id ON media_items (couple_id);
```

#### canvas_drawings table
Add couple_id for shared drawing canvas.

```sql
ALTER TABLE canvas_drawings ADD COLUMN IF NOT EXISTS couple_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_canvas_drawings_couple_id ON canvas_drawings (couple_id);
```

## API Endpoints

### Partner Linking API

#### POST /api/partner/search
Search for partners by username or email.

**Request:**
```typescript
{
  query: string;
}
```

**Response:**
```typescript
{
  results: Array<{
    userId: number;
    displayName: string;
    email: string;
    profilePicture?: string;
  }>;
}
```

#### POST /api/partner/link/create
Create a new partner invitation.

**Request:**
```typescript
{
  partnerUserId?: number;
  partnerEmail?: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  inviteId: string;
  inviteCode: string;
  qrCodeDataUrl: string;
  expiresAt: string;
}
```

#### POST /api/partner/link/accept
Accept a partner invitation.

**Request:**
```typescript
{
  inviteCode: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  coupleId: string;
  partnerName: string;
}
```

#### POST /api/partner/link/unlink
Unlink from current partner.

**Request:**
```typescript
{
  confirmationText: string; // Must match "UNLINK"
}
```

**Response:**
```typescript
{
  ok: boolean;
}
```

#### GET /api/partner/link/status
Get current link status.

**Response:**
```typescript
{
  isLinked: boolean;
  coupleId?: string;
  partner?: {
    userId: number;
    displayName: string;
    profilePicture?: string;
  };
}
```

### Shared Context API

#### GET /api/shared/messages
Get messages for the linked couple.

**Query Params:** `limit`, `before` (pagination)

**Response:**
```typescript
{
  messages: Array<{
    id: string;
    senderId: number;
    senderName: string;
    text: string;
    createdAt: string;
    isYou: boolean;
  }>;
}
```

#### POST /api/shared/messages
Send a message to partner.

**Request:**
```typescript
{
  text: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  messageId: string;
}
```

#### GET /api/shared/albums
Get shared media items.

**Query Params:** `limit`, `offset`

**Response:**
```typescript
{
  items: Array<{
    id: string;
    type: 'photo' | 'video';
    url: string;
    thumbnailUrl: string;
    uploadedBy: number;
    uploaderName: string;
    createdAt: string;
    isYou: boolean;
  }>;
  total: number;
}
```

#### GET /api/shared/activities
Get couple activities and streaks.

**Response:**
```typescript
{
  currentStreak: number;
  longestStreak: number;
  todayActivity: {
    activityType: string;
    youCompleted: boolean;
    partnerCompleted: boolean;
  };
  history: Array<{
    date: string;
    activityType: string;
    bothCompleted: boolean;
  }>;
}
```

#### POST /api/shared/activities/complete
Mark today's activity as complete.

**Request:**
```typescript
{
  activityType: string;
  response?: any;
}
```

**Response:**
```typescript
{
  ok: boolean;
  partnerCompleted: boolean;
  bothNowComplete: boolean;
}
```

### GPS Location API

#### POST /api/location/update
Update current GPS location.

**Request:**
```typescript
{
  latitude: number;
  longitude: number;
  accuracy?: number;
  deviceId: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
}
```

#### GET /api/location/partner
Get partner's current or last-known location.

**Response:**
```typescript
{
  latitude: number;
  longitude: number;
  timestamp: string;
  isRecent: boolean; // true if < 10 minutes old
}
```

#### PUT /api/location/settings
Update location sharing preferences.

**Request:**
```typescript
{
  sharingEnabled: boolean;
}
```

**Response:**
```typescript
{
  ok: boolean;
}
```

## WebSocket Event System

### Connection

**Endpoint:** `wss://api.domain.com/ws`

**Authentication:** Include Clerk session token in connection header or query param.

### Event Types

#### Partner Events

```typescript
// Sent when partner comes online
{
  type: 'partner:online',
  data: {
    partnerId: number;
    partnerName: string;
  }
}

// Sent when partner goes offline
{
  type: 'partner:offline',
  data: {
    partnerId: number;
  }
}
```

#### Message Events

```typescript
// New message from partner
{
  type: 'message:new',
  data: {
    messageId: string;
    senderId: number;
    senderName: string;
    text: string;
    createdAt: string;
  }
}
```

#### Drawing Events

```typescript
// Partner drawing stroke
{
  type: 'drawing:stroke',
  data: {
    strokeId: string;
    userId: number;
    points: Array<{x: number; y: number}>;
    color: string;
    width: number;
  }
}

// Partner cleared canvas
{
  type: 'drawing:clear',
  data: {
    userId: number;
  }
}
```

#### Activity Events

```typescript
// Partner completed activity
{
  type: 'activity:completed',
  data: {
    userId: number;
    userName: string;
    activityType: string;
    date: string;
  }
}
```

#### Location Events

```typescript
// Partner location updated
{
  type: 'location:update',
  data: {
    userId: number;
    latitude: number;
    longitude: number;
    timestamp: string;
  }
}
```

#### Album Events

```typescript
// Partner uploaded media
{
  type: 'album:new_media',
  data: {
    mediaId: string;
    uploaderId: number;
    uploaderName: string;
    type: 'photo' | 'video';
    thumbnailUrl: string;
  }
}
```

## Frontend Components

### Component Hierarchy

```
App
├── AuthProvider
│   └── LinkStatusProvider
│       ├── LinkPromptModal (shown if not linked)
│       ├── WebSocketProvider
│       │   └── Routes
│       │       ├── SelectProfile
│       │       ├── Dashboard
│       │       │   ├── SharedAlbum
│       │       │   ├── SharedMessages
│       │       │   ├── PartnerLocation
│       │       │   └── RomanceActivities
│       │       ├── LiveDrawing
│       │       └── Settings
│       │           └── PartnerManagement
│       └── GPSLocationTracker (background service)
```

### Key Components

#### LinkPromptModal
- Shows when user is not linked
- Provides search, invite code, and QR code options
- Handles invitation acceptance flow

#### WebSocketProvider
- Establishes WebSocket connection
- Dispatches real-time events to context
- Handles reconnection logic

#### GPSLocationTracker
- Requests geolocation permissions
- Sends location updates every 2 minutes
- Respects user's sharing preferences

#### SharedAlbum
- Displays media from both partners
- Shows cross-attribution ("from You" / "from Partner")
- Real-time updates on new uploads

#### SharedMessages
- Chat interface with partner
- Real-time message delivery
- Read receipts

#### PartnerLocation
- Map display of partner's location
- Distance calculation
- Last update timestamp

#### LiveDrawingCanvas
- Collaborative drawing surface
- Real-time stroke synchronization
- Tools: pen, eraser, color picker, clear

## Data Flow Diagrams

### Partner Linking Flow

```
User A                    Backend                    User B
  |                          |                          |
  |--[Create Invite]-------->|                          |
  |<--[Invite Code + QR]-----|                          |
  |                          |                          |
  |                          |<--[Submit Code]----------|
  |                          |--[Validate]              |
  |                          |--[Show Preview]--------->|
  |                          |<--[Confirm Accept]-------|
  |                          |                          |
  |                          |--[Create partner_links]  |
  |                          |--[Generate couple_id]    |
  |                          |--[Create Partner_Profiles|
  |                          |--[Update household_id]   |
  |                          |                          |
  |<--[Link Success]---------|                          |
  |                          |--[Link Success]--------->|
  |                          |                          |
  |<--[WS: partner:online]---|--[WS: partner:online]--->|
```

### Real-Time Message Flow

```
User A                    Backend                    User B
  |                          |                          |
  |--[Send Message]--------->|                          |
  |                          |--[Store in DB]           |
  |                          |--[Broadcast via WS]----->|
  |<--[Confirm Sent]---------|                          |
  |                          |                          |--[Render Message]
  |                          |<--[Mark as Read]---------|
  |--[Update Read Status]--->|                          |
```

### GPS Location Sync Flow

```
User A Device             Backend                    User B Device
  |                          |                          |
  |--[Request GPS Perm]      |                          |
  |<--[Permission Granted]   |                          |
  |                          |                          |
  |--[Get GPS Coords]        |                          |
  |--[POST /location/update]>|                          |
  |                          |--[Store location_updates]|
  |                          |--[WS: location:update]-->|
  |                          |                          |--[Update Map]
  |                          |                          |
  | (2 min interval)         |                          |
  |                          |                          |
  |--[POST /location/update]>|                          |
  |                          |--[WS: location:update]-->|
```

## Security Considerations

### Authentication & Authorization

1. **Clerk Session Validation**: All API requests must include valid Clerk session token
2. **Couple ID Verification**: Verify requester's couple_id matches the resource's couple_id
3. **Partner Relationship Check**: Validate partner_links exists before allowing shared data access

### Data Isolation

1. **Query Filtering**: Always filter shared content by couple_id to prevent cross-couple data leaks
2. **WebSocket Namespacing**: Isolate WebSocket rooms by couple_id
3. **Location Data Encryption**: Encrypt GPS coordinates at rest and in transit

### Privacy Controls

1. **Location Sharing Toggle**: Allow users to disable GPS sharing
2. **Unlinking Safety**: Confirm unlinking action with explicit user input
3. **Data Retention**: Archive but don't delete shared data after unlinking (for potential re-linking)

### Rate Limiting

1. **Location Updates**: Max 1 update per minute per user
2. **Message Sending**: Max 60 messages per minute per couple
3. **WebSocket Events**: Max 100 events per second per connection

## Performance Optimization

### Database Indexing

- Index couple_id on all shared tables
- Composite index on (couple_id, created_at) for time-sorted queries
- Index user_id and couple_id on location_updates for fast partner lookup

### Caching Strategy

- Cache partner_links in Redis for 5 minutes
- Cache location_updates for 2 minutes
- Invalidate cache on unlink or location disable

### WebSocket Optimization

- Use Redis Pub/Sub for multi-instance WebSocket scaling
- Implement heartbeat/ping every 30 seconds
- Compress WebSocket messages

## Migration Strategy

### Phase 1: Database Schema
1. Run ALTER TABLE statements to add couple_id columns
2. Backfill couple_id for existing partner relationships from tenant_memberships
3. Create new tables: partner_links, shared_messages, couple_activities, location_updates

### Phase 2: Backend API
1. Deploy partner linking endpoints
2. Deploy WebSocket server
3. Deploy GPS location endpoints
4. Deploy shared context endpoints

### Phase 3: Frontend Integration
1. Integrate LinkStatusProvider
2. Add LinkPromptModal
3. Build shared context UI components
4. Implement WebSocket client
5. Add GPS tracking service

### Phase 4: Testing & Rollout
1. Test partner linking flow end-to-end
2. Test real-time sync under load
3. Test GPS accuracy and battery impact
4. Gradual rollout to user base

## Error Handling

### Common Error Scenarios

1. **Expired Invite Code**: Return 410 Gone with clear message
2. **Already Linked**: Return 409 Conflict when trying to link while linked
3. **Self-Link Attempt**: Return 400 Bad Request with error
4. **GPS Permission Denied**: Show UI message, disable location features
5. **WebSocket Disconnection**: Auto-reconnect with exponential backoff
6. **Location Update Failure**: Retry up to 3 times, then show error

## Testing Strategy

### Unit Tests
- Partner linking service functions
- Couple ID generation
- Location distance calculations
- Cross-attribution logic

### Integration Tests
- Partner invitation flow
- Message sending and receiving
- Location update processing
- Activity completion tracking

### End-to-End Tests
- Full link flow from invite to acceptance
- Real-time message sync between two clients
- GPS location sharing between partners
- Concurrent drawing on canvas

### Performance Tests
- 1000 concurrent WebSocket connections
- Location update throughput
- Message broadcast latency
- Database query performance with couple_id filtering

## Monitoring & Observability

### Metrics to Track
- Active partner_links count
- WebSocket connection count
- Location update frequency
- Message throughput
- API response times
- Database query performance

### Logging
- Partner link creation/deletion events
- Location sharing enable/disable events
- WebSocket connection/disconnection
- Failed invitation attempts
- GPS permission changes

### Alerts
- WebSocket server down
- Database connection pool exhausted
- Location update latency > 5 seconds
- Message delivery failure rate > 1%
