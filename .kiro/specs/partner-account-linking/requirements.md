# Requirements Document

## Introduction

This document specifies requirements for a Partner Account Linking & Shared Experience System that enables two user accounts to connect as a linked couple and share a unified context across all features of the application. The system transforms the current single-user experience into a synchronized, mutual couple experience where both partners see each other's contributions, share media collections, and interact with couple-focused features. The system extends the existing Clerk authentication, profile system, and partner invitation infrastructure to provide real-time synchronization and proper cross-attribution.

## Glossary

- **Partner_Link**: A bidirectional relationship between two user accounts indicating they are a linked couple
- **Linking_System**: The component responsible for creating, managing, and validating partner links
- **Shared_Context**: The unified data space accessible to both partners in a linked relationship
- **Self_Profile**: The primary profile representing the account owner (role = "self")
- **Partner_Profile**: The profile representing the linked partner (role = "partner")
- **Couple_ID**: A unique identifier for a linked partner pair used to associate shared data
- **Cross_Attribution**: Display of partner's name/identity on content they created or contributed
- **Linking_Flow**: The user experience guiding account holders through partner connection
- **Link_Status**: The current state of partnership (unlinked, invited, pending, linked, unlinked)
- **Shared_Album**: Photo and video collection accessible to both partners
- **Shared_Message_Thread**: Unified chat conversation between partners
- **Live_Drawing_Canvas**: Real-time collaborative drawing surface for both partners
- **Shared_Memory**: Timeline entry or memory visible to both partners
- **Romance_Activity**: Couple-focused interactive features (games, prompts, streaks)
- **GPS_Sync**: Continuous location sharing using device GPS coordinates
- **Location_Update**: GPS coordinate transmission from device to backend
- **Location_Display**: Presentation of partner's current or last-known location
- **Sync_Engine**: Backend component managing real-time data synchronization between partners
- **Invitation_System**: Existing infrastructure for sending and accepting partner invitations
- **Tenant_Membership**: Database record linking two users as partners (owner_user_id, member_user_id)
- **Household_ID**: Shared identifier connecting related profiles in a partnership

## Requirements

### Requirement 1: Partner Linking Flow on Sign-In

**User Story:** As a user signing into the application, I want to be prompted to link with my partner if I haven't already, so that I can access shared couple features.

#### Acceptance Criteria

1. WHEN a user completes authentication, THE Linking_System SHALL check the user's Link_Status
2. WHEN the Link_Status is "unlinked", THE Linking_System SHALL display the partner linking prompt before allowing access to shared features
3. THE linking prompt SHALL provide options to search by username, search by email, or generate an invite code
4. THE linking prompt SHALL provide an option to generate a QR code for partner scanning
5. THE Linking_System SHALL allow users to skip the linking prompt
6. WHEN a user skips the linking prompt, THE Linking_System SHALL restrict access to shared features until linking is completed
7. THE Linking_System SHALL display the linking prompt on each sign-in until a partner link is established

### Requirement 2: Partner Search and Invitation

**User Story:** As a user wanting to link with my partner, I want to search for their account or send them an invitation, so that we can connect our accounts.

#### Acceptance Criteria

1. WHEN a user enters a username in the search field, THE Linking_System SHALL query registered accounts and display matching results
2. WHEN a user enters an email in the search field, THE Linking_System SHALL query registered accounts by email and display matching results
3. THE Linking_System SHALL display up to 10 search results ordered by match relevance
4. WHEN a user selects a search result, THE Linking_System SHALL send a partner link invitation to that account
5. WHEN a user requests an invite code, THE Linking_System SHALL generate a unique alphanumeric code valid for 7 days
6. WHEN a user requests a QR code, THE Linking_System SHALL generate a QR code encoding the invite token
7. THE invite code and QR code SHALL encode the same invitation token
8. WHEN an invitation is created, THE Linking_System SHALL store the invitation with status "pending" in the partner_invites table
9. THE Linking_System SHALL allow only one pending invitation per user at any time

### Requirement 3: Invitation Acceptance and Partner Link Creation

**User Story:** As a user receiving a partner invitation, I want to accept the invitation to link our accounts, so that we can share couple experiences.

#### Acceptance Criteria

