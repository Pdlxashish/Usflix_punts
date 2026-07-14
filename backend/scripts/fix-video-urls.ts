/**
 * Fix video URLs in the database
 * Converts YouTube watch URLs to embed format
 */
import pool from "../src/db/connection.js";

function convertYouTubeUrl(url: string): string | null {
  if (!url) return null;
  
  // Already an embed URL
  if (url.includes('youtube.com/embed/') || url.includes('youtu.be/embed/')) {
    return url;
  }
  
  // Convert watch URL to embed
  // https://www.youtube.com/watch?v=VIDEO_ID → https://www.youtube.com/embed/VIDEO_ID
  const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }
  
  // Convert short URL to embed
  // https://youtu.be/VIDEO_ID → https://www.youtube.com/embed/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }
  
  // Not a YouTube URL or already correct
  return url;
}

async function fixVideoUrls() {
  console.log("\n🎬 FIXING VIDEO URLs\n");
  console.log("=".repeat(80));

  try {
    // Get all video items
    const { rows: videos } = await pool.query(
      `SELECT id, title, video_url, type 
       FROM media_items 
       WHERE type = 'video' AND video_url IS NOT NULL`
    );

    if (videos.length === 0) {
      console.log("✅ No videos found in database");
      return;
    }

    console.log(`\n📹 Found ${videos.length} video(s)\n`);

    let fixed = 0;
    let skipped = 0;

    for (const video of videos) {
      const originalUrl = video.video_url;
      const fixedUrl = convertYouTubeUrl(originalUrl);

      if (fixedUrl && fixedUrl !== originalUrl) {
        console.log(`\n🔧 Fixing: ${video.title}`);
        console.log(`   Original: ${originalUrl}`);
        console.log(`   Fixed:    ${fixedUrl}`);

        await pool.query(
          `UPDATE media_items SET video_url = $1 WHERE id = $2`,
          [fixedUrl, video.id]
        );

        fixed++;
      } else {
        console.log(`✓ ${video.title} - URL already correct`);
        skipped++;
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log(`\n📊 SUMMARY:\n`);
    console.log(`   Fixed:   ${fixed} video(s)`);
    console.log(`   Skipped: ${skipped} video(s) (already correct)`);
    console.log(`   Total:   ${videos.length} video(s)`);

    if (fixed > 0) {
      console.log(`\n✅ Video URLs have been fixed!`);
      console.log(`💡 Refresh your browser to see the changes.\n`);
    } else {
      console.log(`\n✅ All video URLs are already in correct format.\n`);
    }

  } catch (error) {
    console.error("\n❌ Error fixing video URLs:", error);
  } finally {
    await pool.end();
  }
}

fixVideoUrls();
