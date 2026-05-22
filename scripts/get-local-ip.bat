@echo off
REM Windows batch script to find local IP address

echo.
echo Finding your local IP address for mobile testing...
echo.

ipconfig | findstr /i "IPv4"

echo.
echo Update your .env file with one of the IPs above:
echo VITE_API_URL=http://YOUR_IP_HERE:3001
echo.
echo Update your backend/.env file:
echo FRONTEND_URL=http://YOUR_IP_HERE:5173
echo.
echo Then restart both servers and access from phone:
echo http://YOUR_IP_HERE:5173
echo.

pause
