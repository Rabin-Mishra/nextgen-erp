#!/bin/bash
set -e

echo "================================================"
echo "NextGen ERP — Docker Start"
echo "================================================"

# Check .env exists
if [ ! -f .env ]; then
    echo "❌ No .env file found. Copy .env.example to .env"
    exit 1
fi

# Build and start containers
echo "🐳 Building Docker containers..."
docker compose build

echo "🚀 Starting containers..."
docker compose up -d

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "🗄️  Running database migrations..."
docker compose run --rm migrate

echo "================================================"
echo "✅ Application is running!"
echo "Open: http://localhost:3000"
echo "================================================"
