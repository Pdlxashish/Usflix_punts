/**
 * Automatic Route Updater Script
 * This script updates all route files to add user-level data isolation
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesDir = path.join(__dirname, '../src/routes');

// Routes that need updating
const routesToUpdate = [
  { file: 'banners.ts', table: 'hero_banners' },
  { file: 'milestones.ts', table: 'milestones' },
  { file: 'bucket-list.ts', table: 'bucket_list' },
  { file: 'mood-board.ts', table: 'mood_board' },
  { file: 'playlist.ts', table: 'playlist_songs' },
  { file: 'quiz.ts', table: 'quiz_questions' },
  { file: 'greetings.ts', table: 'time_greetings' },
  { file: 'mood-of-day.ts', table: 'mood_of_day' },
  { file: 'love-letters.ts', table: 'love_letters' },
  { file: 'canvas.ts', table: 'canvas_drawings' },
  { file: 'branding.ts', table: 'branding' },
];

// Helper function to add requireUserAuth import
function addUserAuthImport(content) {
  if (content.includes('requireUserAuth')) {
    return content; // Already has the import
  }
  
  // Find the line with requireAuth import
  const importLine = 'import { requireAuth } from "../middleware/auth.js";';
  if (content.includes(importLine)) {
    return content.replace(
      importLine,
      `import { requireAuth } from "../middleware/auth.js";\nimport { requireUserAuth } from "../middleware/userAuth.js";`
    );
  }
  
  return content;
}

// Helper to add user_id to SELECT queries
function addUserFilterToSelect(content, tableName) {
  // Pattern: SELECT ... FROM table_name WHERE ...
  const selectPattern = new RegExp(
    `(SELECT .+ FROM ${tableName})(?! .+user_id)(?! WHERE .+user_id)([^;]*)`,
    'g'
  );
  
  return content.replace(selectPattern, (match, selectPart, rest) => {
    // If already has WHERE clause
    if (rest.includes('WHERE')) {
      return `${selectPart}${rest.replace('WHERE', 'WHERE user_id = $1 AND')}`;
    }
    // Add WHERE clause
    return `${selectPart} WHERE user_id = $1${rest}`;
  });
}

// Helper to add user_id to INSERT queries
function addUserToInsert(content, tableName) {
  // Pattern: INSERT INTO table_name (...) VALUES (...)
  const insertPattern = new RegExp(
    `(INSERT INTO ${tableName} \\([^)]+)(\\) VALUES \\([^)]+)(\\))`,
    'g'
  );
  
  return content.replace(insertPattern, (match, insertStart, valuesMiddle, insertEnd) => {
    if (insertStart.includes('user_id')) {
      return match; // Already has user_id
    }
    return `${insertStart}, user_id${valuesMiddle}, userId${insertEnd}`;
  });
}

// Main update function
function updateRouteFile(filePath, tableName) {
  console.log(`\n📝 Updating ${path.basename(filePath)}...`);
  
  try {
    // Read file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Backup original
    const backupPath = filePath + '.BACKUP';
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, content);
      console.log(`  ✅ Created backup`);
    }
    
    // Add imports
    content = addUserAuthImport(content);
    
    // Update GET routes - change async (_req to async (req and add requireUserAuth
    content = content.replace(
      /router\.get\("([^"]+)",\s*async\s*\(_req:\s*Request,\s*res:\s*Response\)/g,
      'router.get("$1", requireUserAuth, async (req: Request, res: Response)'
    );
    
    // Add user filtering to queries (simplified - you'll need to manually verify)
    console.log(`  ℹ️  Please manually add user_id filters to SQL queries`);
    console.log(`  ℹ️  Please manually add user_id to INSERT statements`);
    console.log(`  ℹ️  Please manually add AND user_id=$ to UPDATE/DELETE WHERE clauses`);
    
    // Write updated content
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Updated ${path.basename(filePath)}`);
    
    return true;
  } catch (error) {
    console.error(`  ❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Run updates
console.log('🚀 Starting automatic route updates...\n');
console.log('This script will:');
console.log('1. Add requireUserAuth import');
console.log('2. Update GET route signatures');
console.log('3. Create backups of original files\n');
console.log('⚠️  You will still need to manually update SQL queries!\n');

let successCount = 0;
let failCount = 0;

for (const route of routesToUpdate) {
  const filePath = path.join(routesDir, route.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${route.file}`);
    failCount++;
    continue;
  }
  
  const success = updateRouteFile(filePath, route.table);
  if (success) {
    successCount++;
  } else {
    failCount++;
  }
}

console.log(`\n✅ Successfully updated: ${successCount} files`);
if (failCount > 0) {
  console.log(`❌ Failed: ${failCount} files`);
}

console.log(`\n📋 NEXT STEPS:`);
console.log(`1. Review each updated file and manually add user_id to SQL queries`);
console.log(`2. Use the patterns from content.ts as reference`);
console.log(`3. Test each route with multiple users`);
console.log(`4. Restart backend: npm run dev\n`);
