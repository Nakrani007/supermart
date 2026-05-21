@echo off
echo Starting SuperMart...

echo [1/2] Starting Backend (port 5000)...
start "SuperMart Backend" cmd /k "cd /d D:\Milan\store\backend && node src/server.js"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend (port 5173)...
start "SuperMart Frontend" cmd /k "cd /d D:\Milan\store\frontend && npx vite --host"

echo.
echo Both servers starting in separate windows.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5000
echo Database: http://localhost:5555  (run: cd backend ^&^& npx prisma studio)
