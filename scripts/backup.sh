#!/bin/bash
set -e

DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

echo "📦 Creating database backup..."

if [ -z "$DATABASE_URL" ]; then
    source .env
fi

pg_dump $DATABASE_URL > $BACKUP_DIR/nextgen_erp_$DATE.sql
gzip $BACKUP_DIR/nextgen_erp_$DATE.sql

# Keep only last 30 backups
ls -t $BACKUP_DIR/*.sql.gz | tail -n +31 | xargs rm -f 2>/dev/null || true

echo "✅ Backup saved: $BACKUP_DIR/nextgen_erp_$DATE.sql.gz"
echo "📊 All backups:"
ls -lh $BACKUP_DIR/*.sql.gz 2>/dev/null || echo "No backups found"
