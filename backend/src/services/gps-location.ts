/**
 * GPS Location Service
 * Handles storing and retrieving GPS locations for linked partners.
 */
import pool from "../db/connection.js";
import { broadcastToPartner } from "../websocket/server.js";

interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: Date;
}

interface LocationResult {
  ok: boolean;
  error?: string;
}

interface PartnerLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: Date;
  isRecent: boolean; // < 10 minutes
  minutesAgo: number;
}

interface PartnerLocationResult {
  ok: boolean;
  location?: PartnerLocation;
  error?: string;
}

interface LocationSettings {
  ok: boolean;
  enabled?: boolean;
  error?: string;
}

/**
 * Validate GPS coordinates
 */
function validateCoordinates(latitude: number, longitude: number): string | null {
  if (typeof latitude !== "number" || isNaN(latitude)) {
    return "Latitude must be a valid number";
  }
  if (typeof longitude !== "number" || isNaN(longitude)) {
    return "Longitude must be a valid number";
  }
  if (latitude < -90 || latitude > 90) {
    return "Latitude must be between -90 and 90";
  }
  if (longitude < -180 || longitude > 180) {
    return "Longitude must be between -180 and 180";
  }
  return null;
}

async function getUserCoupleId(userId: number): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT couple_id FROM profiles WHERE user_id = $1 AND is_primary = true LIMIT 1`,
    [userId]
  );
  return rows[0]?.couple_id ?? null;
}

/**
 * Store a location update from the user
 */
export async function storeLocationUpdate(
  userId: number,
  location: LocationUpdate
): Promise<LocationResult> {
  try {
    // Validate coordinates
    const validationError = validateCoordinates(location.latitude, location.longitude);
    if (validationError) {
      return { ok: false, error: validationError };
    }

    // Get user's couple_id
    const userResult = await pool.query(
      `SELECT couple_id FROM profiles WHERE user_id = $1 AND is_primary = true LIMIT 1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return { ok: false, error: "User profile not found" };
    }

    const coupleId = userResult.rows[0].couple_id;

    if (!coupleId) {
      return { ok: false, error: "User is not linked to a partner" };
    }

    // Check if location sharing is enabled for this user
    const settingsResult = await pool.query(
      `SELECT location_sharing_enabled FROM profiles WHERE user_id = $1 AND is_primary = true`,
      [userId]
    );

    if (settingsResult.rows[0]?.location_sharing_enabled === false) {
      return { ok: false, error: "Location sharing is disabled" };
    }

    // Store location update
    const timestamp = location.timestamp || new Date();
    await pool.query(
      `INSERT INTO location_updates (user_id, couple_id, latitude, longitude, accuracy, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, coupleId, location.latitude, location.longitude, location.accuracy || null, timestamp]
    );

    // Broadcast to partner via WebSocket
    broadcastToPartner(coupleId, userId, {
      type: "location:update",
      data: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || null,
        timestamp: timestamp.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

    return { ok: true };
  } catch (error) {
    console.error("Store location update error:", error);
    return { ok: false, error: "Failed to store location update" };
  }
}

/**
 * Get partner's latest location
 */
export async function getPartnerLocation(userId: number): Promise<PartnerLocationResult> {
  try {
    // Get user's couple_id
    const userResult = await pool.query(
      `SELECT couple_id FROM profiles WHERE user_id = $1 AND is_primary = true LIMIT 1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return { ok: false, error: "User profile not found" };
    }

    const coupleId = userResult.rows[0].couple_id;

    if (!coupleId) {
      return { ok: false, error: "User is not linked to a partner" };
    }

    // Get partner's user_id
    const partnerResult = await pool.query(
      `SELECT user_a_id, user_b_id FROM partner_links WHERE couple_id = $1`,
      [coupleId]
    );

    if (partnerResult.rows.length === 0) {
      return { ok: false, error: "Partner link not found" };
    }

    const link = partnerResult.rows[0];
    const partnerId = link.user_a_id === userId ? link.user_b_id : link.user_a_id;

    // Check if partner has location sharing enabled
    const settingsResult = await pool.query(
      `SELECT location_sharing_enabled FROM profiles WHERE user_id = $1 AND is_primary = true`,
      [partnerId]
    );

    if (settingsResult.rows[0]?.location_sharing_enabled === false) {
      return { ok: false, error: "Partner has disabled location sharing" };
    }

    // Get partner's latest location
    const locationResult = await pool.query(
      `SELECT latitude, longitude, accuracy, timestamp
       FROM location_updates
       WHERE user_id = $1 AND couple_id = $2
       ORDER BY timestamp DESC
       LIMIT 1`,
      [partnerId, coupleId]
    );

    if (locationResult.rows.length === 0) {
      return { ok: false, error: "No location data available for partner" };
    }

    const loc = locationResult.rows[0];
    const timestamp = new Date(loc.timestamp);
    const now = new Date();
    const minutesAgo = Math.floor((now.getTime() - timestamp.getTime()) / 60000);
    const isRecent = minutesAgo < 10;

    return {
      ok: true,
      location: {
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        accuracy: loc.accuracy ? parseFloat(loc.accuracy) : null,
        timestamp,
        isRecent,
        minutesAgo,
      },
    };
  } catch (error) {
    console.error("Get partner location error:", error);
    return { ok: false, error: "Failed to retrieve partner location" };
  }
}

/**
 * Update location sharing settings
 */
export async function updateLocationSettings(
  userId: number,
  enabled: boolean
): Promise<LocationSettings> {
  try {
    await pool.query(
      `UPDATE profiles
       SET location_sharing_enabled = $1
       WHERE user_id = $2 AND is_primary = true`,
      [enabled, userId]
    );

    // Broadcast settings change to partner
    const coupleId = await getUserCoupleId(userId);
    if (coupleId) {
      broadcastToPartner(coupleId, userId, {
        type: "location:settings_changed",
        data: {
          enabled,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return { ok: true, enabled };
  } catch (error) {
    console.error("Update location settings error:", error);
    return { ok: false, error: "Failed to update location settings" };
  }
}

/**
 * Get location sharing settings
 */
export async function getLocationSettings(userId: number): Promise<LocationSettings> {
  try {
    const result = await pool.query(
      `SELECT location_sharing_enabled FROM profiles WHERE user_id = $1 AND is_primary = true LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { ok: false, error: "User profile not found" };
    }

    return {
      ok: true,
      enabled: result.rows[0].location_sharing_enabled ?? true, // Default to true
    };
  } catch (error) {
    console.error("Get location settings error:", error);
    return { ok: false, error: "Failed to retrieve location settings" };
  }
}
