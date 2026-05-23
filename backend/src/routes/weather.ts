/**
 * Weather routes — Manage weather locations for partners
 * GET /api/weather/current       — public, get current weather for all locations
 * GET /api/weather/locations     — admin only, get all saved locations
 * POST /api/weather/locations    — admin only, add location
 * PUT /api/weather/locations/:id — admin only, update location
 * PATCH /api/weather/locations/:id/set-primary — admin only, set as primary
 * DELETE /api/weather/locations/:id — admin only, delete location
 */
import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function migrationError(err: any): string | undefined {
  if (err.code === "42P01") return "Database table missing. Restart backend to create tables.";
  if (err.code === "42703") return "Database column missing. Restart backend to run migrations.";
  return undefined;
}

function mapRow(r: any) {
  return {
    id: r.id,
    profileId: r.profile_id,
    locationName: r.location_name,
    latitude: r.latitude,
    longitude: r.longitude,
    isPrimary: r.is_primary,
    createdAt: r.created_at,
  };
}

// Fetch weather from OpenWeatherMap API
async function fetchWeatherData(lat: number, lon: number) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  // If no API key, return mock data
  if (!apiKey) {
    return {
      temp: 22,
      feelsLike: 21,
      description: "Clear sky",
      icon: "01d",
      humidity: 65,
      windSpeed: 3.5,
      isMock: true,
    };
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error("Weather API request failed");
    }
    
    const data = await response.json() as {
      main: { temp: number; feels_like: number; humidity: number };
      weather: Array<{ description: string; icon: string }>;
      wind: { speed: number };
    };
    
    return {
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      isMock: false,
    };
  } catch (error) {
    console.error("Weather API error:", error);
    // Return mock data on error
    return {
      temp: 22,
      feelsLike: 21,
      description: "Clear sky",
      icon: "01d",
      humidity: 65,
      windSpeed: 3.5,
      isMock: true,
    };
  }
}

/**
 * POST /api/weather/auto-location
 * Public — called by each partner's browser to upsert their GPS-based weather location.
 * Body: { profileId, profileName, latitude, longitude, locationName }
 */
router.post("/auto-location", async (req: Request, res: Response) => {
  try {
    const { profileId, profileName, latitude, longitude, locationName } = req.body;

    if (!profileId || typeof profileId !== "string") {
      res.status(400).json({ ok: false, error: "profileId is required" });
      return;
    }
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      res.status(400).json({ ok: false, error: "Valid latitude and longitude are required" });
      return;
    }

    // Verify profile exists
    const { rows: profileRows } = await pool.query(
      "SELECT id FROM profiles WHERE id = $1",
      [profileId]
    );
    if (profileRows.length === 0) {
      res.status(400).json({ ok: false, error: "Unknown profile" });
      return;
    }

    const name = (typeof locationName === "string" && locationName.trim())
      ? locationName.trim()
      : (typeof profileName === "string" && profileName.trim())
        ? profileName.trim()
        : "My Location";

    const { rows: primaryRows } = await pool.query(
      "SELECT id FROM weather_locations WHERE is_primary = true LIMIT 1"
    );
    const isPrimary = primaryRows.length === 0;
    const id = randomUUID();

    await pool.query(
      `INSERT INTO weather_locations (id, profile_id, location_name, latitude, longitude, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (profile_id) WHERE profile_id IS NOT NULL
       DO UPDATE SET
         location_name = EXCLUDED.location_name,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude`,
      [id, profileId, name, latitude, longitude, isPrimary]
    );

    res.json({ ok: true });
  } catch (err: any) {
    console.error("weather auto-location POST error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to update location" });
  }
});

/** GET /api/weather/current */
router.get("/current", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (profile_id) *
       FROM weather_locations
       WHERE profile_id IS NOT NULL
       ORDER BY profile_id, is_primary DESC, created_at DESC`
    );
    const { rows: unassigned } = await pool.query(
      `SELECT * FROM weather_locations WHERE profile_id IS NULL ORDER BY created_at ASC`
    );
    const allRows = [...rows, ...unassigned].sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    if (allRows.length === 0) {
      res.json([]);
      return;
    }

    // Fetch weather for all locations
    const weatherPromises = allRows.map(async (row) => {
      const location = mapRow(row);
      const weather = await fetchWeatherData(location.latitude, location.longitude);
      return {
        ...location,
        weather,
      };
    });

    const weatherData = await Promise.all(weatherPromises);
    res.json(weatherData);
  } catch (err: any) {
    console.error("weather current GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch weather" });
  }
});

/** GET /api/weather/locations */
router.get("/locations", requireAuth, async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM weather_locations ORDER BY is_primary DESC, created_at ASC"
    );
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("weather locations GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch locations" });
  }
});

/** POST /api/weather/locations */
router.post("/locations", requireAuth, async (req: Request, res: Response) => {
  try {
    const { profileId, locationName, latitude, longitude } = req.body;
    
    if (!locationName?.trim()) {
      res.status(400).json({ ok: false, error: "Location name is required" });
      return;
    }
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      res.status(400).json({ ok: false, error: "Valid latitude and longitude are required" });
      return;
    }

    if (profileId) {
      const { rows: existing } = await pool.query(
        "SELECT id FROM weather_locations WHERE profile_id = $1",
        [profileId]
      );
      if (existing.length > 0) {
        res.status(409).json({
          ok: false,
          error: "This profile already has a weather location. Edit the existing one instead.",
        });
        return;
      }
    }

    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO weather_locations (id, profile_id, location_name, latitude, longitude, is_primary)
       VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
      [id, profileId || null, locationName.trim(), latitude, longitude]
    );

    res.status(201).json({ ok: true, location: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("weather locations POST error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to add location" });
  }
});

/** PUT /api/weather/locations/:id */
router.put("/locations/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { profileId, locationName, latitude, longitude } = req.body;
    
    if (!locationName?.trim()) {
      res.status(400).json({ ok: false, error: "Location name is required" });
      return;
    }
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      res.status(400).json({ ok: false, error: "Valid latitude and longitude are required" });
      return;
    }

    const { rows } = await pool.query(
      `UPDATE weather_locations 
       SET profile_id=$1, location_name=$2, latitude=$3, longitude=$4
       WHERE id=$5 RETURNING *`,
      [profileId || null, locationName.trim(), latitude, longitude, id]
    );
    
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Location not found" });
      return;
    }
    
    res.json({ ok: true, location: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("weather locations PUT error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to update location" });
  }
});

/** PATCH /api/weather/locations/:id/set-primary */
router.patch("/locations/:id/set-primary", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Unset all other locations
    await pool.query("UPDATE weather_locations SET is_primary = false");
    
    // Set this one as primary
    const { rows } = await pool.query(
      "UPDATE weather_locations SET is_primary = true WHERE id=$1 RETURNING *",
      [id]
    );
    
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Location not found" });
      return;
    }
    
    res.json({ ok: true, location: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("set-primary PATCH error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to set primary location" });
  }
});

/** DELETE /api/weather/locations/:id */
router.delete("/locations/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM weather_locations WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("weather locations DELETE error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to delete location" });
  }
});

export default router;
