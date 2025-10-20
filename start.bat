@echo off
echo 🚀 Starting GYANARATNA Platform...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js is installed

REM Check if frontend .env.local file exists
if not exist "frontend\.env.local" (
    echo ⚠️  Frontend .env.local file not found. Copying from example...
    copy "frontend\.env.local.example" "frontend\.env.local"
)

echo.
echo 📦 Installing frontend dependencies...

cd frontend
call npm install
if errorlevel 1 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)

cd ..

echo.
echo ✅ Dependencies installed successfully!
echo.
echo 🌐 Starting Next.js dev server on http://localhost:3000
echo A new terminal window will open; press Ctrl+C there to stop the server.
echo.

start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo 🎉 Next.js dev server starting in the new window.
echo Visit http://localhost:3000 once it reports ready.
echo.
pause
