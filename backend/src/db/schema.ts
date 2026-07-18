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

    // Public users (supports both Google OAuth and email/password)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(200) NOT NULL,
        profile_picture_url VARCHAR(500),
        password_hash VARCHAR(255),
        auth_provider VARCHAR(20) NOT NULL DEFAULT 'email',
        email_verified BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migration: make google_id nullable for email/password users
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL;
      EXCEPTION
        WHEN others THEN NULL;
      END $$;
    `);

    // Migration: add password_hash column if missing
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='password_hash'
        ) THEN
          ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
        END IF;
      END $$;
    `);

    // Migration: add auth_provider column if missing
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='auth_provider'
        ) THEN
          ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'email';
        END IF;
      END $$;
    `);

    // Migration: add email_verified column if missing
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='email_verified'
        ) THEN
          ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END $$;
    `);

    // Create partial unique index for google_id (only when not null)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique 
      ON users (google_id) WHERE google_id IS NOT NULL;
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users (email);
    `);

    // Profiles (must be created before user_profiles and other dependent tables)
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(50) NOT NULL,
        profile_picture_url VARCHAR(500),
        avatar_shape VARCHAR(50) NOT NULL DEFAULT 'square'
      );
    `);

    // Migration: add/backfill user_id column if missing (must come before index creation)
    await client.query(`
      DO $$
      DECLARE
        fallback_user_id INTEGER;
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='profiles' AND column_name='user_id'
        ) THEN
          ALTER TABLE profiles ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        END IF;

        IF EXISTS (SELECT 1 FROM profiles WHERE user_id IS NULL) THEN
          SELECT id INTO fallback_user_id FROM users ORDER BY id LIMIT 1;

          IF fallback_user_id IS NULL THEN
            INSERT INTO users (email, display_name)
            VALUES ('legacy-profiles@usflix.local', 'Legacy Profiles')
            ON CONFLICT (email) DO UPDATE
              SET display_name = users.display_name
            RETURNING id INTO fallback_user_id;
          END IF;

          UPDATE profiles
          SET user_id = fallback_user_id
          WHERE user_id IS NULL;
        END IF;

        ALTER TABLE profiles ALTER COLUMN user_id SET NOT NULL;
      END $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (user_id);
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

    // Migration: role (self | partner)
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='profiles' AND column_name='role'
        ) THEN
          ALTER TABLE profiles ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'self'
            CHECK (role IN ('self', 'partner'));
        END IF;
      END $$;
    `);

    // Migration: created_at on profiles
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='profiles' AND column_name='created_at'
        ) THEN
          ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
        END IF;
      END $$;
    `);

    // Migration: add profile_id column to users table (now that profiles table exists)
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='profile_id'
        ) THEN
          ALTER TABLE users ADD COLUMN profile_id VARCHAR(100) REFERENCES profiles(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Junction table: links one Google user to multiple profiles (Netflix-style)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        profile_id VARCHAR(100) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        is_primary BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, profile_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_profiles_profile_id ON user_profiles (profile_id);
    `);

    // Collections
    await client.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        parent_id VARCHAR(100) REFERENCES collections(id) ON DELETE SET NULL,
        sort_rank INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections (user_id);
    `);

    // Media items — supports photo, video, voice
    await client.query(`
      CREATE TABLE IF NOT EXISTS media_items (
        id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_media_items_user_id ON media_items (user_id);
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
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        subtitle TEXT NOT NULL DEFAULT '',
        media_url VARCHAR(500) NOT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('image', 'video')),
        linked_media_id VARCHAR(100) REFERENCES media_items(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hero_banners_user_id ON hero_banners (user_id);
    `);

    // Branding config (one row per user)
    await client.query(`
      CREATE TABLE IF NOT EXISTS branding (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
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
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "from" VARCHAR(100) NOT NULL,
        preview VARCHAR(300) NOT NULL,
        message TEXT NOT NULL,
        color VARCHAR(30) NOT NULL DEFAULT 'rose',
        sort_rank INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_love_letters_user_id ON love_letters (user_id);
    `);

    // ── Love Jar ──────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS love_jar (
        id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        emoji VARCHAR(10) NOT NULL DEFAULT '💕',
        sort_rank INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_love_jar_user_id ON love_jar (user_id);
    `);

    // ── Mood Board ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS mood_board (
        id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        image_url VARCHAR(500) NOT NULL,
        alt VARCHAR(200) NOT NULL DEFAULT '',
        sort_rank INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mood_board_user_id ON mood_board (user_id);
    `);

    // ── Milestones ("First Time We...") ───────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        story TEXT NOT NULL DEFAULT '',
        milestone_date VARCHAR(20) NOT NULL,
        image_url VARCHAR(500) NOT NULL DEFAULT '',
        emoji VARCHAR(10) NOT NULL DEFAULT '💕',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON milestones (user_id);
    `);

    // ── Relationship Quiz ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quiz_questions_user_id ON quiz_questions (user_id);
    `);

    // ── Bucket List ───────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS bucket_list (
        id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item VARCHAR(300) NOT NULL,
        emoji VARCHAR(10) NOT NULL DEFAULT '✨',
        completed BOOLEAN NOT NULL DEFAULT false,
        completed_at TIMESTAMP,
        sort_rank INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bucket_list_user_id ON bucket_list (user_id);
    `);

    // ── Mood of the Day ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS mood_of_day (
        id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mood_date VARCHAR(20) NOT NULL,
        emoji VARCHAR(10) NOT NULL DEFAULT '😊',
        message VARCHAR(300) NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, mood_date)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mood_of_day_user_id ON mood_of_day (user_id);
    `);

    // ── Our Playlist / Song of the Day ────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS playlist_songs (
        id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_playlist_songs_user_id ON playlist_songs (user_id);
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

    // One weather location per profile (removes duplicates from concurrent auto-location)
    await client.query(`
      DELETE FROM weather_locations w1
      WHERE w1.profile_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM weather_locations w2
          WHERE w2.profile_id = w1.profile_id
            AND (
              w2.is_primary AND NOT w1.is_primary
              OR (w2.is_primary = w1.is_primary AND w2.created_at > w1.created_at)
              OR (w2.is_primary = w1.is_primary AND w2.created_at = w1.created_at AND w2.id > w1.id)
            )
        );
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS weather_locations_profile_id_unique
      ON weather_locations (profile_id)
      WHERE profile_id IS NOT NULL;
    `);

    // ── Shared Canvas / Drawing Board ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS canvas_drawings (
        id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        profile_id VARCHAR(100) REFERENCES profiles(id) ON DELETE SET NULL,
        drawing_data TEXT NOT NULL,
        thumbnail_url VARCHAR(500),
        title VARCHAR(200) NOT NULL DEFAULT 'Untitled',
        is_active BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_canvas_drawings_user_id ON canvas_drawings (user_id);
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
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        time_of_day VARCHAR(20) NOT NULL CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night')),
        message TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_rank INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_time_greetings_user_id ON time_greetings (user_id);
    `);

    // Migration: household_id + linked_user_id on profiles
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='profiles' AND column_name='household_id'
        ) THEN
          ALTER TABLE profiles ADD COLUMN household_id VARCHAR(100);
        END IF;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='profiles' AND column_name='linked_user_id'
        ) THEN
          ALTER TABLE profiles ADD COLUMN linked_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Migration: partner_invites status includes declined + expired
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE partner_invites DROP CONSTRAINT IF EXISTS partner_invites_status_check;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE partner_invites ADD CONSTRAINT partner_invites_status_check
          CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked'));
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);

    // ── Partner Invite System ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_invites (
        id VARCHAR(100) PRIMARY KEY,
        inviting_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invite_code VARCHAR(64) UNIQUE NOT NULL,
        invited_email VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'accepted', 'revoked')),
        partner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        accepted_at TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_invites_inviting_user
        ON partner_invites (inviting_user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_invites_code
        ON partner_invites (invite_code);
    `);

    // ── Tenant Memberships (who can read whose shared space) ──────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_memberships (
        id SERIAL PRIMARY KEY,
        owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        member_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL DEFAULT 'partner'
          CHECK (role IN ('partner', 'viewer')),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(owner_user_id, member_user_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_memberships_owner
        ON tenant_memberships (owner_user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_memberships_member
        ON tenant_memberships (member_user_id);
    `);

    // ── Partner Links (active partner relationships with couple_id) ───────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_links (
        id VARCHAR(100) PRIMARY KEY,
        couple_id VARCHAR(100) UNIQUE NOT NULL,
        user_a_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_b_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_a_id, user_b_id),
        CHECK (user_a_id < user_b_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_links_user_a ON partner_links (user_a_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_links_user_b ON partner_links (user_b_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_links_couple_id ON partner_links (couple_id);
    `);

    // ── Shared Messages (chat between partners) ───────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS shared_messages (
        id VARCHAR(100) PRIMARY KEY,
        couple_id VARCHAR(100) NOT NULL,
        sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message_text TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        read_by_partner BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shared_messages_couple_id 
        ON shared_messages (couple_id, created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shared_messages_sender 
        ON shared_messages (sender_user_id);
    `);

    // ── Couple Activities (romance activities, responses, streaks) ────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS couple_activities (
        id VARCHAR(100) PRIMARY KEY,
        couple_id VARCHAR(100) NOT NULL,
        activity_type VARCHAR(50) NOT NULL,
        activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
        user_a_completed BOOLEAN NOT NULL DEFAULT FALSE,
        user_b_completed BOOLEAN NOT NULL DEFAULT FALSE,
        user_a_response JSONB,
        user_b_response JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(couple_id, activity_type, activity_date)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_couple_activities_couple_id 
        ON couple_activities (couple_id, activity_date DESC);
    `);

    // ── Location Updates (GPS coordinates from devices) ───────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS location_updates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        couple_id VARCHAR(100),
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        accuracy DECIMAL(10, 2),
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        device_id VARCHAR(100)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_location_updates_user_id 
        ON location_updates (user_id, timestamp DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_location_updates_couple_id 
        ON location_updates (couple_id, timestamp DESC);
    `);

    // Migration: Add couple_id to profiles table
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='profiles' AND column_name='couple_id'
        ) THEN
          ALTER TABLE profiles ADD COLUMN couple_id VARCHAR(100);
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_profiles_couple_id ON profiles (couple_id);
    `);

    // Migration: Add location_sharing_enabled to profiles table
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='profiles' AND column_name='location_sharing_enabled'
        ) THEN
          ALTER TABLE profiles ADD COLUMN location_sharing_enabled BOOLEAN DEFAULT true;
        END IF;
      END $$;
    `);

    // Migration: Add couple_id to media_items table
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='media_items' AND column_name='couple_id'
        ) THEN
          ALTER TABLE media_items ADD COLUMN couple_id VARCHAR(100);
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_media_items_couple_id ON media_items (couple_id);
    `);

    // Migration: Add couple_id to canvas_drawings table
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='canvas_drawings' AND column_name='couple_id'
        ) THEN
          ALTER TABLE canvas_drawings ADD COLUMN couple_id VARCHAR(100);
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_canvas_drawings_couple_id ON canvas_drawings (couple_id);
    `);

    // ── clerk_users: map Clerk user IDs → internal users.id ──────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS clerk_users (
        clerk_id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        display_name VARCHAR(200),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clerk_users_user_id
        ON clerk_users (user_id);
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