1. WHEN a user enters an invite code, THE Linking_System SHALL validate the code against pending invitations
2. WHEN a user scans a QR code, THE Linking_System SHALL extract and validate the invite token
3. IF an invite token is expired, THEN THE Linking_System SHALL display an error message and update the invitation status to "expired"
4. IF an invite token is invalid, THEN THE Linking_System SHALL display an error message
5. WHEN a valid invitation is presented, THE Linking_System SHALL display the inviting user's name and profile picture for confirmation
6. THE Linking_System SHALL require explicit acceptance action from the invitee
7. WHEN an invitee accepts the invitation, THE Linking_System SHALL create a Partner_Link between both accounts
8. WHEN a Partner_Link is created, THE Linking_System SHALL generate a unique Couple_ID for the partnership
9. WHEN a Partner_Link is created, THE Linking_System SHALL create a Partner_Profile for the invitee on the inviter's account
10. WHEN a Partner_Link is created, THE Linking_System SHALL create a Partner_Profile for the inviter on the invitee's account
11. WHEN Partner_Profiles are created, THE Linking_System SHALL set the linked_user_id to reference the other user's account
12. WHEN a Partner_Link is created, THE Linking_System SHALL update the invitation status to "accepted"
13. WHEN a Partner_Link is created, THE Linking_System SHALL assign the shared Couple_ID to both users' profiles

### Requirement 4: Mutual Partner Acceptance Enforcement

**User Story:** As a user, I want both parties to explicitly agree to linking, so that partner connections are consensual.

#### Acceptance Criteria

1. THE Linking_System SHALL NOT create a Partner_Link until the invitee explicitly accepts the invitation
2. WHEN an invitee declines an invitation, THE Linking_System SHALL update the invitation status to "declined"
3. WHEN an invitation is declined, THE Linking_System SHALL NOT create any Partner_Link or Partner_Profile
4. THE Linking_System SHALL allow an inviter to revoke a pending invitation
5. WHEN an inviter revokes an invitation, THE Linking_System SHALL update the invitation status to "revoked"
6. WHEN an invitation is revoked, THE Linking_System SHALL prevent the invite code and QR code from being accepted

### Requirement 5: Shared Album Access

**User Story:** As a linked partner, I want to see photos and videos from both my account and my partner's account in a unified album, so that we can view our shared memories together.

#### Acceptance Criteria

1. WHEN a Partner_Link exists, THE Shared_Album SHALL display media items from both partners' accounts
2. THE Shared_Album SHALL query media items WHERE user_id matches either partner's user_id OR Couple_ID matches the shared Couple_ID
3. THE Shared_Album SHALL display the contributor's name on each media item (cross-attribution)
4. WHEN the Self_Profile created a media item, THE Shared_Album SHALL display "from You" attribution
5. WHEN the Partner_Profile created a media item, THE Shared_Album SHALL display "from [Partner_Name]" attribution
6. THE Shared_Album SHALL sort media items by creation date descending
7. WHEN a partner uploads a new media item, THE Sync_Engine SHALL make it visible to both partners in real-time

### Requirement 6: Shared Messaging Thread

**User Story:** As a linked partner, I want to send and receive messages with my partner in a unified chat thread, so that we can communicate within the app.

#### Acceptance Criteria

1. WHEN a Partner_Link exists, THE Shared_Message_Thread SHALL display messages from both partners
2. THE Shared_Message_Thread SHALL query messages WHERE Couple_ID matches the shared Couple_ID
3. THE Shared_Message_Thread SHALL display the sender's name with each message
4. WHEN the Self_Profile sends a message, THE Shared_Message_Thread SHALL display it as "You: [message]"
5. WHEN the Partner_Profile sends a message, THE Shared_Message_Thread SHALL display it as "[Partner_Name]: [message]"
6. WHEN a partner sends a message, THE Sync_Engine SHALL deliver it to both partners in real-time
7. THE Shared_Message_Thread SHALL sort messages by timestamp ascending
8. THE Shared_Message_Thread SHALL auto-scroll to the latest message when a new message arrives

### Requirement 7: Shared Banners and Home Screen Content

**User Story:** As a linked partner, I want to see couple-focused content on the home screen, so that the app reflects our partnership.

