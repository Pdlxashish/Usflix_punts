# Requirements Document

## Introduction

This document defines the requirements for evolving the existing USFLIX photo album app (TanStack Start / React SSR, Tailwind CSS v4, deployed to Cloudflare Workers) into a full-featured, customizable web-based video streaming platform. The platform will support video and image uploads, Netflix-style playback, hierarchical content organization, and a full administrative control panel. All data is currently static; this feature introduces a persistent backend, a storage layer, and a dynamic content model.

---

## Glossary

- **Platform**: The complete web-based video streaming application served to end users.
- **Administrator**: An authenticated user with full content management and configuration privileges.
- **Viewer**: An unauthenticated or authenticated end user who browses and watches content.
- **Media_Item**: A single uploadable asset — either a video file or an image file.
- **Collection**: A named, hierarchical grouping of Media_Items (equivalent to a folder or album).
- **Video_Player**: The in-browser component responsible for rendering and controlling video playback.
- **Branding_Config**: A persistent configuration record that stores the platform name, taglines, and other customizable text strings.
- **Upload_Service**: The backend service that receives, validates, and stores uploaded files.
- **Storage**: The durable object store (e.g., Cloudflare R2) where uploaded files are persisted.
- **Metadata_Store**: The persistent database (e.g., Cloudflare D1) that stores records for Collections and Media_Items.
- **Admin_Panel**: The protected web interface through which the Administrator manages content and configuration.
- **Thumbnail**: A static image extracted from a video or provided by the Administrator, used as a preview.
- **HLS**: HTTP Live Streaming — an adaptive bitrate streaming protocol.
- **Seek**: The act of jumping playback to a specific timestamp in a video.

---

## Requirements

### Requirement 1: Customizable Platform Branding

**User Story:** As an Administrator, I want to change the platform name, taglines, and prominent text elements from a single configuration interface, so that the platform can be rebranded without modifying source code.

#### Acceptance Criteria

1. THE Platform SHALL read all user-facing text strings (platform name, hero tagline, footer text, page titles) from the Branding_Config at render time, so that no hardcoded strings appear in page output.
2. WHEN the Administrator saves an updated Branding_Config, THE Platform SHALL reflect the new text on all subsequent page loads and client-side navigations within 5 seconds, without requiring a redeployment.
3. THE Admin_Panel SHALL provide a form with a labeled input field for each configurable Branding_Config string, where platform name and page title fields accept at most 100 characters, tagline fields accept at most 200 characters, and footer text fields accept at most 500 characters.
4. WHEN a Branding_Config field is submitted with an empty or whitespace-only value, THE Admin_Panel SHALL reject the submission and SHALL NOT persist any changes from that submission.
5. WHEN a Branding_Config field is submitted with an empty or whitespace-only value, THE Admin_Panel SHALL display a validation error message identifying the offending field.
6. THE Branding_Config SHALL persist across Cloudflare Worker restarts and new Worker deployments by being stored in the Metadata_Store.
7. IF saving the Branding_Config to the Metadata_Store fails, THEN THE Admin_Panel SHALL display an error message indicating the save failed and SHALL NOT update the in-memory Branding_Config.

---

### Requirement 2: Video File Upload

**User Story:** As an Administrator, I want to upload video files to the platform, so that Viewers can stream them.

#### Acceptance Criteria

