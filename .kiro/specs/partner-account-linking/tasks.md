# Implementation Tasks

## Phase 1: Database Schema & Migrations

### Task 1.1: Create partner_links Table
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 1 hour

Create the partner_links table to store active partner relationships with couple_id.

**Acceptance Criteria:**
- [ ] Table created with columns: id, couple_id, user_a_id, user_b_id, created_at
- [ ] Unique constraint on (user_a_id, user_b_id) with CHECK (user_a_id < user_b_id)
- [ ] Indexes created on user_a_id, user_b_id, and couple_id
- [ ] Foreign key constraints to users table

**Files to Create/Modify:**
- `backend/src/db/migrations/add-partner-links-table.ts`
- `backend/src/db/schema.ts`

---

### Task 1.2: Create shared_messages Table
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 1 hour

Create the shared_messages table for partner chat functionality.

**Acceptance Criteria:**
- [ ] Table created with columns: id, couple_id, sender_user_id, message_text, created_at, read_by_partner
- [ ] Indexes on (couple_id, created_at DESC) and sender_user_id
- [ ] Foreign key to users table

**Files to Create/Modify:**
- `backend/src/db/migrations/add-shared-messages-table.ts`
- `backend/src/db/schema.ts`

---

### Task 1.3: Create couple_activities Table
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 1 hour

Create table to track romance activities, responses, and streaks.

**Acceptance Criteria:**
- [ ] Table created with columns for activity tracking
- [ ] UNIQUE constraint on (couple_id, activity_type, activity_date)
- [ ] JSONB columns for user responses

**Files to Create/Modify:**
- `backend/src/db/migrations/add-couple-activities-table.ts`
- `backend/src/db/schema.ts`

---

### Task 1.4: Create location_updates Table
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 1 hour

Create table for GPS location tracking.

**Acceptance Criteria:**
- [ ] Table with latitude, longitude, accuracy, timestamp
- [ ] Indexes on (user_id, timestamp DESC) and (couple_id, timestamp DESC)
- [ ] DECIMAL precision for coordinates

**Files to Create/Modify:**
- `backend/src/db/migrations/add-location-updates-table.ts`
- `backend/src/db/schema.ts`

---

### Task 1.5: Add couple_id to Existing Tables
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Add couple_id column to profiles, media_items, and canvas_drawings tables.

**Acceptance Criteria:**
- [ ] ALTER TABLE statements for profiles, media_items, canvas_drawings
- [ ] Indexes created on couple_id for each table
- [ ] Backfill script to populate couple_id from existing tenant_memberships
- [ ] Verify data integrity after backfill

**Files to Create/Modify:**
- `backend/src/db/migrations/add-couple-id-columns.ts`
- `backend/scripts/backfill-couple-ids.ts`

---

## Phase 2: Backend - Partner Linking Service

### Task 2.1: Implement Partner Search Service
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Create service to search for users by username or email.

**Acceptance Criteria:**
- [ ] Search function with fuzzy matching
- [ ] Filter out already-linked users
- [ ] Limit results to 10
- [ ] Return user display name, email, profile picture

**Files to Create/Modify:**
- `backend/src/services/partner-linking.ts`

---

### Task 2.2: Implement Couple ID Generation
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 1 hour

Create utility to generate unique couple_id.

**Acceptance Criteria:**
- [ ] Generate format: `couple-{timestamp}-{random}`
- [ ] Ensure uniqueness check against partner_links table
- [ ] Export generation function

**Files to Create/Modify:**
- `backend/src/utils/couple-id.ts`

---

### Task 2.3: Create Partner Link Acceptance Logic
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 3 hours

Implement acceptance flow that creates partner_links and updates profiles.

**Acceptance Criteria:**
- [ ] Validate invitation token
- [ ] Create partner_links record with couple_id
- [ ] Update both users' profiles with couple_id
- [ ] Create/update Partner_Profiles with linked_user_id
- [ ] Update tenant_memberships if not exists
- [ ] Update invitation status to 'accepted'
- [ ] Transaction safety (rollback on error)