#### Acceptance Criteria

1. WHEN a Partner_Link exists, THE home screen SHALL display couple-focused banners
2. THE home screen SHALL query hero_banners WHERE Couple_ID matches the shared Couple_ID OR user_id matches either partner
3. WHEN displaying time-based greetings, THE home screen SHALL use couple-specific messages (e.g., "Good morning, Ashish and Punts")
4. THE home screen SHALL display both partners' names in the greeting
5. WHEN one partner customizes a banner, THE Sync_Engine SHALL make the updated banner visible to both partners

### Requirement 8: Live Drawing Canvas

**User Story:** As a linked partner, I want to draw on a shared canvas with my partner in real-time, so that we can create art together.

#### Acceptance Criteria

1. WHEN a Partner_Link exists, THE Live_Drawing_Canvas SHALL be accessible to both partners
2. THE Live_Drawing_Canvas SHALL store drawing data associated with the shared Couple_ID
3. WHEN one partner draws a stroke, THE Sync_Engine SHALL transmit the stroke to the other partner within 500ms
4. THE Live_Drawing_Canvas SHALL display the drawing partner's name or indicator
5. THE Live_Drawing_Canvas SHALL preserve the complete drawing state when either partner refreshes
6. WHEN one partner clears the canvas, THE Sync_Engine SHALL clear the canvas for both partners
7. THE Live_Drawing_Canvas SHALL support concurrent drawing by both partners without data loss

### Requirement 9: Shared Memories Timeline

**User Story:** As a linked partner, I want to view a unified timeline of memories from both of us, so that we can relive our shared experiences.

#### Acceptance Criteria

1. WHEN a Partner_Link exists, THE Shared_Memory timeline SHALL display memories from both partners
2. THE Shared_Memory timeline SHALL query memories WHERE user_id matches either partner's user_id OR Couple_ID matches the shared Couple_ID
3. THE Shared_Memory timeline SHALL display the creator's name on each memory
4. WHEN the Self_Profile created a memory, THE Shared_Memory timeline SHALL display "from You" attribution
5. WHEN the Partner_Profile created a memory, THE Shared_Memory timeline SHALL display "from [Partner_Name]" attribution
6. THE Shared_Memory timeline SHALL sort memories by date descending
7. WHEN a partner adds a new memory, THE Sync_Engine SHALL make it visible to both partners in real-time

### Requirement 10: Romance Activities and Shared Engagement

**User Story:** As a linked partner, I want to participate in romance activities and games with my partner, so that we can have fun interactive experiences together.

#### Acceptance Criteria

1. WHEN a Partner_Link exists, THE Romance_Activity system SHALL be accessible to both partners
2. THE Romance_Activity system SHALL track participation and responses from both partners using the Couple_ID
3. WHEN displaying activity prompts, THE Romance_Activity system SHALL show whether the partner has completed their response
4. WHEN both partners complete an activity, THE Romance_Activity system SHALL display combined results
5. THE Romance_Activity system SHALL track and display couple streaks (consecutive days of mutual participation)
6. WHEN one partner's response becomes available, THE Sync_Engine SHALL notify the other partner in real-time
7. THE Romance_Activity system SHALL prevent viewing partner responses until both have submitted (for surprise/reveal mechanics)

### Requirement 11: GPS Location Sync Using Device GPS

**User Story:** As a linked partner, I want to share my real-time location with my partner using device GPS, so that we can see where each other are.

#### Acceptance Criteria

1. WHEN a Partner_Link exists, THE GPS_Sync system SHALL be available to both partners
2. THE GPS_Sync system SHALL request device GPS permissions from the user
3. IF GPS permissions are denied, THEN THE GPS_Sync system SHALL display a message explaining location sharing is disabled
4. WHEN GPS permissions are granted, THE GPS_Sync system SHALL capture GPS coordinates from the device
5. THE GPS_Sync system SHALL NOT use IP-based geolocation for location tracking
6. THE GPS_Sync system SHALL send Location_Updates to the backend at 2-minute intervals WHILE the app is active
7. WHEN a Location_Update is received, THE Sync_Engine SHALL store the coordinates with the user_id and timestamp
8. WHEN a partner's location is updated, THE Sync_Engine SHALL push the Location_Update to the other partner within 30 seconds
9. THE Location_Display SHALL show the partner's current location on a map
10. IF no Location_Update has been received for 10 minutes, THEN THE Location_Display SHALL show the last-known location with a timestamp
11. THE GPS_Sync system SHALL encrypt GPS coordinates during transmission and storage