1. WHEN the Administrator submits a video file via the upload interface, THE Upload_Service SHALL accept files whose MIME type is one of `video/mp4`, `video/quicktime`, `video/x-matroska`, or `video/webm`.
2. WHEN a file with an unsupported MIME type is submitted, THE Upload_Service SHALL return an error message that identifies the submitted MIME type and lists the four accepted MIME types.
3. WHEN a video file exceeds 4 GB (4,294,967,296 bytes) in size, THE Upload_Service SHALL reject the upload before transferring the file body and return an error message stating the 4 GB limit.
4. WHILE a video upload is in progress, THE Platform SHALL display a progress indicator showing the percentage of bytes transferred, updated at least once per second.
5. WHEN a video upload completes successfully and Storage persistence succeeds, THE Upload_Service SHALL create a Media_Item record in the Metadata_Store containing at minimum: a unique ID, the original filename, the Storage object key, the MIME type, the file size in bytes, and a `status` field set to `"ready"`.
6. WHEN a video upload fails after the transfer has begun (network error, server error, or timeout), THE Upload_Service SHALL delete any partially written data from Storage and return an error message describing the failure.
7. IF a video upload is interrupted before completion, THEN THE Upload_Service SHALL retain a resumable upload session for at least 24 hours, so that the Administrator can resume the transfer from the last acknowledged byte within that window.
8. IF Storage persistence fails after a successful transfer, THEN THE Upload_Service SHALL create a Media_Item record in the Metadata_Store with `status` set to `"storage_failed"`, and that Media_Item SHALL NOT be served to Viewers for streaming until its status is updated to `"ready"`.

---

### Requirement 3: Image File Upload

**User Story:** As an Administrator, I want to upload image files to the platform, so that they can serve as Thumbnails or standalone media within Collections.

#### Acceptance Criteria

1. WHEN the Administrator submits an image file via the upload interface, THE Upload_Service SHALL validate the file's format by inspecting its magic bytes and SHALL accept files whose magic bytes identify them as JPEG, PNG, WebP, or GIF.
2. WHEN an image file exceeds 50 MB (52,428,800 bytes) in size, THE Upload_Service SHALL reject the upload before transferring the file body and return an error message stating the 50 MB limit.
3. WHEN an image upload completes successfully and Storage persistence succeeds, THE Upload_Service SHALL create a Media_Item record in the Metadata_Store containing at minimum: a unique ID, the original filename, the Storage object key, the detected format, the file size in bytes, and a `status` field set to `"ready"`.
4. IF an image file's magic bytes do not match any accepted format, THEN THE Upload_Service SHALL return an error message identifying the detected format (or "unknown" if unrecognized) and listing the four accepted formats.
5. IF a zero-byte image file is submitted, THEN THE Upload_Service SHALL reject it and return an error message stating that empty files are not accepted.
6. IF Storage persistence fails after a successful image transfer, THEN THE Upload_Service SHALL create a Media_Item record in the Metadata_Store with `status` set to `"storage_failed"`, and that Media_Item SHALL NOT be displayed to Viewers until its status is updated to `"ready"`.

---

### Requirement 4: Netflix-Style Video Playback

**User Story:** As a Viewer, I want to watch videos in a polished, full-featured player, so that the experience feels comparable to professional streaming services.

#### Acceptance Criteria

1. WHEN a Viewer selects a video, THE Video_Player SHALL render within a dedicated full-viewport or modal playback frame that visually replaces or overlays the browse view, with the video element occupying at least 80% of the viewport height.
2. THE Video_Player SHALL provide play, pause, volume adjustment (0–100%), mute toggle, seek bar, and fullscreen controls, each accessible via a visible on-screen button and a documented keyboard shortcut.
3. WHEN a Viewer presses the spacebar while the Video_Player container has focus, THE Video_Player SHALL toggle between play and pause states within 100 ms.
4. WHEN a Viewer presses the F key while the Video_Player container has focus, THE Video_Player SHALL toggle fullscreen mode within 100 ms.
5. WHEN a Viewer interacts with the seek bar and releases it at a target timestamp, THE Video_Player SHALL update the playback position to within ±1 second of the target timestamp within 500 ms of release; IF the seek has not completed within 500 ms, THE Video_Player SHALL display a buffering indicator and restore the previous playback position.
6. WHILE a video is buffering, THE Video_Player SHALL display a visible loading spinner and SHALL keep the seek bar and all controls visible and interactive.
7. WHEN a video reaches its end, THE Video_Player SHALL display an end-of-video overlay containing a "Replay" button and a "Back to Browse" button within 500 ms of the video ending.
8. WHEN a Viewer opens a video that was previously watched in the same browser session and the saved position is more than 5 seconds from the start and more than 30 seconds from the end, THE Video_Player SHALL display a "Resume from [MM:SS]" prompt; IF the Viewer dismisses the prompt, THE Video_Player SHALL start from the beginning.
9. WHERE the platform is accessed on a touch-capable device, THE Video_Player SHALL toggle play/pause on a single tap on the video area and SHALL seek forward or backward by 10 seconds on a double-tap on the right or left half of the video area respectively.
10. THE Video_Player SHALL display the video title and Collection name as a text overlay during the first 3 seconds of playback and whenever the Viewer moves the pointer over the player or focuses any player control; the overlay SHALL fade out after 3 seconds of pointer inactivity.

