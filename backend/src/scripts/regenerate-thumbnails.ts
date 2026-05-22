/**
 * Script to regenerate thumbnails for all existing videos
 * Run with: npx tsx src/scripts/regenerate-thumbnails.ts
 */
import pool from "../db/connection.js";
import { generateVideoThumbnail, isVideoFile } from "../utils/videoThumbnail.js";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

async function regenerateThumbnails() {
  console.log("🎬 Starting thumbnail regeneration for all videos...\n");

  try {
    // Get all media items from database
    const { rows } = await pool.query(
      "SELECT id, type, video_url, thumbnail FROM media_items WHERE type = 'video'"
    );

    console.log(`Found ${rows.length} video(s) in database\n`);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (const media of rows) {
      console.log(`\n📹 Processing: ${media.id}`);
      console.log(`   Video URL: ${media.video_url}`);
      console.log(`   Current thumbnail: ${media.thumbnail || 'none'}`);

      if (!media.video_url) {
        console.log(`   ⏭️  Skipped: No video URL`);
        skippedCount++;
        continue;
      }

      // Extract filename from URL (remove /uploads/ prefix)
      const videoFilename = media.video_url.replace(/^\/uploads\//, '');
      const videoPath = path.join(UPLOAD_DIR, videoFilename);

      // Check if video file exists
      if (!fs.existsSync(videoPath)) {
        console.log(`   ❌ Video file not found: ${videoPath}`);
        failCount++;
        continue;
      }

      // Check if it's actually a video file
      if (!isVideoFile(videoFilename)) {
        console.log(`   ⏭️  Skipped: Not a video file`);
        skippedCount++;
        continue;
      }

      try {
        // Generate thumbnail
        const thumbnailPath = await generateVideoThumbnail(videoPath);
        const thumbnailFilename = path.basename(thumbnailPath);
        const thumbnailUrl = `/uploads/${thumbnailFilename}`;

        // Update database with new thumbnail
        await pool.query(
          "UPDATE media_items SET thumbnail = $1 WHERE id = $2",
          [thumbnailUrl, media.id]
        );

        console.log(`   ✅ Success! Thumbnail: ${thumbnailUrl}`);
        successCount++;
      } catch (error: any) {
        console.log(`   ❌ Failed: ${error.message}`);
        failCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 Summary:");
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   📝 Total: ${rows.length}`);
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
regenerateThumbnails();
