/**
 * Generate a cryptographically secure JWT secret
 * Usage: node scripts/generate-jwt-secret.js
 */

import { randomBytes } from 'crypto';

function generateSecret(length = 64) {
  return randomBytes(length).toString('base64url');
}

console.log('\n🔐 JWT Secret Generator\n');
console.log('Copy these secrets to your .env files:\n');
console.log('JWT_SECRET=' + generateSecret());
console.log('USER_JWT_SECRET=' + generateSecret());
console.log('\n⚠️  Keep these secrets secure and never commit them to git!\n');
