/**
 * GPS Location API Routes
 * Real-time location sharing between linked partners.
 */
import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { requireUserAuth } from "../middleware/userAuth.js";
import { getRequestUserId } from "../utils/tenant.js";
import {
  storeLocationUpdate,
  getPartnerLocation,
  updateLocationSettings,
  getLocationSettings,
} from "../services/gps-location.js";
import { calculateDistance, formatDistance, calculateBearing, getCompassDirection } from "../utils/distance.js";

const router = Router();

// Rate limiter: max 1 location update per minute per user
const locationUpdateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1,
  message: { ok: false, error: "Too many location updates. Please wait 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.DISABLE_RATE_LIMIT === "true",
});

/**
 * POST /api/location/update
 * Update user's current GPS location
 */
router.post(
  "/update",
  requireUserAuth,
  locationUpdateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = getRequestUserId(req)!;
      const { latitude, longitude, accuracy } = req.body;

      // Validate required fields
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        res.status(400).json({
          ok: false,
          error: "Latitude and longitude are required as numbers",
        });
        return;
      }

      // Optional accuracy validation
      if (accuracy !== undefined && (typeof accuracy !== "number" || accuracy < 0)) {
        res.status(400).json({
          ok: false,
          error: "Accuracy must be a non-negative number",
        });
        return;
      }

      const result = await storeLocationUpdate(userId, {
        latitude,
        longitude,
        accuracy,
        timestamp: new Date(),
      });

      if (result.ok) {
        res.json({ ok: true });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Location update error:", error);
      res.status(500).json({ ok: false, error: "Failed to update location" });
    }
  }
);

/**
 * GET /api/location/partner
 * Get partner's latest location with distance calculation
 */
router.get("/partner", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const includeDistance = req.query.includeDistance === "true";

    const result = await getPartnerLocation(userId);

    if (!result.ok || !result.location) {
      res.status(404).json({
        ok: false,
        error: result.error || "Location not found",
      });
      return;
    }

    // Calculate distance if requested and user's location is provided
    let distance = null;
    let bearing = null;
    let direction = null;

    if (includeDistance) {
      const userLat = parseFloat(req.query.userLat as string);
      const userLon = parseFloat(req.query.userLon as string);

      if (!isNaN(userLat) && !isNaN(userLon)) {
        const distanceData = calculateDistance(
          { latitude: userLat, longitude: userLon },
          { latitude: result.location.latitude, longitude: result.location.longitude }
        );

        const bearingDegrees = calculateBearing(
          { latitude: userLat, longitude: userLon },
          { latitude: result.location.latitude, longitude: result.location.longitude }
        );

        distance = {
          kilometers: distanceData.kilometers,
          miles: distanceData.miles,
          meters: distanceData.meters,
          formatted: formatDistance(distanceData, "km"),
          formattedMiles: formatDistance(distanceData, "mi"),
        };

        bearing = bearingDegrees;
        direction = getCompassDirection(bearingDegrees);
      }
    }

    res.json({
      ok: true,
      location: result.location,
      distance,
      bearing,
      direction,
    });
  } catch (error) {
    console.error("Get partner location error:", error);
    res.status(500).json({ ok: false, error: "Failed to retrieve partner location" });
  }
});

/**
 * PUT /api/location/settings
 * Enable or disable location sharing
 */
router.put("/settings", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      res.status(400).json({
        ok: false,
        error: "Enabled must be a boolean value",
      });
      return;
    }

    const result = await updateLocationSettings(userId, enabled);

    if (result.ok) {
      res.json({ ok: true, enabled: result.enabled });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Update location settings error:", error);
    res.status(500).json({ ok: false, error: "Failed to update location settings" });
  }
});

/**
 * GET /api/location/settings
 * Get current location sharing settings
 */
router.get("/settings", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const result = await getLocationSettings(userId);

    if (result.ok) {
      res.json({ ok: true, enabled: result.enabled });
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Get location settings error:", error);
    res.status(500).json({ ok: false, error: "Failed to retrieve location settings" });
  }
});

export default router;
