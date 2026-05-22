/**
 * Database schema — creates all tables if they don't exist.
 * Supports: photo, video, voice note media types.
 */
import pool from "./connection.js";

export async function createTables(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Admin users
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Collections
    await client.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        parent_id VARCHAR(100) REFERENCES collections(id) ON DELETE SET NULL,
        sort_rank INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Media items — supports photo, video, voice
    await client.query(`
      CREATE TABLE IF NOT EXISTS media_items (
        id VARCHAR(100) PRIMARY KEY,
        type VARCHAR(10) NOT NULL DEFAULT 'photo' CHECK (type IN ('photo', 'video', 'voice')),
        title VARCHAR(200) NOT NULL,
        year VARCHAR(10) NOT NULL,
        tagline TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        thumbnail VARCHAR(500),
        category VARCHAR(200) NOT NULL,
        sort_rank INTEGER NOT NULL DEFAULT 0,
        video_url VARCHAR(500),
        audio_url VARCHAR(500),
        duration INTEGER,
        photos JSONB DEFAULT '[]',
        status VARCHAR(30) NOT NULL DEFAULT 'ready',
        featured BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migration: add audio_url column if missing
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='media_items' AND column_name='audio_url'
        ) THEN
          ALTER TABLE media_items ADD COLUMN audio_url VARCHAR(500);
        END IF;
      END $$;
    `);

    // Migration: add featured column if missing
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='media_items' AND column_name='featured'
        ) THEN
          ALTER TABLE media_items ADD COLUMN featured BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END $$;
    `);

    // Hero banners
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_banners (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        subtitle TEXT NOT NULL DEFAULT '',
        media_url VARCHAR(500) NOT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('image', 'video')),
        linked_media_id VARCHAR(100) REFERENCES media_items(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Branding config (single row table)
    await client.query(`
      CREATE TABLE IF NOT EXISTS branding (
        id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        platform_name VARCHAR(100) NOT NULL DEFAULT 'USFLIX',
        hero_tagline VARCHAR(200) NOT NULL DEFAULT '',
        hero_subtitle VARCHAR(200) NOT NULL DEFAULT '',
        footer_text VARCHAR(500) NOT NULL DEFAULT '',
        home_page_title VARCHAR(100) NOT NULL DEFAULT '',
        home_page_description VARCHAR(200) NOT NULL DEFAULT '',
        relationship_start_date VARCHAR(50) NOT NULL DEFAULT '',
        primary_color VARCHAR(20) NOT NULL DEFAULT '#e50914',
        accent_color VARCHAR(20) NOT NULL DEFAULT '#b20710',
        background_color VARCHAR(20) NOT NULL DEFAULT '#000000',
        logo_url VARCHAR(500) NOT NULL DEFAULT '',
        favicon_url VARCHAR(500) NOT NULL DEFAULT '',
        heading_font VARCHAR(100) NOT NULL DEFAULT 'Bebas Neue',
        body_font VARCHAR(100) NOT NULL DEFAULT 'Inter',
        show_time_together_section BOOLEAN NOT NULL DEFAULT true,
        show_story_continues_section BOOLEAN NOT NULL DEFAULT true,
        show_featured_section BOOLEAN NOT NULL DEFAULT true,
        background_image_url VARCHAR(500) NOT NULL DEFAULT '',
        background_pattern VARCHAR(50) NOT NULL DEFAULT 'none',
        background_gradient VARCHAR(200) NOT NULL DEFAULT 'none',
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migration: add new branding columns if missing
    const brandingColumns = [
      { name: 'primary_color', type: 'VARCHAR(20)', default: "'#e50914'" },
      { name: 'accent_color', type: 'VARCHAR(20)', default: "'#b20710'" },
      { name: 'background_color', type: 'VARCHAR(20)', default: "'#000000'" },
      { name: 'logo_url', type: 'VARCHAR(500)', default: "''" },
      { name: 'favicon_url', type: 'VARCHAR(500)', default: "''" },
      { name: 'heading_font', type: 'VARCHAR(100)', default: "'Bebas Neue'" },
      { name: 'body_font', type: 'VARCHAR(100)', default: "'Inter'" },
      { name: 'show_time_together_section', type: 'BOOLEAN', default: 'true' },
      { name: 'show_story_continues_section', type: 'BOOLEAN', default: 'true' },
      { name: 'show_featured_section', type: 'BOOLEAN', default: 'true' },
      { name: 'background_image_url', type: 'VARCHAR(500)', default: "''" },
      { name: 'background_pattern', type: 'VARCHAR(50)', default: "'none'" },
      { name: 'background_gradient', type: 'VARCHAR(200)', default: "'none'" },
      { name: 'hero_animation', type: 'VARCHAR(50)', default: "'kenburns'" },
      { name: 'profile_picture_url', type: 'VARCHAR(500)', default: "''" },
      { name: 'profile_picture_shape', type: 'VARCHAR(50)', default: "'circle'" },
    ];

    for (const col of brandingColumns) {
      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='branding' AND column_name='${col.name}'
          ) THEN
            ALTER TABLE branding ADD COLUMN ${col.name} ${col.type} NOT NULL DEFAULT ${col.default};
          END IF;
        END $$;
      `);
    }

    // Profiles
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(50) NOT NULL,
        profile_picture_url VARCHAR(500),
        avatar_shape VARCHAR(50) NOT NULL DEFAULT 'square'
      );
    `);

    // Migration: add profile_picture_url column if missing
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='profiles' AND column_name='profile_picture_url'
        ) THEN
          ALTER TABLE profiles ADD COLUMN profile_picture_url VARCHAR(500);
        END IF;
      END $$;
    `);

    // Migration: add avatar_shape column if missing
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='profiles' AND column_name='avatar_shape'
        ) THEN
          ALTER TABLE profiles ADD COLUMN avatar_shape VARCHAR(50) NOT NULL DEFAULT 'square';
        END IF;
      END $$;
    `);

    // Migration: birthday (DATE, optional)
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='profiles' AND column_name='birthday'
        ) THEN
          ALTER TABLE profiles ADD COLUMN birthday DATE;
        END IF;
      END $$;
    `);

    // My List
    await client.query(`
      CREATE TABLE IF NOT EXISTS my_list (
        id SERIAL PRIMARY KEY,
        profile_id VARCHAR(100) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        media_id VARCHAR(100) NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
        added_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(profile_id, media_id)
      );
    `);

    // Comments
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(100) PRIMARY KEY,
        media_id VARCHAR(100) NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
        profile_id VARCHAR(100) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        video_time DOUBLE PRECISION,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Viewer profile sessions (who is "logged in" on each device)
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_sessions (
        id SERIAL PRIMARY KEY,
        profile_id VARCHAR(100) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        client_id VARCHAR(64) NOT NULL,
        ip VARCHAR(64),
        user_agent TEXT,
        started_at TIMESTAMP DEFAULT NOW(),
        last_seen_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (profile_id, client_id)
      );
    `);

    // Activity audit log (profile + admin actions)
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        profile_id VARCHAR(100) REFERENCES profiles(id) ON DELETE SET NULL,
        admin_username VARCHAR(100),
        client_id VARCHAR(64),
        action VARCHAR(80) NOT NULL,
        details JSONB DEFAULT '{}',
        ip VARCHAR(64),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_profile_sessions_last_seen ON profile_sessions (last_seen_at DESC);
    `);

    // Partner GPS (from device when profile is active)
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_locations (
        profile_id VARCHAR(100) PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
        client_id VARCHAR(64),
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        accuracy DOUBLE PRECISION,
        city VARCHAR(200),
        source VARCHAR(20) DEFAULT 'gps',
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='profile_locations' AND column_name='source'
        ) THEN
          ALTER TABLE profile_locations ADD COLUMN source VARCHAR(20) DEFAULT 'gps';
        END IF;
      END $$;
    `);

    // Last known distance between partners (for "5km closer" alerts)
    await client.query(`
      CREATE TABLE IF NOT EXISTS distance_snapshots (
        profile_a VARCHAR(100) NOT NULL,
        profile_b VARCHAR(100) NOT NULL,
        distance_km DOUBLE PRECISION NOT NULL,
        notify_baseline_km DOUBLE PRECISION NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (profile_a, profile_b)
      );
    `);

    // ── Love Letters ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS love_letters (
        id VARCHAR(100) PRIMARY KEY,
        "from" VARCHAR(100) NOT NULL,
        preview VARCHAR(300) NOT NULL,
        message TEXT NOT NULL,
        color VARCHAR(30) NOT NULL DEFAULT 'rose',
        sort_rank INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Love Jar ──────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS love_jar (
        id VARCHAR(100) PRIMARY KEY,
        reason TEXT NOT NULL,
        emoji VARCHAR(10) NOT NULL DEFAULT '💕',
        sort_rank INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Mood Board ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS mood_board (
        id VARCHAR(100) PRIMARY KEY,
        image_url VARCHAR(500) NOT NULL,
        alt VARCHAR(200) NOT NULL DEFAULT '',
        sort_rank INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Milestones ("First Time We...") ───────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        story TEXT NOT NULL DEFAULT '',
        milestone_date VARCHAR(20) NOT NULL,
        image_url VARCHAR(500) NOT NULL DEFAULT '',
        emoji VARCHAR(10) NOT NULL DEFAULT '💕',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Relationship Quiz ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id VARCHAR(100) PRIMARY KEY,
        question TEXT NOT NULL,
        option_a VARCHAR(300) NOT NULL,
        option_b VARCHAR(300) NOT NULL,
        option_c VARCHAR(300) NOT NULL,
        option_d VARCHAR(300) NOT NULL,
        correct_option VARCHAR(1) NOT NULL CHECK (correct_option IN ('a','b','c','d')),
        fun_fact TEXT NOT NULL DEFAULT '',
        sort_rank INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Bucket List ───────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS bucket_list (
        id VARCHAR(100) PRIMARY KEY,
        item VARCHAR(300) NOT NULL,
        emoji VARCHAR(10) NOT NULL DEFAULT '✨',
        completed BOOLEAN NOT NULL DEFAULT false,
        completed_at TIMESTAMP,
        sort_rank INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Mood of the Day ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS mood_of_day (
        id VARCHAR(100) PRIMARY KEY,
        mood_date VARCHAR(20) NOT NULL,
        emoji VARCHAR(10) NOT NULL DEFAULT '😊',
        message VARCHAR(300) NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(mood_date)
      );
    `);

    // ── Our Playlist / Song of the Day ────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS playlist_songs (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        artist VARCHAR(200) NOT NULL DEFAULT '',
        spotify_url VARCHAR(500),
        youtube_url VARCHAR(500),
        memory_note TEXT NOT NULL DEFAULT '',
        is_our_song BOOLEAN NOT NULL DEFAULT false,
        is_song_of_day BOOLEAN NOT NULL DEFAULT false,
        sort_rank INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Weather Locations ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS weather_locations (
        id VARCHAR(100) PRIMARY KEY,
        profile_id VARCHAR(100) REFERENCES profiles(id) ON DELETE CASCADE,
        location_name VARCHAR(200) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        is_primary BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Shared Canvas / Drawing Board ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS canvas_drawings (
        id VARCHAR(100) PRIMARY KEY,
        profile_id VARCHAR(100) REFERENCES profiles(id) ON DELETE SET NULL,
        drawing_data TEXT NOT NULL,
        thumbnail_url VARCHAR(500),
        title VARCHAR(200) NOT NULL DEFAULT 'Untitled',
        is_active BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migration: add is_active column if missing
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='canvas_drawings' AND column_name='is_active'
        ) THEN
          ALTER TABLE canvas_drawings ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END $$;
    `);

    // ── Time-Based Greetings ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_greetings (
        id VARCHAR(100) PRIMARY KEY,
        time_of_day VARCHAR(20) NOT NULL CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night')),
        message TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_rank INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query("COMMIT");
    console.log("✅ Database tables created/verified");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
