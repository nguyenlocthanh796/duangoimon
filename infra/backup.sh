#!/bin/bash
# PostgreSQL backup script
# Schedule daily: 0 3 * * * /opt/posa/infra/backup.sh

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
DB_NAME="${DB_NAME:-pos_db}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M)
FILENAME="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# Extract password from DATABASE_URL if available
if [ -f /app/.env ]; then
    source /app/.env
fi

export PGPASSWORD="${PGPASSWORD:-${DATABASE_URL#*:}}"
PGPASSWORD="${PGPASSWORD%%@*}"

pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl | gzip > "$FILENAME"

# Remove backups older than retention
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup saved: $FILENAME ($(du -h "$FILENAME" | cut -f1))"
