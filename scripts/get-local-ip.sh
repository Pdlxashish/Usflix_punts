#!/bin/bash

# Get Local IP Address for Mobile Testing
# Run: bash scripts/get-local-ip.sh

echo ""
echo "🔍 Finding your local IP address for mobile testing..."
echo ""

# Try different methods based on OS
if command -v ifconfig &> /dev/null; then
    echo "📱 Your Local IP Addresses:"
    echo ""
    ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print "   " $2}'
elif command -v ip &> /dev/null; then
    echo "📱 Your Local IP Addresses:"
    echo ""
    ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print "   " $2}' | cut -d/ -f1
else
    echo "❌ Could not find network tools (ifconfig or ip)"
    echo "   Try running: node scripts/get-local-ip.js"
    exit 1
fi

echo ""
echo "📝 Update your .env file:"
echo "   VITE_API_URL=http://YOUR_IP_HERE:3001"
echo ""
echo "📝 Update your backend/.env file:"
echo "   FRONTEND_URL=http://YOUR_IP_HERE:5173"
echo ""
echo "📱 Access from your phone:"
echo "   http://YOUR_IP_HERE:5173"
echo ""
echo "⚠️  Make sure your phone is on the same WiFi network!"
echo ""
echo "💡 Tip: After updating .env files, restart both servers"
echo ""
