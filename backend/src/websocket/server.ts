/**
 * WebSocket Server for Real-Time Sync
 * Handles partner connections, authentication, and event broadcasting.
 */
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage, Server } from "http";
import { parse } from "url";
import { verifyToken } from "@clerk/backend";
import { resolveInternalUser } from "../middleware/auth.js";
import { getCoupleId } from "../services/partner-linking.js";
import { WebSocketClient, WebSocketEvent } from "./types.js";

// Map of userId -> WebSocket connections
const clients = new Map<number, Set<WebSocket>>();

// Map of WebSocket -> client info
const clientInfo = new Map<WebSocket, WebSocketClient>();

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade requests
  server.on("upgrade", async (request: IncomingMessage, socket, head) => {
    try {
      const { pathname, query } = parse(request.url || "", true);

      if (pathname !== "/ws") {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
      }

      // Extract token from query param or header
      const token =
        (query.token as string) ||
        request.headers.authorization?.replace("Bearer ", "") ||
        null;

      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      // Verify Clerk token
      const secretKey = process.env.CLERK_SECRET_KEY;
      if (!secretKey) {
        throw new Error("CLERK_SECRET_KEY not configured");
      }

      const payload = await verifyToken(token, { secretKey });
      const clerkId = payload.sub;

      if (!clerkId) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      // Resolve internal user ID
      const userId = await resolveInternalUser(clerkId);

      // Get couple_id
      const coupleId = await getCoupleId(userId);

      // Upgrade connection
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, {
          userId,
          coupleId,
          connectedAt: new Date(),
          lastPing: new Date(),
        });
      });
    } catch (error) {
      console.error("WebSocket upgrade error:", error);
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  });

  // Handle new connections
  wss.on("connection", (ws: WebSocket, clientData: WebSocketClient) => {
    const userId = clientData.userId;

    console.log(`WebSocket connected: userId=${userId}, coupleId=${clientData.coupleId}`);

    // Store client info
    clientInfo.set(ws, clientData);

    // Add to clients map
    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }
    clients.get(userId)!.add(ws);

    // Send partner:online event to partner if linked
    if (clientData.coupleId) {
      broadcastToCouple(clientData.coupleId, userId, {
        type: "partner:online",
        data: {
          partnerId: userId,
          partnerName: "Partner", // TODO: Get actual name
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Handle incoming messages
    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(ws, message);
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    });

    // Handle pong responses
    ws.on("pong", () => {
      const info = clientInfo.get(ws);
      if (info) {
        info.lastPing = new Date();
      }
    });

    // Handle disconnection
    ws.on("close", () => {
      const info = clientInfo.get(ws);
      if (info) {
        console.log(`WebSocket disconnected: userId=${info.userId}`);

        // Remove from clients map
        const userConnections = clients.get(info.userId);
        if (userConnections) {
          userConnections.delete(ws);
          if (userConnections.size === 0) {
            clients.delete(info.userId);

            // Send partner:offline event if this was the last connection
            if (info.coupleId) {
              broadcastToCouple(info.coupleId, info.userId, {
                type: "partner:offline",
                data: {
                  partnerId: info.userId,
                },
                timestamp: new Date().toISOString(),
              });
            }
          }
        }

        clientInfo.delete(ws);
      }
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // Heartbeat interval
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const info = clientInfo.get(ws);
      if (!info) return;

      const timeSinceLastPing = Date.now() - info.lastPing.getTime();

      // Terminate stale connections (no pong for 60 seconds)
      if (timeSinceLastPing > 60000) {
        console.log(`Terminating stale WebSocket: userId=${info.userId}`);
        ws.terminate();
        return;
      }

      // Send ping
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }, 30000); // Every 30 seconds

  // Cleanup on server close
  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

/**
 * Handle messages from client
 */
function handleClientMessage(ws: WebSocket, message: any) {
  // Currently, most events are triggered by API calls, not client messages
  // This can be extended for client-initiated events like typing indicators
  console.log("Received client message:", message);
}

/**
 * Broadcast event to a specific user
 */
export function broadcastToUser(userId: number, event: WebSocketEvent) {
  const userConnections = clients.get(userId);
  if (!userConnections) return;

  const message = JSON.stringify(event);

  userConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

/**
 * Broadcast event to partner (excluding sender)
 */
export function broadcastToPartner(coupleId: string, senderId: number, event: WebSocketEvent) {
  console.log(`[WS BROADCAST] broadcastToPartner called - coupleId=${coupleId}, senderId=${senderId}, eventType=${event.type}`);
  
  const message = JSON.stringify(event);
  let partnerCount = 0;
  let sentCount = 0;

  // Find all connections for this couple, excluding sender
  clientInfo.forEach((info, ws) => {
    if (info.coupleId === coupleId && info.userId !== senderId) {
      partnerCount++;
      console.log(`[WS BROADCAST] Found partner connection - userId=${info.userId}, readyState=${ws.readyState}`);
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sentCount++;
        console.log(`[WS BROADCAST] ✅ Message sent to partner userId=${info.userId}`);
      } else {
        console.warn(`[WS BROADCAST] ⚠️ WebSocket not open for userId=${info.userId}, readyState=${ws.readyState}`);
      }
    }
  });
  
  console.log(`[WS BROADCAST] Summary - Found ${partnerCount} partner connections, sent to ${sentCount}`);
  
  if (partnerCount === 0) {
    console.warn(`[WS BROADCAST] ⚠️ No partner connections found for coupleId=${coupleId}, senderId=${senderId}`);
    console.log(`[WS BROADCAST] Active connections:`, Array.from(clientInfo.values()).map(info => ({
      userId: info.userId,
      coupleId: info.coupleId
    })));
  }
}

/**
 * Broadcast event to entire couple (including sender)
 */
export function broadcastToCouple(
  coupleId: string,
  excludeUserId: number | null,
  event: WebSocketEvent
) {
  const message = JSON.stringify(event);

  clientInfo.forEach((info, ws) => {
    if (info.coupleId === coupleId && info.userId !== excludeUserId) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  });
}

/**
 * Get online status for a couple
 */
export function getCoupleOnlineStatus(coupleId: string): {
  userAOnline: boolean;
  userBOnline: boolean;
} {
  const onlineUsers = new Set<number>();

  clientInfo.forEach((info) => {
    if (info.coupleId === coupleId) {
      onlineUsers.add(info.userId);
    }
  });

  // TODO: Determine which user is A and which is B
  // For now, just return whether anyone is online
  return {
    userAOnline: onlineUsers.size > 0,
    userBOnline: onlineUsers.size > 1,
  };
}

/**
 * Check if a user is online
 */
export function isUserOnline(userId: number): boolean {
  return clients.has(userId) && clients.get(userId)!.size > 0;
}