### Requirement 12: GPS Permission and Privacy Handling

**User Story:** As a user, I want control over location sharing permissions, so that my privacy is respected.

#### Acceptance Criteria

1. THE GPS_Sync system SHALL provide a settings toggle to enable or disable location sharing
2. WHEN location sharing is disabled by the user, THE GPS_Sync system SHALL stop sending Location_Updates
3. WHEN location sharing is disabled, THE Location_Display SHALL show "Location sharing disabled" to the partner
4. THE GPS_Sync system SHALL allow users to view their own location sharing status
5. THE GPS_Sync system SHALL display the last time a Location_Update was sent
6. WHEN a user revokes GPS permissions at the device level, THE GPS_Sync system SHALL detect the change and update the UI accordingly
7. THE GPS_Sync system SHALL NOT track or store location data when location sharing is disabled

### Requirement 13: Couple ID and Shared Data Association

**User Story:** As the system, I need to associate shared data with a Couple_ID, so that partner content is properly linked and isolated from other couples.

#### Acceptance Criteria

1. WHEN a Partner_Link is created, THE Linking_System SHALL generate a unique Couple_ID
2. THE Couple_ID SHALL be stored in the profiles table for both partners' Self_Profiles and Partner_Profiles
3. WHEN storing shared content (messages, drawings, activities), THE system SHALL associate the data with the Couple_ID
4. THE system SHALL query shared content using the Couple_ID as the primary filter
5. THE Couple_ID SHALL remain constant throughout the partnership
6. WHEN a partnership is unlinked, THE system SHALL preserve the Couple_ID on historical data but remove it from active profiles

### Requirement 14: Real-Time Synchronization Engine

**User Story:** As a linked partner, I want changes made by my partner to appear immediately in my app, so that we have a synchronized experience.

#### Acceptance Criteria

1. THE Sync_Engine SHALL establish a persistent WebSocket connection for each authenticated user
2. WHEN a partner performs an action affecting shared data, THE Sync_Engine SHALL push the update to the other partner's WebSocket connection
3. THE Sync_Engine SHALL transmit updates for: messages, drawing strokes, media uploads, activity responses, and location updates
4. THE Sync_Engine SHALL deliver updates within 2 seconds for all shared content types except GPS location
5. IF a WebSocket connection is lost, THEN THE Sync_Engine SHALL attempt to reconnect automatically every 5 seconds
6. WHEN a WebSocket reconnects, THE Sync_Engine SHALL sync any missed updates from the disconnection period
7. THE Sync_Engine SHALL include the originating user_id with each update to enable cross-attribution

### Requirement 15: Partner Unlinking and Data Handling

**User Story:** As a user, I want the ability to unlink from my partner if our relationship ends, so that I can separate our accounts.

#### Acceptance Criteria

1. THE Linking_System SHALL provide an "Unlink Partner" option in account settings
2. WHEN a user initiates unlinking, THE Linking_System SHALL display a confirmation dialog explaining the consequences
3. THE Linking_System SHALL require explicit confirmation before proceeding with unlinking
4. WHEN unlinking is confirmed, THE Linking_System SHALL remove the Partner_Link between the accounts
5. WHEN a Partner_Link is removed, THE Linking_System SHALL delete both Partner_Profiles
6. WHEN a Partner_Link is removed, THE Linking_System SHALL remove the Couple_ID from active profiles
7. WHEN a Partner_Link is removed, THE Linking_System SHALL preserve historical shared data but mark it as archived
8. WHEN a Partner_Link is removed, THE Linking_System SHALL stop all real-time synchronization between the accounts
9. WHEN a Partner_Link is removed, THE Linking_System SHALL disable GPS_Sync for both users
10. THE Linking_System SHALL allow previously unlinked users to establish a new Partner_Link with different partners

### Requirement 16: Feature Access Control Based on Link Status

