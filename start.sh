#!/bin/bash

echo "🚀 Starting GYANARATNA Platform..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js is installed"

# Ensure frontend environment file exists
if [ ! -f "frontend/.env.local" ] && [ -f "frontend/.env.local.example" ]; then
    echo "⚠️  Frontend .env.local file not found. Copying from example..."
    cp "frontend/.env.local.example" "frontend/.env.local"
    echo "� Update frontend/.env.local with your Supabase credentials"
fi

echo
echo "📦 Installing frontend dependencies..."

cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

echo
echo "🌐 Starting Next.js dev server on http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo

npm run dev
