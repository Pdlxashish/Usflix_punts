/**
 * Playlist routes — Our songs and song of the day
 * 🔒 SECURED WITH USER-LEVEL ISOLATION
 */
import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { requireUserAuth } from "../middleware/userAuth.js";

const router = Router();

async function getAdminUserId(): Promise<number | null> {
  const { rows } = await pool.query("SELECT id FROM users ORDER BY created_at ASC LIMIT 1");
  return rows.length > 0 ? rows[0].id : null;
}

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
router.get("/", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM playlist_songs WHERE user_id = $1 ORDER BY sort_rank ASC, created_at DESC",
      [req.userAuth!.userId]
    );
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("playlist GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch playlist" });
  }
});

/** GET /api/playlist/our-song */
router.get("/our-song", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM playlist_songs WHERE is_our_song = true AND user_id = $1 LIMIT 1",
      [req.userAuth!.userId]
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
router.get("/song-of-day", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM playlist_songs WHERE is_song_of_day = true AND user_id = $1 LIMIT 1",
      [req.userAuth!.userId]
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

    const userId = await getAdminUserId();
    if (!userId) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }

    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO playlist_songs (id, user_id, title, artist, spotify_url, youtube_url, memory_note, sort_rank)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, userId, title.trim(), artist?.trim() || "", spotifyUrl?.trim() || null, youtubeUrl?.trim() || null, memoryNote?.trim() || "", sortRank ?? 0]
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

    const userId = await getAdminUserId();
    if (!userId) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }

    const { rows } = await pool.query(
      `UPDATE playlist_songs SET title=$1, artist=$2, spotify_url=$3, youtube_url=$4, memory_note=$5, sort_rank=$6
       WHERE id=$7 AND user_id=$8 RETURNING *`,
      [title.trim(), artist?.trim() || "", spotifyUrl?.trim() || null, youtubeUrl?.trim() || null, memoryNote?.trim() || "", sortRank ?? 0, id, userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Song not found or access denied" });
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

    const userId = await getAdminUserId();
    if (!userId) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }

    // Unset all other songs for this user
    await pool.query("UPDATE playlist_songs SET is_our_song = false WHERE user_id = $1", [userId]);
    
    // Set this one
    const { rows } = await pool.query(
      "UPDATE playlist_songs SET is_our_song = true WHERE id=$1 AND user_id=$2 RETURNING *",
      [id, userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Song not found or access denied" });
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

    const userId = await getAdminUserId();
    if (!userId) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }

    // Unset all other songs for this user
    await pool.query("UPDATE playlist_songs SET is_song_of_day = false WHERE user_id = $1", [userId]);
    
    // Set this one
    const { rows } = await pool.query(
      "UPDATE playlist_songs SET is_song_of_day = true WHERE id=$1 AND user_id=$2 RETURNING *",
      [id, userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Song not found or access denied" });
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

    const userId = await getAdminUserId();
    if (!userId) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }

    const result = await pool.query("DELETE FROM playlist_songs WHERE id=$1 AND user_id=$2", [id, userId]);
    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, error: "Song not found or access denied" });
      return;
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error("playlist DELETE error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to delete song" });
  }
});

export default router;