---

### Requirement 5: Adaptive Streaming

**User Story:** As a Viewer, I want video playback to adapt to my network conditions, so that I experience minimal buffering regardless of connection speed.

#### Acceptance Criteria

1. WHEN a video is uploaded and transcoding succeeds, THE Upload_Service SHALL produce at least three HLS renditions: 360p (minimum 500 Kbps), 720p (minimum 2,500 Kbps), and 1080p (minimum 5,000 Kbps), each as a separate `.m3u8` playlist stored in Storage.
2. WHILE a video is playing, THE Video_Player SHALL re-evaluate the Viewer's available bandwidth every 10 seconds and SHALL select the highest rendition whose minimum required bandwidth does not exceed the measured available bandwidth.
3. WHEN a Viewer selects a specific quality level from the quality menu, THE Video_Player SHALL switch to that rendition within 3 seconds, display the selected quality label in the menu, and suspend automatic quality selection for the remainder of that playback session.
4. WHEN the Viewer's measured available bandwidth drops below the minimum required bandwidth for the current rendition, THE Video_Player SHALL switch to the next lower rendition within 3 seconds without a playback stall exceeding 500 milliseconds.
5. IF transcoding of a video fails, THEN THE Upload_Service SHALL retain the original uploaded file in Storage unchanged and SHALL update the Media_Item's `status` in the Metadata_Store to `"processing_failed"`.
6. IF transcoding of a video fails, THEN THE Upload_Service SHALL send an in-platform notification to the Administrator within 60 seconds of the failure, identifying the affected Media_Item by its title and ID.

---

### Requirement 6: Content Organization with Collections

**User Story:** As an Administrator, I want to organize Media_Items into named, hierarchical Collections, so that Viewers can browse content in a structured way.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow the Administrator to create a Collection by providing a name of 1–200 non-whitespace-only characters and an optional description of 0–2,000 characters.
2. WHEN a Collection name is submitted as an empty string or a whitespace-only string, THE Admin_Panel SHALL display a validation error message and SHALL NOT persist the Collection.
3. THE Admin_Panel SHALL allow the Administrator to designate a Collection as a child of another Collection, and SHALL support nesting to a depth of at least 3 levels (root → child → grandchild); attempting to nest beyond the maximum supported depth SHALL display an error message.
4. WHEN the Administrator moves a Media_Item from one Collection to another, THE Admin_Panel SHALL update the Media_Item's Collection membership in the Metadata_Store; IF the target Collection does not exist or the move would create a circular reference, THE Admin_Panel SHALL display an error message and leave the Media_Item's membership unchanged.
5. WHEN the Administrator initiates deletion of a Collection, THE Admin_Panel SHALL display a confirmation dialog that states the Collection name, the count of directly contained Media_Items, and two options: "Delete all contained items" or "Move items to parent Collection"; IF the Collection is a root Collection with no parent, the "Move items to parent" option SHALL be replaced with "Move items to Uncategorized".
6. THE Platform SHALL display top-level Collections to Viewers as horizontally scrollable rows on the browse page, with each row labeled by the Collection name, consistent with the existing AlbumRow layout pattern.

---

### Requirement 7: Content Metadata Management

