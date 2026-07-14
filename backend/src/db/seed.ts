/**
 * Seed the database with default data from the original frontend constants.
 * Only inserts if tables are empty (idempotent).
 */
import bcrypt from "bcryptjs";
import pool from "./connection.js";
import { createTables } from "./schema.js";
import { getMinAdminPasswordLength, shouldSeedDemoData } from "../config/env.js";

// ─── Sample video URLs (public domain) ───────────────────────────────────────
const SAMPLE_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const SAMPLE_VIDEO_2 = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";
const SAMPLE_VIDEO_3 = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

/**
 * Get or create a demo user for seeding
 * Returns the user_id to use for all seeded content
 */
async function getOrCreateDemoUser(): Promise<number> {
  // Check if demo user already exists
  const { rows } = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    ["demo@usflix.local"]
  );
  
  if (rows.length > 0) {
    return rows[0].id;
  }
  
  // Create demo user
  const result = await pool.query(
    `INSERT INTO users (google_id, email, display_name, profile_picture_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_id) DO NOTHING
     RETURNING id`,
    ["demo-user-google-id", "demo@usflix.local", "Demo User", null]
  );
  
  if (result.rows.length > 0) {
    console.log("  → Created demo user for seeded content");
    return result.rows[0].id;
  }
  
  // If INSERT didn't return (due to conflict), fetch the existing user
  const existingUser = await pool.query(
    "SELECT id FROM users WHERE google_id = $1",
    ["demo-user-google-id"]
  );
  
  return existingUser.rows[0].id;
}

async function seedAdminUsers(): Promise<void> {
  const { rows } = await pool.query("SELECT COUNT(*) as count FROM admin_users");
  if (parseInt(rows[0].count) > 0) return;

  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.warn(
      "  ⚠️  No admin user seeded. Set ADMIN_USERNAME and ADMIN_PASSWORD in backend/.env, then restart."
    );
    return;
  }

  const minLen = getMinAdminPasswordLength();
  if (password.length < minLen) {
    console.warn(`  ⚠️  ADMIN_PASSWORD must be at least ${minLen} characters. Admin user not seeded.`);
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    "INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)",
    [username, hash]
  );
  console.log(`  → Seeded admin user "${username}" (password from ADMIN_PASSWORD env var)`);
}

async function seedCollections(userId: number): Promise<void> {
  const { rows } = await pool.query("SELECT COUNT(*) as count FROM collections");
  if (parseInt(rows[0].count) > 0) return;

  const collections = [
    { id: "travel", name: "Travel", sort_rank: 1 },
    { id: "adventures", name: "Adventures", sort_rank: 2 },
    { id: "anniversaries", name: "Anniversaries", sort_rank: 3 },
    { id: "getaways", name: "Getaways", sort_rank: 4 },
    { id: "beginnings", name: "Beginnings", sort_rank: 5 },
    { id: "moments", name: "Moments", sort_rank: 6 },
    { id: "videos", name: "Videos", sort_rank: 7 },
  ];

  for (const c of collections) {
    await pool.query(
      "INSERT INTO collections (id, user_id, name, sort_rank) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING",
      [c.id, userId, c.name, c.sort_rank]
    );
  }
  console.log("  → Seeded collections");
}

