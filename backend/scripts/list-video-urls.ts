import pool from "../src/db/connection.js";

async function listVideoUrls() {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, video_url, category, created_at 
       FROM media_items 
       WHERE type = 'video' AND video_url IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 5`
    );
    
    console.log("\n📹 Sample Video URLs:\n");
    rows.forEach((v, i) => {
      console.log(`${i + 1}. ${v.title}`);
      console.log(`   URL: ${v.video_url}`);
      console.log(`   Category: ${v.category}`);
      console.log(``);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

listVideoUrls();
