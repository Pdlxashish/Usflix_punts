/**
 * WebSocket Broadcasting Utilities
 * Convenience functions for broadcasting specific event types.
 */
import { broadcastToPartner, broadcastToUser } from "./server.js";
import {
  MessageNewEvent,
  DrawingStrokeEvent,
  DrawingClearEvent,
  ActivityCompletedEvent,
  LocationUpdateEvent,
  AlbumNewMediaEvent,
  BucketListToggledEvent,
  BucketListAddedEvent,
  BucketListUpdatedEvent,
  BucketListDeletedEvent,
} from "./types.js";

/**
 * Broadcast a new message to partner
 */
export function broadcastNewMessage(
  coupleId: string,
  senderId: number,
  message: {
    messageId: string;
    senderName: string;
    text: string;
    createdAt: string;
  }
) {
  const event: MessageNewEvent = {
    type: "message:new",
    data: {
      messageId: message.messageId,
      senderId,
      senderName: message.senderName,
      text: message.text,
      createdAt: message.createdAt,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToPartner(coupleId, senderId, event);
}

/**
 * Broadcast a drawing stroke to partner
 */
export function broadcastDrawingStroke(
  coupleId: string,
  senderId: number,
  stroke: {
    strokeId: string;
    points: Array<{ x: number; y: number }>;
    color: string;
    width: number;
  }
) {
  const event: DrawingStrokeEvent = {
    type: "drawing:stroke",
    data: {
      ...stroke,
      userId: senderId,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToPartner(coupleId, senderId, event);
}

/**
 * Broadcast canvas clear to partner
 */
export function broadcastCanvasClear(coupleId: string, senderId: number) {
  const event: DrawingClearEvent = {
    type: "drawing:clear",
    data: {
      userId: senderId,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToPartner(coupleId, senderId, event);
}

/**
 * Broadcast activity completion to partner
 */
export function broadcastActivityCompleted(
  coupleId: string,
  senderId: number,
  activity: {
    userName: string;
    activityType: string;
    date: string;
    bothCompleted: boolean;
  }
) {
  const event: ActivityCompletedEvent = {
    type: "activity:completed",
    data: {
      userId: senderId,
      ...activity,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToPartner(coupleId, senderId, event);
}

/**
 * Broadcast location update to partner
 */
export function broadcastLocationUpdate(
  coupleId: string,
  senderId: number,
  location: {
    latitude: number;
    longitude: number;
    timestamp: string;
  }
) {
  const event: LocationUpdateEvent = {
    type: "location:update",
    data: {
      userId: senderId,
      ...location,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToPartner(coupleId, senderId, event);
}

/**
 * Broadcast new media upload to partner
 */
export function broadcastNewMedia(
  coupleId: string,
  uploaderId: number,
  media: {
    mediaId: string;
    uploaderName: string;
    type: "photo" | "video";
    thumbnailUrl: string;
  }
) {
  const event: AlbumNewMediaEvent = {
    type: "album:new_media",
    data: {
      ...media,
      uploaderId,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToPartner(coupleId, uploaderId, event);
}

/**
 * Broadcast bucket list item toggled to partner
 */
export function broadcastBucketListToggled(
  coupleId: string,
  userId: number,
  item: {
    id: string;
    completed: boolean;
    completedAt: string | null;
  }
) {
  const event: BucketListToggledEvent = {
    type: "bucketlist:toggled",
    data: {
      ...item,
      userId,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToPartner(coupleId, userId, event);
}

/**
 * Broadcast new bucket list item to partner
 */
export function broadcastBucketListAdded(
  coupleId: string,
  userId: number,
  item: {
    id: string;
    item: string;
    emoji: string;
    completed: boolean;
    sortRank: number;
  }
) {
  const event: BucketListAddedEvent = {
    type: "bucketlist:added",
    data: {
      ...item,
      userId,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToPartner(coupleId, userId, event);
}

/**
 * Broadcast bucket list item updated to partner
 */
export function broadcastBucketListUpdated(
  coupleId: string,
  userId: number,
  item: {
    id: string;
    item: string;
    emoji: string;
    sortRank: number;
  }
) {
  const event: BucketListUpdatedEvent = {
    type: "bucketlist:updated",
    data: {
      ...item,
      userId,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToPartner(coupleId, userId, event);
}

/**
 * Broadcast bucket list item deleted to partner
 */
export function broadcastBucketListDeleted(
  coupleId: string,
  userId: number,
  itemId: string
) {
  const event: BucketListDeletedEvent = {
    type: "bucketlist:deleted",
    data: {
      id: itemId,
      userId,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToPartner(coupleId, userId, event);
}

/**
 * Broadcast canvas update to partner
 */
export function broadcastCanvasUpdate(
  coupleId: string,
  userId: number,
  canvas: {
    drawingData: string;
  }
) {
  const event = {
    type: "canvas:updated",
    data: {
      ...canvas,
      userId,
    },
    timestamp: new Date().toISOString(),
  };

  console.log(`[WS BROADCAST] Broadcasting canvas update - coupleId=${coupleId}, userId=${userId}`);
  broadcastToPartner(coupleId, userId, event);
}