**User Story:** As an Administrator, I want to rename, re-describe, and re-thumbnail any Media_Item or Collection, so that content metadata stays accurate and presentable.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow the Administrator to edit the title (1–200 characters), description (0–2,000 characters), and Thumbnail (optional) of any Media_Item; submitting a title that is empty or whitespace-only SHALL display a validation error and reject the submission.
2. THE Admin_Panel SHALL allow the Administrator to edit the name (1–200 characters) and description (0–2,000 characters) of any Collection; submitting a name that is empty or whitespace-only SHALL display a validation error and reject the submission.
3. WHEN the Administrator saves updated metadata for a Media_Item or Collection, THE Platform SHALL reflect the changes on all browse and detail views within 5 seconds.
4. WHEN the Administrator uploads a replacement Thumbnail for a Media_Item, THE Upload_Service SHALL accept files whose magic bytes identify them as JPEG, PNG, or WebP and SHALL reject all other formats with an error message identifying the detected format and listing the three accepted formats; files exceeding 50 MB SHALL be rejected with an error message stating the size limit.
5. THE Admin_Panel SHALL allow the Administrator to assign an integer sort rank to each Media_Item within a Collection; Media_Items SHALL be displayed in ascending rank order, with ties broken by most-recently-assigned rank appearing first.
6. WHEN the Administrator submits a title or name field with an empty or whitespace-only value, THE Admin_Panel SHALL display a validation error identifying the field and SHALL NOT persist any changes from that submission.
7. IF saving updated Thumbnail data to Storage fails, THEN THE Admin_Panel SHALL display an error message indicating the Storage failure and SHALL retain the Media_Item's previous Thumbnail.

---

### Requirement 8: Content Deletion

**User Story:** As an Administrator, I want to permanently delete Media_Items and Collections, so that outdated or unwanted content is removed from the platform.

#### Acceptance Criteria

1. WHEN the Administrator initiates deletion of a Media_Item or Collection, THE Admin_Panel SHALL display a confirmation dialog that states the item's name and the message "This action is permanent and cannot be undone" before executing any deletion.
2. WHEN the Administrator confirms deletion of a Media_Item, THE Platform SHALL first remove the Media_Item record from the Metadata_Store, then remove all Collection membership records for that item, then delete the original file and all derived variants (transcoded HLS renditions and Thumbnails) from Storage.
3. IF removing the Media_Item record from the Metadata_Store fails, THEN THE Platform SHALL abort the deletion, leave all data unchanged, and display an error message in the Admin_Panel.
4. IF deletion of a Media_Item's files from Storage fails after the Metadata_Store record has been removed, THEN THE Platform SHALL mark the orphaned Storage objects for deferred cleanup, log the failure, and display an error message in the Admin_Panel indicating that Storage cleanup is pending.
5. WHEN the Administrator confirms deletion of a Collection, THE Platform SHALL remove the Collection record from the Metadata_Store and reassign all directly contained Media_Items to the Collection's parent (or to "Uncategorized" if the Collection is a root); contained Media_Items SHALL NOT be deleted.
6. IF removing a Collection record from the Metadata_Store fails, THEN THE Platform SHALL abort the deletion, leave all data unchanged, and display an error message in the Admin_Panel.

---

### Requirement 9: Administrative Authentication

**User Story:** As an Administrator, I want the Admin_Panel to be protected by authentication, so that only authorized users can manage content and configuration.

#### Acceptance Criteria

1. WHEN an unauthenticated HTTP request is made to any Admin_Panel route, THE Platform SHALL return an HTTP 302 redirect to the login page, regardless of the HTTP method used.
2. WHEN a username and password matching a stored Administrator account are submitted on the login page, THE Platform SHALL issue a signed session token with a maximum lifetime of 24 hours, set it as an HttpOnly cookie, and redirect the Administrator to the Admin_Panel dashboard.
3. WHEN credentials that do not match any stored Administrator account are submitted on the login page, THE Platform SHALL display the message "Invalid credentials" and SHALL NOT indicate whether the username or the password was incorrect.
4. WHEN a session token has expired or is invalid, THE Platform SHALL invalidate the token, clear the session cookie, and redirect the Administrator to the login page.
5. IF an IP address submits 10 or more failed login attempts within any 15-minute rolling window, THEN THE Platform SHALL return an error response for all subsequent login attempts from that IP within the same window, without processing the credentials.
6. WHEN the Administrator explicitly logs out, THE Platform SHALL immediately invalidate the session token in the Metadata_Store, clear the session cookie, and redirect to the login page.

