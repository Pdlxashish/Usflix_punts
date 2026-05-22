#!/usr/bin/env node

/**
 * Get Local IP Address for Mobile Testing
 * Run: node scripts/get-local-ip.js
 */

const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          name,
          address: iface.address,
          primary: iface.address.startsWith('192.168') || iface.address.startsWith('10.0')
        });
      }
    }
  }

  return addresses;
}

console.log('\n🔍 Finding your local IP address for mobile testing...\n');

const addresses = getLocalIP();

if (addresses.length === 0) {
  console.log('❌ No network interfaces found.');
  console.log('   Make sure you\'re connected to WiFi or Ethernet.\n');
  process.exit(1);
}

console.log('📱 Your Local IP Addresses:\n');

const primary = addresses.find(a => a.primary);

addresses.forEach(({ name, address, primary }) => {
  const marker = primary ? '✅ (Recommended)' : '  ';
  console.log(`   ${marker} ${address.padEnd(15)} (${name})`);
});

console.log('\n📝 Update your .env file:\n');

const DEV_PORT = 8080;

if (primary) {
  console.log(`   VITE_API_URL=http://${primary.address}:3001\n`);
  console.log('📝 Update your backend/.env file:\n');
  console.log(`   FRONTEND_URL=https://${primary.address}:${DEV_PORT}\n`);
  console.log('📱 Access from your phone (HTTPS — required for GPS/map):\n');
  console.log(`   https://${primary.address}:${DEV_PORT}\n`);
  console.log('   Accept the browser security warning (self-signed dev certificate).\n');
  console.log('⚠️  Make sure your phone is on the same WiFi network!\n');
} else {
  console.log(`   VITE_API_URL=http://${addresses[0].address}:3001\n`);
  console.log('   (Choose the IP that matches your network)\n');
}

console.log('💡 Tip: After updating .env files, restart both servers:\n');
console.log('   1. Stop servers (Ctrl+C)');
console.log('   2. cd backend && npm run dev');
console.log('   3. (new terminal) npm run dev\n');
