import dotenv from "dotenv";
import heicConvert from "heic-convert";
import fs from "fs";
import path from "path";
import pg from "pg";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Copy backend/.env.example to backend/.env first.");
}

const pool = new pg.Pool({ connectionString: databaseUrl });
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

const { rows } = await pool.query(
  "SELECT id, thumbnail, photos FROM media_items WHERE thumbnail ILIKE '%.HEIC' OR thumbnail ILIKE '%.HEIF'",
);

console.log(`Found ${rows.length} HEIC/HEIF items to convert`);

for (const row of rows) {
  if (!row.thumbnail) continue;

  const filename = row.thumbnail.replace("/uploads/", "");
  const srcPath = path.join(UPLOAD_DIR, filename);
  const jpgFilename = filename.replace(/\.(heic|heif)$/i, ".jpg");
  const jpgPath = path.join(UPLOAD_DIR, jpgFilename);

  if (!fs.existsSync(srcPath)) {
    console.log("File not found:", srcPath);
    continue;
  }

  try {
    const inputBuffer = fs.readFileSync(srcPath);
    const outputBuffer = await heicConvert({
      buffer: inputBuffer,
      format: "JPEG",
      quality: 0.9,
    });

    fs.writeFileSync(jpgPath, Buffer.from(outputBuffer));
    fs.unlinkSync(srcPath);

    const newThumb = `/uploads/${jpgFilename}`;
    const photos = row.photos || [];
    const newPhotos = photos.map((photo) => {
      if (typeof photo === "string") {
        return photo.replace(/\.(heic|heif)$/i, ".jpg");
      }
      if (photo && photo.src) {
        return { ...photo, src: photo.src.replace(/\.(heic|heif)$/i, ".jpg") };
      }
      return photo;
    });

    await pool.query("UPDATE media_items SET thumbnail=$1, photos=$2 WHERE id=$3", [
      newThumb,
      JSON.stringify(newPhotos),
      row.id,
    ]);

    console.log("Converted:", row.id, filename, "->", jpgFilename);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed:", row.id, message);
  }
}

await pool.end();
console.log("Done.");
