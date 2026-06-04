/**
 * Partner location — share GPS from devices, distance between profiles.
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { canonicalPair, formatDistance, haversineKm } from "../utils/geo.js";
import { logActivity } from "../services/activity.js";

const router = Router();

const CLOSER_NOTIFY_KM = 5;
const NEARBY_THRESHOLD_KM = 5;

function getPartnerProfileIds(): string[] {
  const raw = process.env.PARTNER_PROFILE_IDS || "p1,p2";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function isValidCoord(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * POST /api/location
 * Body: { profileId, latitude, longitude, accuracy?, clientId?, city? }
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { profileId, latitude, longitude, accuracy, clientId, city, source } = req.body;

    if (!profileId || typeof profileId !== "string") {
      res.status(400).json({ ok: false, error: "profileId is required." });
      return;
    }

    if (!isValidCoord(latitude, longitude)) {
      res.status(400).json({ ok: false, error: "Valid latitude and longitude are required." });
      return;
    }

    const { rows: profileRows } = await pool.query(
      "SELECT id FROM profiles WHERE id = $1",
      [profileId]
    );
    if (profileRows.length === 0) {
      res.status(400).json({ ok: false, error: "Unknown profile." });
      return;
    }

    await pool.query(
      `INSERT INTO profile_locations (profile_id, client_id, latitude, longitude, accuracy, city, source, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (profile_id)
       DO UPDATE SET
         client_id = EXCLUDED.client_id,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         accuracy = EXCLUDED.accuracy,
         city = COALESCE(EXCLUDED.city, profile_locations.city),
         source = EXCLUDED.source,
         updated_at = NOW()`,
      [
        profileId,
        typeof clientId === "string" ? clientId.slice(0, 64) : null,
        latitude,
        longitude,
        typeof accuracy === "number" ? accuracy : null,
        typeof city === "string" ? city.slice(0, 200) : null,
        source === "network" ? "network" : "gps",
      ]
    );

    await logActivity(req, {
      action: "location_shared",
      profileId,
      clientId: typeof clientId === "string" ? clientId : null,
      details: { latitude, longitude, city: city ?? null },
    }).catch(() => {});

    res.json({ ok: true });
  } catch (error) {
    console.error("Location update error:", error);
    res.status(500).json({ ok: false, error: "Failed to save location" });
  }
});

/**
 * GET /api/location/status
 * Distance between partner profiles + notification flags.
 */
router.get("/status", async (_req: Request, res: Response) => {
  try {
    const partnerIds = getPartnerProfileIds();
    if (partnerIds.length < 2) {
      res.json({
        ok: true,
        partners: [],
        distanceKm: null,
        formatted: null,
        notifyCloser: false,
        nearby: false,
        notifyNearby: false,
      });
      return;
    }

    const [idA, idB] = partnerIds.slice(0, 2);
    const [canonA, canonB] = canonicalPair(idA, idB);

    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.color, pl.latitude, pl.longitude, pl.city, pl.updated_at, pl.accuracy, pl.source
       FROM profiles p
       LEFT JOIN profile_locations pl ON pl.profile_id = p.id
       WHERE p.id = ANY($1)`,
      [[idA, idB]]
    );

    const partners = rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      latitude: r.latitude != null ? Number(r.latitude) : null,
      longitude: r.longitude != null ? Number(r.longitude) : null,
      city: r.city,
      accuracy: r.accuracy != null ? Number(r.accuracy) : null,
      updatedAt: r.updated_at,
      hasLocation: r.latitude != null && r.longitude != null,
      source: r.source === "network" ? "network" : r.source === "gps" ? "gps" : null,
    }));

    const locA = partners.find((p) => p.id === idA);
    const locB = partners.find((p) => p.id === idB);

    if (
      !locA?.hasLocation ||
      !locB?.hasLocation ||
      locA.latitude == null ||
      locA.longitude == null ||
      locB.latitude == null ||
      locB.longitude == null
    ) {
      res.json({
        ok: true,
        partners,
        distanceKm: null,
        formatted: null,
        notifyCloser: false,
        closerByKm: 0,
        nearby: false,
        notifyNearby: false,
        partnerIds: [idA, idB],
      });
      return;
    }

    const distanceKm = haversineKm(
      locA.latitude,
      locA.longitude,
      locB.latitude,
      locB.longitude
    );

    const { rows: snapRows } = await pool.query(
      `SELECT distance_km, notify_baseline_km FROM distance_snapshots
       WHERE profile_a = $1 AND profile_b = $2`,
      [canonA, canonB]
    );

    let notifyCloser = false;
    let closerByKm = 0;
    const previousDistanceKm: number | null = snapRows[0]?.distance_km ?? null;
    let baseline = snapRows[0]?.notify_baseline_km ?? distanceKm;

    const nearby = distanceKm <= NEARBY_THRESHOLD_KM;
    const wasNearby =
      previousDistanceKm != null && previousDistanceKm <= NEARBY_THRESHOLD_KM;
    const notifyNearby = nearby && !wasNearby;

    if (distanceKm > baseline) {
      baseline = distanceKm;
    } else if (baseline - distanceKm >= CLOSER_NOTIFY_KM) {
      notifyCloser = true;
      closerByKm = Math.round((baseline - distanceKm) * 10) / 10;
      baseline = distanceKm;
    }

    await pool.query(
      `INSERT INTO distance_snapshots (profile_a, profile_b, distance_km, notify_baseline_km, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (profile_a, profile_b)
       DO UPDATE SET distance_km = $3, notify_baseline_km = $4, updated_at = NOW()`,
      [canonA, canonB, distanceKm, baseline]
    );

    res.json({
      ok: true,
      partners,
      distanceKm,
      formatted: formatDistance(distanceKm),
      previousDistanceKm,
      notifyCloser,
      closerByKm,
      nearby,
      notifyNearby,
      partnerIds: [idA, idB],
      notifyThresholdKm: NEARBY_THRESHOLD_KM,
    });
  } catch (error) {
    console.error("Location status error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch location status" });
  }
});

export default router;
