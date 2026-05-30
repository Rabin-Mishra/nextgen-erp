#!/bin/bash
set -e

echo "================================================"
echo "NextGen ERP — Production Deployment"
echo "================================================"

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma db push

# Build application
echo "🔨 Building application..."
npm run build

# Restart application (if using PM2)
if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting PM2 process..."
    pm2 restart nextgen-erp || pm2 start npm --name nextgen-erp -- start
else
    echo "⚠️  PM2 not found. Start manually with: npm start"
fi

echo "================================================"
echo "✅ Deployment complete!"
echo "================================================"
