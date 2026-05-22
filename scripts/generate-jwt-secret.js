#!/usr/bin/env node
/**
 * Generate a secure JWT secret
 * Usage: node scripts/generate-jwt-secret.js
 */
import crypto from 'crypto';

const secret = crypto.randomBytes(32).toString('hex');
console.log('\n🔐 Generated JWT Secret:');
console.log('─'.repeat(70));
console.log(secret);
console.log('─'.repeat(70));
console.log('\n📝 Add this to your .env file:');
console.log(`JWT_SECRET=${secret}`);
console.log('\n⚠️  Keep this secret safe and never commit it to version control!\n');
