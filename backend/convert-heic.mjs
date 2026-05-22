import heicConvert from 'heic-convert';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Punts1803@localhost:5432/usflix' });
const UPLOAD_DIR = './uploads';

const { rows } = await pool.query(
  "SELECT id, thumbnail, photos FROM media_items WHERE thumbnail ILIKE '%.HEIC' OR thumbnail ILIKE '%.HEIF'"
);

console.log(`Found ${rows.length} items to convert`);

for (const row of rows) {
  if (!row.thumbnail) continue;
  
  const filename = row.thumbnail.replace('/uploads/', '');
  const srcPath = path.join(UPLOAD_DIR, filename);
  const jpgFilename = filename.replace(/\.(heic|heif)$/i, '.jpg');
  const jpgPath = path.join(UPLOAD_DIR, jpgFilename);

  if (!fs.existsSync(srcPath)) {
    console.log('File not found:', srcPath);
    continue;
  }

  try {
    const inputBuffer = fs.readFileSync(srcPath);
    const outputBuffer = await heicConvert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.9,
    });

    fs.writeFileSync(jpgPath, Buffer.from(outputBuffer));
    fs.unlinkSync(srcPath);

    const newThumb = '/uploads/' + jpgFilename;

    // Fix photos array
    let photos = row.photos || [];
    const newPhotos = photos.map(p => {
      if (typeof p === 'string') return p.replace(/\.(heic|heif)$/i, '.jpg');
      if (p && p.src) return { ...p, src: p.src.replace(/\.(heic|heif)$/i, '.jpg') };
      return p;
    });

    await pool.query(
      'UPDATE media_items SET thumbnail=$1, photos=$2 WHERE id=$3',
      [newThumb, JSON.stringify(newPhotos), row.id]
    );

    console.log('✅ Converted:', row.id, filename, '->', jpgFilename);
  } catch (e) {
    console.error('❌ Failed:', row.id, e.message);
  }
}

await pool.end();
console.log('Done!');
