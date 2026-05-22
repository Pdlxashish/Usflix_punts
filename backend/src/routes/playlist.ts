/**
 * Playlist routes — Our songs and song of the day
 * GET /api/playlist           — public
 * GET /api/playlist/our-song  — public, get "our song"
 * GET /api/playlist/song-of-day — public, get current song of the day
 * POST /api/playlist          — admin only
 * PUT /api/playlist/:id       — admin only
 * PATCH /api/playlist/:id/set-our-song — admin only
 * PATCH /api/playlist/:id/set-song-of-day — admin only
 * DELETE /api/playlist/:id    — admin only
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
    title: r.title,
    artist: r.artist,
    spotifyUrl: r.spotify_url,
    youtubeUrl: r.youtube_url,
    memoryNote: r.memory_note,
    isOurSong: r.is_our_song,
    isSongOfDay: r.is_song_of_day,
    sortRank: r.sort_rank,
    createdAt: r.created_at,
  };
}

/** GET /api/playlist */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM playlist_songs ORDER BY sort_rank ASC, created_at DESC"
    );
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("playlist GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch playlist" });
  }
});

/** GET /api/playlist/our-song */
router.get("/our-song", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM playlist_songs WHERE is_our_song = true LIMIT 1"
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "No 'our song' set" });
      return;
    }
    res.json(mapRow(rows[0]));
  } catch (err: any) {
    console.error("our-song GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch our song" });
  }
});

/** GET /api/playlist/song-of-day */
router.get("/song-of-day", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM playlist_songs WHERE is_song_of_day = true LIMIT 1"
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "No song of the day set" });
      return;
    }
    res.json(mapRow(rows[0]));
  } catch (err: any) {
    console.error("song-of-day GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch song of the day" });
  }
});

/** POST /api/playlist */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, artist, spotifyUrl, youtubeUrl, memoryNote, sortRank } = req.body;
    if (!title?.trim()) {
      res.status(400).json({ ok: false, error: "Title is required" });
      return;
    }
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO playlist_songs (id, title, artist, spotify_url, youtube_url, memory_note, sort_rank)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, title.trim(), artist?.trim() || "", spotifyUrl?.trim() || null, youtubeUrl?.trim() || null, memoryNote?.trim() || "", sortRank ?? 0]
    );
    res.status(201).json({ ok: true, song: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("playlist POST error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to add song" });
  }
});

/** PUT /api/playlist/:id */
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, artist, spotifyUrl, youtubeUrl, memoryNote, sortRank } = req.body;
    if (!title?.trim()) {
      res.status(400).json({ ok: false, error: "Title is required" });
      return;
    }
    const { rows } = await pool.query(
      `UPDATE playlist_songs SET title=$1, artist=$2, spotify_url=$3, youtube_url=$4, memory_note=$5, sort_rank=$6
       WHERE id=$7 RETURNING *`,
      [title.trim(), artist?.trim() || "", spotifyUrl?.trim() || null, youtubeUrl?.trim() || null, memoryNote?.trim() || "", sortRank ?? 0, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Song not found" });
      return;
    }
    res.json({ ok: true, song: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("playlist PUT error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to update song" });
  }
});

/** PATCH /api/playlist/:id/set-our-song */
router.patch("/:id/set-our-song", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Unset all other songs
    await pool.query("UPDATE playlist_songs SET is_our_song = false");
    // Set this one
    const { rows } = await pool.query(
      "UPDATE playlist_songs SET is_our_song = true WHERE id=$1 RETURNING *",
      [id]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Song not found" });
      return;
    }
    res.json({ ok: true, song: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("set-our-song PATCH error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to set our song" });
  }
});

/** PATCH /api/playlist/:id/set-song-of-day */
router.patch("/:id/set-song-of-day", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Unset all other songs
    await pool.query("UPDATE playlist_songs SET is_song_of_day = false");
    // Set this one
    const { rows } = await pool.query(
      "UPDATE playlist_songs SET is_song_of_day = true WHERE id=$1 RETURNING *",
      [id]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Song not found" });
      return;
    }
    res.json({ ok: true, song: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("set-song-of-day PATCH error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to set song of the day" });
  }
});

/** DELETE /api/playlist/:id */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM playlist_songs WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("playlist DELETE error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to delete song" });
  }
});

export default router;
