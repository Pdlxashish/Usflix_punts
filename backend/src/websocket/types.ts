/**
 * WebSocket Event Types for Real-Time Sync
 */

export type WebSocketEventType =
  | "partner:online"
  | "partner:offline"
  | "message:new"
  | "drawing:stroke"
  | "drawing:clear"
  | "activity:completed"
  | "location:update"
  | "location:settings_changed"
  | "album:new_media"
  | "canvas:updated"
  | "bucketlist:updated"
  | "bucketlist:toggled"
  | "bucketlist:added"
  | "bucketlist:deleted";

export interface BaseWebSocketEvent {
  type: WebSocketEventType;
  timestamp: string;
}

// Partner Events
export interface PartnerOnlineEvent extends BaseWebSocketEvent {
  type: "partner:online";
  data: {
    partnerId: number;
    partnerName: string;
  };
}

export interface PartnerOfflineEvent extends BaseWebSocketEvent {
  type: "partner:offline";
  data: {
    partnerId: number;
  };
}

// Message Events
export interface MessageNewEvent extends BaseWebSocketEvent {
  type: "message:new";
  data: {
    messageId: string;
    senderId: number;
    senderName: string;
    text: string;
    createdAt: string;
  };
}

// Drawing Events
export interface DrawingStrokeEvent extends BaseWebSocketEvent {
  type: "drawing:stroke";
  data: {
    strokeId: string;
    userId: number;
    points: Array<{ x: number; y: number }>;
    color: string;
    width: number;
  };
}

export interface DrawingClearEvent extends BaseWebSocketEvent {
  type: "drawing:clear";
  data: {
    userId: number;
  };
}

// Activity Events
export interface ActivityCompletedEvent extends BaseWebSocketEvent {
  type: "activity:completed";
  data: {
    userId: number;
    userName: string;
    activityType: string;
    date: string;
    bothCompleted: boolean;
  };
}

// Location Events
export interface LocationUpdateEvent extends BaseWebSocketEvent {
  type: "location:update";
  data: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    timestamp: string;
  };
}

export interface LocationSettingsChangedEvent extends BaseWebSocketEvent {
  type: "location:settings_changed";
  data: {
    enabled: boolean;
  };
}

export interface CanvasUpdatedEvent extends BaseWebSocketEvent {
  type: "canvas:updated";
  data: {
    drawingData: string;
    userId: number;
  };
}

// Album Events
export interface AlbumNewMediaEvent extends BaseWebSocketEvent {
  type: "album:new_media";
  data: {
    mediaId: string;
    uploaderId: number;
    uploaderName: string;
    type: "photo" | "video";
    thumbnailUrl: string;
  };
}

// Bucket List Events
export interface BucketListToggledEvent extends BaseWebSocketEvent {
  type: "bucketlist:toggled";
  data: {
    id: string;
    completed: boolean;
    completedAt: string | null;
    userId: number;
  };
}

export interface BucketListAddedEvent extends BaseWebSocketEvent {
  type: "bucketlist:added";
  data: {
    id: string;
    item: string;
    emoji: string;
    completed: boolean;
    sortRank: number;
    userId: number;
  };
}

export interface BucketListUpdatedEvent extends BaseWebSocketEvent {
  type: "bucketlist:updated";
  data: {
    id: string;
    item: string;
    emoji: string;
    sortRank: number;
    userId: number;
  };
}

export interface BucketListDeletedEvent extends BaseWebSocketEvent {
  type: "bucketlist:deleted";
  data: {
    id: string;
    userId: number;
  };
}

export type WebSocketEvent =
  | PartnerOnlineEvent
  | PartnerOfflineEvent
  | MessageNewEvent
  | DrawingStrokeEvent
  | DrawingClearEvent
  | ActivityCompletedEvent
  | LocationUpdateEvent
  | LocationSettingsChangedEvent
  | AlbumNewMediaEvent
  | CanvasUpdatedEvent
  | BucketListToggledEvent
  | BucketListAddedEvent
  | BucketListUpdatedEvent
  | BucketListDeletedEvent;

/**
 * Client information stored for each WebSocket connection
 */
export interface WebSocketClient {
  userId: number;
  coupleId: string | null;
  connectedAt: Date;
  lastPing: Date;
}
