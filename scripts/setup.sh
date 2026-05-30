#!/bin/bash
set -e

echo "================================================"
echo "NextGen ERP — First Time Setup"
echo "================================================"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Install Node 20+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version must be 20 or higher"
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check .env file
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Copying from .env.example"
    cp .env.example .env
    echo "📝 Please edit .env with your real values before continuing"
    echo "   Required: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL"
    exit 1
fi
echo "✅ .env file found"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npx prisma generate

# Push database schema
echo "🗄️  Pushing database schema..."
npx prisma db push

# Seed database
echo "🌱 Seeding database..."
npm run db:seed

echo "================================================"
echo "✅ Setup complete!"
echo "Run: npm run dev"
echo "================================================"