**User Story:** As the system, I need to restrict shared features until a partner link is established, so that couple features are only available to linked accounts.

#### Acceptance Criteria

1. WHEN Link_Status is "unlinked", THE system SHALL disable access to Shared_Message_Thread
2. WHEN Link_Status is "unlinked", THE system SHALL disable access to Live_Drawing_Canvas
3. WHEN Link_Status is "unlinked", THE system SHALL disable access to Romance_Activity features
4. WHEN Link_Status is "unlinked", THE system SHALL disable GPS_Sync
5. WHEN Link_Status is "linked", THE system SHALL enable all shared features
6. WHEN a user attempts to access a disabled shared feature, THE system SHALL display a message prompting them to link with a partner
7. THE system SHALL allow access to Shared_Album in view-only mode when Link_Status is "unlinked" (displaying only the user's own media)

### Requirement 17: Cross-Attribution Display Consistency

**User Story:** As a user, I want to clearly see which content was created by me versus my partner, so that I can understand who contributed what.

#### Acceptance Criteria

1. THE system SHALL display the contributor's name on all shared content items
2. THE system SHALL use "You" for content created by the active profile
3. THE system SHALL use the partner's display name for content created by the partner
4. THE cross-attribution display SHALL include the contributor's profile picture when available
5. THE system SHALL maintain consistent attribution styling across all features (albums, messages, memories, activities)
6. WHEN hovering over or tapping attributed content, THE system SHALL display the full timestamp of creation

### Requirement 18: Tenant Membership and Household Integration

**User Story:** As the system, I need to integrate Partner_Links with the existing tenant_memberships and household_id infrastructure, so that the linking system works with existing multi-tenancy architecture.

#### Acceptance Criteria

1. WHEN a Partner_Link is created, THE Linking_System SHALL create a tenant_memberships record with owner_user_id and member_user_id
2. WHEN a Partner_Link is created, THE Linking_System SHALL generate a Household_ID using the format "household-{owner_user_id}"
3. WHEN a Partner_Link is created, THE Linking_System SHALL assign the Household_ID to both partners' Self_Profiles and Partner_Profiles
4. THE system SHALL query tenant_memberships to validate Partner_Link existence
5. WHEN querying shared data, THE system SHALL use both Couple_ID and Household_ID for filtering where appropriate
6. THE Linking_System SHALL ensure backward compatibility with existing profiles that have household_id set

### Requirement 19: Invitation Re-linking and Edge Cases

**User Story:** As a user who previously had a partner link, I want to establish a new link with a different partner, so that I can form a new partnership.

#### Acceptance Criteria

1. WHEN a user with Link_Status "unlinked" sends a new invitation, THE Linking_System SHALL allow the invitation to be created
2. THE Linking_System SHALL prevent a user from having multiple active Partner_Links simultaneously
3. IF a user has an active Partner_Link, THEN THE Linking_System SHALL reject new invitation creation attempts
4. IF a user has a pending outgoing invitation, THEN THE Linking_System SHALL allow them to revoke it and send a new invitation
5. THE Linking_System SHALL prevent a user from accepting an invitation if they already have an active Partner_Link
6. WHEN a user tries to link with themselves, THE Linking_System SHALL display an error message "You cannot link with your own account"

### Requirement 20: Link Status Validation and Consistency

**User Story:** As the system, I need to maintain consistent Link_Status across both partner accounts, so that the partnership state is always synchronized.

#### Acceptance Criteria

1. THE Linking_System SHALL derive Link_Status from the presence of a valid tenant_memberships record
2. WHEN no tenant_memberships record exists for a user, THE Link_Status SHALL be "unlinked"
3. WHEN a tenant_memberships record exists and both Partner_Profiles exist, THE Link_Status SHALL be "linked"
4. WHEN an invitation is pending, THE Link_Status SHALL be "invited" for the inviter and "pending" for the invitee
5. THE Linking_System SHALL ensure both partners have the same Link_Status ("linked" or "unlinked") after any linking or unlinking operation
6. THE system SHALL validate Link_Status on each API request to shared feature endpoints
7. IF Link_Status validation fails, THEN THE system SHALL return a 403 Forbidden error with a descriptive message