---

### Requirement 10: Persistent Backend and Data Layer

**User Story:** As an Administrator, I want all uploaded content and configuration to persist reliably, so that the platform retains its data across deployments and server restarts.

#### Acceptance Criteria

1. THE Platform SHALL store all Media_Item, Collection, and Branding_Config records in a Metadata_Store (Cloudflare D1) that retains data across Cloudflare Worker restarts and new Worker deployments.
2. THE Platform SHALL store all uploaded files in a Storage service (Cloudflare R2) that retains objects across Cloudflare Worker restarts and new Worker deployments.
3. WHEN the Platform is deployed to a new Worker version, all records previously written to the Metadata_Store and all objects previously written to Storage SHALL remain accessible without any migration step.
4. THE Platform SHALL expose server-side API routes for all create, read, update, and delete operations on Media_Items, Collections, and Branding_Config; each route SHALL return JSON responses with an HTTP status code of 200 for success, 400 for validation errors, 401 for unauthenticated requests, 404 for not-found resources, and 500 for server errors.
5. WHEN an API route receives a request with a missing required field, a field value outside its defined bounds, or an invalid type, THE Platform SHALL return an HTTP 400 response with a JSON body containing an `errors` array where each element identifies the field name and a human-readable description of the violation.

---

### Requirement 11: Responsive and Accessible Frontend

**User Story:** As a Viewer, I want the platform to be usable on any screen size and with assistive technologies, so that the experience is inclusive and consistent.

#### Acceptance Criteria

1. THE Platform SHALL render all pages without horizontal scrolling or content overflow at viewport widths of 320 px, 768 px, 1280 px, and 2560 px, with all text remaining legible and no interactive elements clipped or hidden.
2. THE Video_Player SHALL be fully operable using keyboard navigation alone: all controls SHALL be reachable via sequential Tab presses, each focused control SHALL display a visible focus indicator, and each control SHALL be activatable via Enter or Space.
3. THE Platform SHALL provide a non-empty `aria-label` or `aria-labelledby` attribute on every interactive element (button, link, input) that does not contain visible text.
4. THE Platform SHALL achieve a Lighthouse accessibility score of 90 or above on the home page and the video detail page, measured using Lighthouse in a headless Chromium environment.
5. WHERE a Viewer has enabled the operating system `prefers-reduced-motion` media feature, THE Platform SHALL disable CSS transitions, keyframe animations, and JavaScript-driven animations that are not essential to conveying state changes (e.g., loading spinners and progress bars SHALL remain active; decorative Ken Burns and fade-in effects SHALL be disabled).

---

### Requirement 12: Browse and Discovery

**User Story:** As a Viewer, I want to browse and search for content on the platform, so that I can find videos and images quickly.

#### Acceptance Criteria

1. THE Platform SHALL display Media_Items grouped by Collection in horizontally scrollable rows on the home page, with each row labeled by the Collection name, consistent with the existing AlbumRow layout pattern.
2. THE Platform SHALL display a Thumbnail image for each Media_Item card in browse rows; WHEN no Thumbnail has been assigned to a Media_Item, THE Platform SHALL display a visible placeholder image (not a broken image element) in its place.
3. WHEN a Viewer types a search query of 2 or more characters into the search input, THE Platform SHALL perform a case-insensitive substring match against Media_Item titles and Collection names and display all matching results; under normal conditions results SHALL appear within 300 ms of the last keystroke, and results that arrive after 300 ms SHALL still be displayed upon receipt.
4. WHEN search results are displayed, THE Platform SHALL visually highlight the matching substring within each result label using a distinct background or text color, without altering the surrounding non-matching characters.
5. WHEN a Viewer's pointer has hovered continuously over a Media_Item card for 500 ms or more, THE Platform SHALL display an overlay on that card showing the item's title, the Collection name, and — for video Media_Items — the duration formatted as MM:SS.
