/**
 * Script to verify all routes properly filter by user_id for multi-tenancy.
 * Scans route files and checks for proper user isolation patterns.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(__dirname, '..', 'src', 'routes');

// Tables that should have user_id filtering
const TABLES_REQUIRING_USER_ID = [
  'hero_banners',
  'branding',
  'profiles',
  'collections',
  'media_items',
  'love_letters',
  'love_jar',
  'mood_board',
  'milestones',
  'quiz_questions',
  'bucket_list',
  'mood_of_day',
  'playlist_songs',
  'canvas_drawings',
  'time_greetings'
];

console.log('🔍 Checking route files for user_id filtering...\n');

const routeFiles = fs.readdirSync(routesDir)
  .filter(f => f.endsWith('.ts') && !f.includes('.SECURE.'));

let issuesFound = 0;
const warnings = [];

for (const file of routeFiles) {
  const filePath = path.join(routesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file uses requireUserAuth
  const hasUserAuth = content.includes('requireUserAuth');
  
  // Check for queries on tables that need user_id
  for (const table of TABLES_REQUIRING_USER_ID) {
    const tableRegex = new RegExp(`FROM\\s+${table}|UPDATE\\s+${table}|INSERT\\s+INTO\\s+${table}|DELETE\\s+FROM\\s+${table}`, 'gi');
    const matches = content.match(tableRegex);
    
    if (matches) {
      // Check if the query includes WHERE user_id or SET user_id
      const hasUserIdFilter = new RegExp(`WHERE.*user_id\\s*=|SET.*user_id\\s*=|VALUES.*req\\.userAuth`, 'i');
      const queryContext = content.substring(
        Math.max(0, content.indexOf(matches[0]) - 200),
        Math.min(content.length, content.indexOf(matches[0]) + 400)
      );
      
      if (!hasUserIdFilter.test(queryContext)) {
        const issue = `⚠️  ${file}: Query on '${table}' may be missing user_id filter`;
        warnings.push(issue);
        issuesFound++;
      }
    }
  }
  
  if (!hasUserAuth && content.includes('router.')) {
    console.log(`⚠️  ${file}: Does not use requireUserAuth middleware`);
  } else if (hasUserAuth) {
    console.log(`✅ ${file}: Uses requireUserAuth`);
  }
}

console.log('\n📋 Query Filtering Warnings:\n');
if (warnings.length > 0) {
  warnings.forEach(w => console.log(w));
  console.log(`\n❌ Found ${issuesFound} potential issues`);
  console.log('\n💡 Note: Some warnings may be false positives if:');
  console.log('   - The query is in a helper function that adds user_id elsewhere');
  console.log('   - The route is admin-only and intentionally queries all users');
  console.log('   - Manual verification is still recommended\n');
} else {
  console.log('✅ No obvious issues found!\n');
}

console.log('🔒 Security Checklist:');
console.log('   1. All user-facing routes use requireUserAuth');
console.log('   2. All SELECT queries include WHERE user_id = $1');
console.log('   3. All INSERT queries include user_id in VALUES');
console.log('   4. All UPDATE queries include WHERE user_id = $1');
console.log('   5. All DELETE queries include WHERE user_id = $1');
console.log('\n✨ Manual review of route files is recommended!\n');
