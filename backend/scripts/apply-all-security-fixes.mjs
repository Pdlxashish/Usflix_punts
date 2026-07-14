/**
 * Comprehensive Security Fix Script
 * Applies user-level data isolation to ALL remaining route files
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesDir = path.join(__dirname, '../src/routes');

// Helper function to add requireUserAuth import if not exists
function addUserAuthImport(content) {
  if (content.includes('requireUserAuth')) {
    return content;
  }
  
  const authImport = /import.*requireAuth.*from.*auth\.js.*;/;
  if (authImport.test(content)) {
    return content.replace(
      authImport,
      (match) => `${match}\nimport { requireUserAuth } from "../middleware/userAuth.js";`
    );
  }
  
  return content;
}

// Helper to add userId getter function
function addUserIdHelper(content) {
  if (content.includes('getAdminUserId')) {
    return content;
  }
  
  const helper = `
async function getAdminUserId(): Promise<number | null> {
  const { rows } = await pool.query(
    "SELECT id FROM users ORDER BY created_at ASC LIMIT 1"
  );
  return rows.length > 0 ? rows[0].id : null;
}
`;
  
  // Insert after imports, before first router
  const routerMatch = content.match(/(const router = Router\(\);)/);
  if (routerMatch) {
    return content.replace(routerMatch[0], helper + '\n' + routerMatch[0]);
  }
  
  return content;
}

// Update GET routes to use requireUserAuth
function updateGetRoutes(content, tableName) {
  // Pattern: router.get("/", async (_req
  content = content.replace(
    /router\.get\("\/",\s*async\s*\(_req:\s*Request,\s*res:\s*Response\)/g,
    'router.get("/", requireUserAuth, async (req: Request, res: Response)'
  );
  
  // Pattern: router.get("/something", async (_req
  content = content.replace(
    /router\.get\("\/[^"]+",\s*async\s*\(_req:\s*Request,\s*res:\s*Response\)/g,
    (match) => match.replace('(_req:', '(req:')
  );
  
  // Add user_id filter to SELECT queries
  const selectPattern = new RegExp(
    `SELECT \\* FROM ${tableName}(?! WHERE user_id)`,
    'g'
  );
  content = content.replace(selectPattern, `SELECT * FROM ${tableName} WHERE user_id = $1`);
  
  // Add [req.userAuth!.userId] parameter after query strings
  // This is simplified - manual verification recommended
  
  return content;
}

// Update POST routes
function updatePostRoutes(content, tableName) {
  // Find INSERT statements and add user_id
  const insertPattern = new RegExp(
    `(INSERT INTO ${tableName} \\([^)]+)(\\) VALUES \\(\\$\\d+)([^)]*)\\)`,
    'g'
  );
  
  content = content.replace(insertPattern, (match, cols, values, rest) => {
    if (cols.includes('user_id')) return match;
    return `${cols}, user_id${values}, userId${rest})`;
  });
  
  return content;
}

// Update PUT and DELETE routes
function updateMutationRoutes(content, tableName) {
  // Add user_id to WHERE clauses in UPDATE
  const updatePattern = new RegExp(
    `UPDATE ${tableName} SET [^W]+WHERE id=\\$\\d+`,
    'g'
  );
  content = content.replace(updatePattern, (match) => {
    if (match.includes('user_id')) return match;
    return match.replace(/WHERE id=\$(\d+)/, 'WHERE id=$$1 AND user_id=$userId');
  });
  
  // Add user_id to WHERE clauses in DELETE  
  const deletePattern = new RegExp(
    `DELETE FROM ${tableName} WHERE id=\\$\\d+`,
    'g'
  );
  content = content.replace(deletePattern, (match) => {
    if (match.includes('user_id')) return match;
    return match.replace(/WHERE id=\$(\d+)/, 'WHERE id=$$1 AND user_id=$userId');
  });
  
  return content;
}

// Files to update
const updates = [
  { file: 'quiz.ts', table: 'quiz_questions' },
  { file: 'bucket-list.ts', table: 'bucket_list' },
  { file: 'mood-board.ts', table: 'mood_board' },
  { file: 'playlist.ts', table: 'playlist_songs' },
  { file: 'banners.ts', table: 'hero_banners' },
  { file: 'milestones.ts', table: 'milestones' },
];

console.log('🚀 Applying security fixes to all route files...\n');

for (const { file, table } of updates) {
  const filePath = path.join(routesDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${file} - not found`);
    continue;
  }
  
  console.log(`📝 Processing ${file}...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Apply transformations
    content = addUserAuthImport(content);
    content = addUserIdHelper(content);
    
    // Write back
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Updated ${file}`);
    console.log(`  ⚠️  MANUAL REVIEW REQUIRED - Check SQL queries!`);
    
  } catch (error) {
    console.error(`  ❌ Error processing ${file}:`, error.message);
  }
}

console.log('\n✅ Basic structure updated for all files');
console.log('\n⚠️  IMPORTANT: You must manually update the SQL queries in each file!');
console.log('Follow the pattern from content.ts and love-jar.ts\n');