async function seedMediaItems(userId: number): Promise<void> {
  const { rows } = await pool.query("SELECT COUNT(*) as count FROM media_items");
  if (parseInt(rows[0].count) > 0) return;

  const items = [
    // Photo albums
    {
      id: "paris", type: "photo", title: "Paris, Mon Amour", year: "2024",
      tagline: "A weekend lost in cobblestone streets and golden lights.",
      description: "From midnight strolls along the Seine to croissants at sunrise — the city held us close.",
      thumbnail: "/assets/album-paris.jpg", category: "Travel", sort_rank: 1, status: "ready",
      photos: JSON.stringify([
        { src: "/assets/album-paris.jpg", caption: "Under the tower, the night we lost track of time." },
        { src: "/assets/album-dance.jpg", caption: "Dancing in a courtyard we found by accident." },
        { src: "/assets/album-anniversary.jpg", caption: "Wine, candles, and that look you gave me." },
      ]),
    },
    {
      id: "anniversary", type: "photo", title: "Three Years", year: "2024",
      tagline: "Candles, wine, and the way you laugh.",
      description: "Three years of inside jokes, slow mornings, and choosing each other again.",
      thumbnail: "/assets/album-anniversary.jpg", category: "Anniversaries", sort_rank: 1, status: "ready",
      photos: JSON.stringify([
        { src: "/assets/album-anniversary.jpg", caption: "The dinner I almost burned." },
        { src: "/assets/album-dance.jpg", caption: "Our song, the kitchen floor." },
      ]),
    },
    {
      id: "summer", type: "photo", title: "Summer Adventures", year: "2023",
      tagline: "Trails, rivers, and sunburned shoulders.",
      description: "A summer of muddy boots, alpine sunrises, and sleeping under stars.",
      thumbnail: "/assets/album-summer.jpg", category: "Adventures", sort_rank: 1, status: "ready",
      photos: JSON.stringify([
        { src: "/assets/album-summer.jpg", caption: "The peak, just before the rain." },
        { src: "/assets/album-roadtrip.jpg", caption: "The drive there." },
        { src: "/assets/album-beach.jpg", caption: "And the reward at the coast." },
      ]),
    },
    {
      id: "winter", type: "photo", title: "Cabin in the Snow", year: "2023",
      tagline: "Firewood, hot cocoa, and snowflakes on your eyelashes.",
      description: "Two days off-grid, one fireplace, endless quiet.",
      thumbnail: "/assets/album-winter.jpg", category: "Getaways", sort_rank: 1, status: "ready",
      photos: JSON.stringify([
        { src: "/assets/album-winter.jpg", caption: "The cabin glowing through the trees." },
        { src: "/assets/album-anniversary.jpg", caption: "Cocoa by candlelight." },
      ]),
    },
    {
      id: "beach", type: "photo", title: "Our First Trip", year: "2022",
      tagline: "Salt air, cheap wine, and the beginning of everything.",
      description: "Where it all started — sand in our shoes, your hand in mine.",
      thumbnail: "/assets/album-beach.jpg", category: "Travel", sort_rank: 2, status: "ready",
      photos: JSON.stringify([
        { src: "/assets/album-beach.jpg", caption: "Sunset on the first night." },
        { src: "/assets/album-firstdate.jpg", caption: "Coffee the morning after." },
      ]),
    },
    {
      id: "firstdate", type: "photo", title: "First Date", year: "2021",
      tagline: "Two coffees, three hours, one beginning.",
      description: "The little café on the corner — where I knew.",
      thumbnail: "/assets/album-firstdate.jpg", category: "Beginnings", sort_rank: 1, status: "ready",
      photos: JSON.stringify([{ src: "/assets/album-firstdate.jpg", caption: "The coffees that started it all." }]),
    },
    {
      id: "dance", type: "photo", title: "Garden Lights", year: "2024",
      tagline: "Slow dancing under string lights.",
      description: "A backyard, a playlist, and you in that dress.",
      thumbnail: "/assets/album-dance.jpg", category: "Moments", sort_rank: 1, status: "ready",
      photos: JSON.stringify([{ src: "/assets/album-dance.jpg", caption: "One more song." }]),
    },
    {
      id: "roadtrip", type: "photo", title: "Coastal Road Trip", year: "2023",
      tagline: "Windows down, the whole coast ours.",
      description: "Five days, seven beaches, a thousand songs.",
      thumbnail: "/assets/album-roadtrip.jpg", category: "Adventures", sort_rank: 2, status: "ready",
      photos: JSON.stringify([
        { src: "/assets/album-roadtrip.jpg", caption: "Cliffs at golden hour." },
        { src: "/assets/album-beach.jpg", caption: "We stopped here for hours." },
      ]),
    },
    // Video items
    {
      id: "video-bbb", type: "video", title: "Big Buck Bunny", year: "2024",
      tagline: "A short animated film — our favourite lazy Sunday watch.",
      description: "Big Buck Bunny tells the story of a giant rabbit with a heart bigger than himself.",
      thumbnail: "/assets/album-summer.jpg", category: "Videos", sort_rank: 1, status: "ready",
      video_url: SAMPLE_VIDEO, duration: 596, photos: "[]",
    },
    {
      id: "video-ed", type: "video", title: "Elephants Dream", year: "2023",
      tagline: "The first open-source animated short film.",
      description: "Two strange characters explore a capricious and seemingly infinite machine.",
      thumbnail: "/assets/album-paris.jpg", category: "Videos", sort_rank: 2, status: "ready",
      video_url: SAMPLE_VIDEO_2, duration: 654, photos: "[]",
    },
    {
      id: "video-blazes", type: "video", title: "For Bigger Blazes", year: "2023",
      tagline: "A cinematic short — fire and light.",
      description: "A short film about the beauty of fire and light in the natural world.",
      thumbnail: null, category: "Videos", sort_rank: 3, status: "ready",
      video_url: SAMPLE_VIDEO_3, duration: 15, photos: "[]",
    },
  ];

  for (const item of items) {
    await pool.query(
      `INSERT INTO media_items (id, user_id, type, title, year, tagline, description, thumbnail, category, sort_rank, status, video_url, duration, photos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO NOTHING`,
      [item.id, userId, item.type, item.title, item.year, item.tagline, item.description,
       item.thumbnail, item.category, item.sort_rank, item.status,
       (item as any).video_url ?? null, (item as any).duration ?? null, item.photos]
    );
  }
  console.log("  → Seeded media items");
}