**Files to Create/Modify:**
- `backend/src/services/partner-linking.ts`
- `backend/src/services/invitations.ts` (modify existing)

---

### Task 2.4: Implement Unlink Logic
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Create service to unlink partners safely.

**Acceptance Criteria:**
- [ ] Delete partner_links record
- [ ] Remove couple_id from both users' profiles
- [ ] Delete Partner_Profiles (keep Self_Profiles)
- [ ] Archive shared data (don't delete)
- [ ] Close WebSocket connections for the couple

**Files to Create/Modify:**
- `backend/src/services/partner-linking.ts`

---

### Task 2.5: Create Partner Linking API Routes
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 3 hours

Implement REST API endpoints for partner linking.

**Acceptance Criteria:**
- [ ] POST /api/partner/search
- [ ] POST /api/partner/link/create (modify existing /api/invitations/create)
- [ ] POST /api/partner/link/accept (modify existing /api/invitations/accept)
- [ ] POST /api/partner/link/unlink (new)
- [ ] GET /api/partner/link/status (new)
- [ ] Authentication required for all endpoints
- [ ] Input validation with Zod
- [ ] Error handling with clear messages

**Files to Create/Modify:**
- `backend/src/routes/partner-linking.ts`
- `backend/src/index.ts` (register routes)

---

## Phase 3: Backend - WebSocket Real-Time Sync

### Task 3.1: Setup WebSocket Server
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 3 hours

Initialize WebSocket server with authentication.

**Acceptance Criteria:**
- [ ] Install ws or socket.io package
- [ ] Create WebSocket server on /ws endpoint
- [ ] Implement Clerk token authentication
- [ ] Connection/disconnection handlers
- [ ] Store connection mapping (userId -> WebSocket)

**Files to Create/Modify:**
- `backend/package.json` (add ws dependency)
- `backend/src/websocket/server.ts`
- `backend/src/index.ts` (initialize WS server)

---

### Task 3.2: Implement WebSocket Event Broadcasting
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Create utility to broadcast events to partner.

**Acceptance Criteria:**
- [ ] Function to get partner's userId from couple_id
- [ ] Function to broadcast event to specific user's connections
- [ ] Handle case where partner is offline (store in queue or skip)
- [ ] Support broadcasting to both partners in couple

**Files to Create/Modify:**
- `backend/src/websocket/broadcast.ts`

---

### Task 3.3: Implement WebSocket Event Types
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Define TypeScript types for all WebSocket events.

**Acceptance Criteria:**
- [ ] Type definitions for all event types
- [ ] Partner events (online, offline)
- [ ] Message events (new)
- [ ] Drawing events (stroke, clear)
- [ ] Activity events (completed)
- [ ] Location events (update)
- [ ] Album events (new_media)

**Files to Create/Modify:**
- `backend/src/websocket/types.ts`

---

## Phase 4: Backend - Shared Context Services

### Task 4.1: Implement Shared Messages Service
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 3 hours

Create service for partner messaging.

**Acceptance Criteria:**
- [ ] Function to send message (store in DB)
- [ ] Function to get messages for couple (paginated)
- [ ] Mark messages as read
- [ ] Broadcast new messages via WebSocket
- [ ] Include cross-attribution (isYou field)

**Files to Create/Modify:**
- `backend/src/services/shared-messages.ts`
- `backend/src/routes/shared-messages.ts`

---

### Task 4.2: Implement Shared Album Service
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Modify media queries to include partner's content.

**Acceptance Criteria:**
- [ ] Query media_items WHERE couple_id matches
- [ ] Include uploader cross-attribution
- [ ] Broadcast new media via WebSocket
- [ ] Support filtering by media type

**Files to Create/Modify:**
- `backend/src/services/shared-albums.ts`
- `backend/src/routes/media.ts` (modify existing)

---

### Task 4.3: Implement Couple Activities Service
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 3 hours

Create service for romance activities and streaks.

**Acceptance Criteria:**
- [ ] Function to mark activity complete for user
- [ ] Calculate current streak and longest streak
- [ ] Get today's activity status
- [ ] Check if both partners completed
- [ ] Broadcast completion via WebSocket

**Files to Create/Modify:**
- `backend/src/services/couple-activities.ts`
- `backend/src/routes/couple-activities.ts`

---

### Task 4.4: Implement Live Drawing Sync
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Modify canvas_drawings to filter by couple_id and broadcast strokes.

**Acceptance Criteria:**
- [ ] Query canvas_drawings WHERE couple_id matches
- [ ] Broadcast drawing strokes via WebSocket in real-time
- [ ] Broadcast canvas clear events
- [ ] Include drawer's user_id in events

**Files to Create/Modify:**
- `backend/src/services/shared-drawing.ts`
- `backend/src/routes/canvas.ts` (modify existing)

---

## Phase 5: Backend - GPS Location Service

### Task 5.1: Implement Location Update Service
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Create service to store and retrieve GPS locations.

**Acceptance Criteria:**
- [ ] Function to store location update
- [ ] Function to get partner's latest location
- [ ] Check if location is recent (< 10 minutes)
- [ ] Validate GPS coordinates (latitude: -90 to 90, longitude: -180 to 180)
- [ ] Broadcast location update via WebSocket

**Files to Create/Modify:**
- `backend/src/services/gps-location.ts`

---

### Task 5.2: Create GPS Location API Routes
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Implement REST API endpoints for location sharing.

**Acceptance Criteria:**
- [ ] POST /api/location/update
- [ ] GET /api/location/partner
- [ ] PUT /api/location/settings (enable/disable sharing)
- [ ] Rate limiting: max 1 update per minute
- [ ] Validate coordinates

**Files to Create/Modify:**
- `backend/src/routes/gps-location.ts`

---

### Task 5.3: Implement Distance Calculation Utility
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 1 hour

Create utility to calculate distance between two GPS coordinates.

**Acceptance Criteria:**
- [ ] Haversine formula implementation
- [ ] Return distance in kilometers and miles
- [ ] Handle edge cases (same location, antipodes)

**Files to Create/Modify:**
- `backend/src/utils/distance.ts`

---

## Phase 6: Frontend - Link Status Management

### Task 6.1: Create LinkStatusContext
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Create React context to manage partner link status.

**Acceptance Criteria:**
- [ ] Context provider component
- [ ] State: isLinked, coupleId, partner info
- [ ] Function to fetch link status on mount
- [ ] Function to refresh link status
- [ ] Export useLinkStatus hook

**Files to Create/Modify:**
- `src/context/link-status.tsx`

---

### Task 6.2: Create LinkPromptModal Component
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 4 hours

Build modal UI for linking flow.

**Acceptance Criteria:**
- [ ] Show if user is not linked (from LinkStatusContext)
- [ ] Tab 1: Search by username/email
- [ ] Tab 2: Enter invite code
- [ ] Tab 3: Generate invite code + QR code
- [ ] "Skip for now" option (dismisses modal)
- [ ] Show modal again on next sign-in if still unlinked

**Files to Create/Modify:**
- `src/components/partner/LinkPromptModal.tsx`

---

### Task 6.3: Implement Partner Search UI
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 3 hours

Build search interface in LinkPromptModal.

**Acceptance Criteria:**
- [ ] Search input with debouncing
- [ ] Display search results (name, email, profile picture)
- [ ] "Send Invite" button for each result
- [ ] Loading state
- [ ] Error handling
- [ ] Empty state message

**Files to Create/Modify:**
- `src/components/partner/PartnerSearch.tsx`

---

### Task 6.4: Implement Invite Code Generation UI
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Build UI to generate and display invite code + QR code.

**Acceptance Criteria:**
- [ ] Button to generate invitation
- [ ] Display invite code (copyable)
- [ ] Display QR code (using qrcode library)
- [ ] Expiration countdown
- [ ] "Revoke" button for pending invites

**Files to Create/Modify:**
- `src/components/partner/InviteCodeGenerator.tsx`
- `package.json` (add qrcode dependency)

---

### Task 6.5: Implement Invite Code Acceptance UI
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Build UI to accept invite code or scan QR.

**Acceptance Criteria:**
- [ ] Input field for invite code
- [ ] "Scan QR Code" button (opens camera)
- [ ] Preview of inviter (name, profile picture)
- [ ] "Accept" and "Decline" buttons
- [ ] Loading and error states

**Files to Create/Modify:**
- `src/components/partner/AcceptInvite.tsx`

---

## Phase 7: Frontend - WebSocket Client

### Task 7.1: Create WebSocketContext
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 3 hours

Build React context for WebSocket connection.

**Acceptance Criteria:**
- [ ] Connect to wss:// endpoint on mount
- [ ] Include Clerk session token in connection
- [ ] Auto-reconnect with exponential backoff
- [ ] Event listener registration system
- [ ] Export useWebSocket hook
- [ ] Handle connection state (connecting, connected, disconnected)

**Files to Create/Modify:**
- `src/context/websocket.tsx`

---

### Task 7.2: Implement WebSocket Event Handlers
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Create handlers for all WebSocket event types.

**Acceptance Criteria:**
- [ ] Handler for partner:online
- [ ] Handler for partner:offline
- [ ] Handler for message:new
- [ ] Handler for drawing:stroke
- [ ] Handler for drawing:clear
- [ ] Handler for activity:completed
- [ ] Handler for location:update
- [ ] Handler for album:new_media
- [ ] Dispatch events to relevant contexts

**Files to Create/Modify:**
- `src/websocket/event-handlers.ts`

---

## Phase 8: Frontend - Shared Context UI

### Task 8.1: Create SharedMessagesContext
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Build context to manage message state.

**Acceptance Criteria:**
- [ ] Fetch messages on mount
- [ ] Store messages in state
- [ ] Function to send message
- [ ] Listen for message:new WebSocket events
- [ ] Auto-scroll to latest message
- [ ] Export useSharedMessages hook

**Files to Create/Modify:**
- `src/context/shared-messages.tsx`

---

### Task 8.2: Build SharedMessages Component
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 4 hours

Create chat UI for partner messaging.

**Acceptance Criteria:**
- [ ] Message list with scroll container
- [ ] Messages grouped by sender
- [ ] Cross-attribution labels ("You" vs partner name)
- [ ] Message timestamps
- [ ] Input field at bottom
- [ ] Send button
- [ ] Real-time message updates
- [ ] Loading and empty states

**Files to Create/Modify:**
- `src/components/shared/SharedMessages.tsx`

---

### Task 8.3: Modify SharedAlbum to Include Partner Content
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 3 hours

Update existing album view to show partner's uploads.

**Acceptance Criteria:**
- [ ] Query media using couple_id
- [ ] Display uploader name on each item ("from You" / "from Partner")
- [ ] Real-time updates on new uploads
- [ ] Filter by uploader (optional)
- [ ] Sort by date

**Files to Create/Modify:**
- `src/components/media/MediaGrid.tsx` (modify existing)
- `src/routes/index.tsx` (modify dashboard)

---

### Task 8.4: Build PartnerLocation Component
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 4 hours

Create map view to display partner's location.

**Acceptance Criteria:**
- [ ] Integrate Leaflet or Mapbox map library
- [ ] Display partner's location marker
- [ ] Display "last updated" timestamp
- [ ] Show "location sharing disabled" if partner disabled
- [ ] Calculate and display distance
- [ ] Real-time location updates via WebSocket
- [ ] Request user's own location for distance calc

**Files to Create/Modify:**
- `src/components/location/PartnerLocation.tsx`
- `package.json` (add leaflet dependency)

---

### Task 8.5: Build RomanceActivities Component
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 4 hours

Create UI for couple activities and streaks.

**Acceptance Criteria:**
- [ ] Display current streak and longest streak
- [ ] Show today's activity prompt
- [ ] Show completion status (you, partner, both)
- [ ] Button to mark as complete
- [ ] Input for response (if activity requires)
- [ ] Real-time updates when partner completes
- [ ] Celebration animation when both complete

**Files to Create/Modify:**
- `src/components/activities/RomanceActivities.tsx`

---

### Task 8.6: Modify LiveDrawing to Support Real-Time Sync
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 3 hours

Update canvas component to broadcast and receive strokes.

**Acceptance Criteria:**
- [ ] Send stroke data via WebSocket on draw
- [ ] Render incoming strokes from partner
- [ ] Show indicator when partner is drawing
- [ ] Sync canvas clear action
- [ ] Query canvas_drawings by couple_id
- [ ] Handle concurrent drawing without conflicts

**Files to Create/Modify:**
- `src/components/canvas/LiveDrawing.tsx` (modify existing)

---

## Phase 9: Frontend - GPS Location Tracking

### Task 9.1: Create GPSLocationTracker Service
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 3 hours

Build background service to track and send location.

**Acceptance Criteria:**
- [ ] Request geolocation permissions
- [ ] Get GPS coordinates using Geolocation API
- [ ] Send location update every 2 minutes
- [ ] Only send when location sharing is enabled
- [ ] Respect device battery saver mode
- [ ] Handle permission denial gracefully

**Files to Create/Modify:**
- `src/services/gps-tracker.ts`

---

### Task 9.2: Create LocationSettingsContext
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Build context to manage location sharing preferences.

**Acceptance Criteria:**
- [ ] State: sharingEnabled, permissionStatus
- [ ] Function to enable/disable sharing
- [ ] Function to check permission status
- [ ] Persist preference in localStorage
- [ ] Export useLocationSettings hook

**Files to Create/Modify:**
- `src/context/location-settings.tsx`

---

### Task 9.3: Build Location Settings UI
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Create settings page for location sharing.

**Acceptance Criteria:**
- [ ] Toggle to enable/disable location sharing
- [ ] Show current permission status
- [ ] Button to request permissions
- [ ] Explanation of location usage
- [ ] Show last location update timestamp

**Files to Create/Modify:**
- `src/components/settings/LocationSettings.tsx`

---

## Phase 10: Frontend - Feature Access Control

### Task 10.1: Implement Feature Gate Component
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Create component to restrict access based on link status.

**Acceptance Criteria:**
- [ ] Check isLinked from LinkStatusContext
- [ ] Show children if linked
- [ ] Show "Link with partner" message if not linked
- [ ] Button to open LinkPromptModal

**Files to Create/Modify:**
- `src/components/shared/FeatureGate.tsx`

---

### Task 10.2: Apply Feature Gates to Shared Features
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Wrap shared feature components with FeatureGate.

**Acceptance Criteria:**
- [ ] Wrap SharedMessages with FeatureGate
- [ ] Wrap LiveDrawing with FeatureGate
- [ ] Wrap RomanceActivities with FeatureGate
- [ ] Wrap PartnerLocation with FeatureGate
- [ ] Allow SharedAlbum in view-only mode when not linked

**Files to Modify:**
- `src/routes/index.tsx`
- `src/routes/canvas.tsx`
- `src/routes/activities.tsx`

---

## Phase 11: Partner Management & Unlinking

### Task 11.1: Build Partner Management Settings Page
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 3 hours

Create settings page for partner management.

**Acceptance Criteria:**
- [ ] Display partner info (name, email, profile picture)
- [ ] Show link date
- [ ] "Unlink Partner" button
- [ ] Confirmation dialog with warning
- [ ] Require typing "UNLINK" to confirm
- [ ] Redirect to link prompt after unlink

**Files to Create/Modify:**
- `src/components/settings/PartnerManagement.tsx`
- `src/routes/settings.tsx`

---

## Phase 12: Testing & QA

### Task 12.1: Write Backend Unit Tests
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 4 hours

Write unit tests for core services.

**Acceptance Criteria:**
- [ ] Test partner-linking service functions
- [ ] Test couple ID generation and uniqueness
- [ ] Test distance calculation utility
- [ ] Test location validation
- [ ] Test message storage and retrieval
- [ ] Test activity streak calculation

**Files to Create/Modify:**
- `backend/tests/services/partner-linking.test.ts`
- `backend/tests/utils/couple-id.test.ts`
- `backend/tests/utils/distance.test.ts`

---

### Task 12.2: Write Backend Integration Tests
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 4 hours

Write integration tests for API endpoints.

**Acceptance Criteria:**
- [ ] Test partner linking flow end-to-end
- [ ] Test message sending and receiving
- [ ] Test location update and retrieval
- [ ] Test activity completion
- [ ] Test WebSocket event broadcasting
- [ ] Test unlink flow

**Files to Create/Modify:**
- `backend/tests/integration/partner-linking.test.ts`
- `backend/tests/integration/shared-messages.test.ts`
- `backend/tests/integration/gps-location.test.ts`

---

### Task 12.3: Write Frontend Component Tests
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 4 hours

Write tests for React components.

**Acceptance Criteria:**
- [ ] Test LinkPromptModal rendering and interactions
- [ ] Test SharedMessages sending and display
- [ ] Test PartnerLocation map rendering
- [ ] Test RomanceActivities completion flow
- [ ] Test FeatureGate access control

**Files to Create/Modify:**
- `src/components/partner/__tests__/LinkPromptModal.test.tsx`
- `src/components/shared/__tests__/SharedMessages.test.tsx`

---

### Task 12.4: End-to-End Testing
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 6 hours

Conduct full E2E testing with two users.

**Acceptance Criteria:**
- [ ] Test partner linking from invite to acceptance
- [ ] Test real-time message sync
- [ ] Test GPS location sharing
- [ ] Test concurrent drawing
- [ ] Test activity completion and streak tracking
- [ ] Test unlink flow

**Files to Create/Modify:**
- `e2e-tests/partner-linking.spec.ts`

---

## Phase 13: Deployment & Monitoring

### Task 13.1: Setup Production Database Migrations
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Prepare migration scripts for production.

**Acceptance Criteria:**
- [ ] Create migration scripts
- [ ] Test on staging database
- [ ] Backup production database before migration
- [ ] Document rollback procedures

---

### Task 13.2: Configure WebSocket Server for Production
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Setup WebSocket server with proper scaling.

**Acceptance Criteria:**
- [ ] Configure Redis Pub/Sub for multi-instance support
- [ ] Setup load balancing with sticky sessions
- [ ] Configure SSL/TLS for wss://
- [ ] Test reconnection behavior

---

### Task 13.3: Setup Monitoring and Alerts
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 3 hours

Configure monitoring for new features.

**Acceptance Criteria:**
- [ ] Add metrics for WebSocket connections
- [ ] Add metrics for location update frequency
- [ ] Add metrics for message throughput
- [ ] Configure alerts for high error rates
- [ ] Configure alerts for WebSocket server down

---

### Task 13.4: Deploy Backend Changes
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 2 hours

Deploy backend to production.

**Acceptance Criteria:**
- [ ] Run database migrations
- [ ] Deploy backend with WebSocket server
- [ ] Verify all endpoints responding
- [ ] Verify WebSocket connections working

---

### Task 13.5: Deploy Frontend Changes
**Status:** `pending`
**Assignee:** Unassigned
**Estimate:** 1 hour

Deploy frontend to production.

**Acceptance Criteria:**
- [ ] Build production bundle
- [ ] Deploy to hosting
- [ ] Verify WebSocket connection to backend
- [ ] Test partner linking flow in production

---

## Summary

**Total Tasks:** 62
**Total Estimated Time:** ~155 hours (~4 weeks for 1 developer)

**Phase Breakdown:**
- Phase 1 (Database): 6 hours
- Phase 2 (Backend Linking): 11 hours
- Phase 3 (Backend WebSocket): 7 hours
- Phase 4 (Backend Shared Context): 10 hours
- Phase 5 (Backend GPS): 5 hours
- Phase 6 (Frontend Link Status): 13 hours
- Phase 7 (Frontend WebSocket): 5 hours
- Phase 8 (Frontend Shared UI): 20 hours
- Phase 9 (Frontend GPS): 7 hours
- Phase 10 (Frontend Access Control): 4 hours
- Phase 11 (Partner Management): 3 hours
- Phase 12 (Testing): 18 hours
- Phase 13 (Deployment): 10 hours