async function seedBranding(userId: number): Promise<void> {
  const { rows } = await pool.query("SELECT COUNT(*) as count FROM branding");
  if (parseInt(rows[0].count) > 0) return;

  await pool.query(
    `INSERT INTO branding (user_id, platform_name, hero_tagline, hero_subtitle, footer_text, home_page_title, home_page_description, relationship_start_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id) DO NOTHING`,
    [
      userId,
      "USFLIX",
      "The Sunset We Watched Forever",
      "Every story we've written together, in one place. Press play and let's remember.",
      "Our Story, Streaming Always",
      "USFLIX — Our Story",
      "Every memory we've made, in one cinematic place.",
      "2021-09-15T00:00:00",
    ]
  );
  console.log("  → Seeded branding config");
}

async function seedProfiles(userId: number): Promise<void> {
  const { rows } = await pool.query("SELECT COUNT(*) as count FROM profiles");
  if (parseInt(rows[0].count) > 0) return;

  const profiles = [
    { id: "p1", name: "You", color: "bg-blue-500" },
    { id: "p2", name: "Me", color: "bg-rose-500" },
    { id: "p3", name: "Us", color: "bg-purple-500" },
  ];

  for (const p of profiles) {
    await pool.query(
      "INSERT INTO profiles (id, user_id, name, color) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING",
      [p.id, userId, p.name, p.color]
    );
  }
  
  // Link profiles to the demo user in user_profiles junction table
  for (const p of profiles) {
    await pool.query(
      `INSERT INTO user_profiles (user_id, profile_id, is_primary)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, profile_id) DO NOTHING`,
      [userId, p.id, p.id === "p1"] // Make first profile primary
    );
  }
  
  console.log("  → Seeded profiles");
}

async function seedHeroBanners(userId: number): Promise<void> {
  const { rows } = await pool.query("SELECT COUNT(*) as count FROM hero_banners");
  if (parseInt(rows[0].count) > 0) return;

  await pool.query(
    `INSERT INTO hero_banners (id, user_id, title, subtitle, media_url, type, linked_media_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING`,
    [
      "banner-1",
      userId,
      "Mrs Deactive and Guhiya",
      "Every story we've written together, in one place. Press play and let's remember.",
      "/assets/album-paris.jpg",
      "image",
      "video-bbb",
    ]
  );
  console.log("  → Seeded hero banners");
}

export async function seedDatabase(): Promise<void> {
  console.log("🌱 Seeding database...");
  await seedAdminUsers();
  
  if (!shouldSeedDemoData()) {
    console.log("  → Skipping demo content (production). Set SEED_DEMO_DATA=true to include samples.");
    console.log("🌱 Seeding complete!");
    return;
  }
  
  // Get or create demo user for all seeded content
  const demoUserId = await getOrCreateDemoUser();
  
  await seedCollections(demoUserId);
  await seedMediaItems(demoUserId);
  await seedBranding(demoUserId);
  await seedProfiles(demoUserId);
  await seedHeroBanners(demoUserId);
  console.log("🌱 Seeding complete!");
}

// Allow running as standalone script
const isMainModule = process.argv[1]?.includes("seed");
if (isMainModule) {
  createTables()
    .then(() => seedDatabase())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
