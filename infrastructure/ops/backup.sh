#!/usr/bin/env bash
# Postgres backup via `pg_dump` running inside the db container.
# Output: ./data/backups/hans-<ts>.dump (custom format, suitable for pg_restore)
#
# Usage:
#   ./infrastructure/ops/backup.sh
#   RETENTION=30 ./infrastructure/ops/backup.sh

set -euo pipefail

RETENTION="${RETENTION:-14}"
DB_USER="${POSTGRES_USER:-hans}"
DB_NAME="${POSTGRES_DB:-hans}"
BACKUP_DIR="./data/backups"

if ! docker ps --format '{{.Names}}' | grep -qx hans-db; then
  echo "❌ hans-db container is not running. Start the stack first."
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT="$BACKUP_DIR/hans-$STAMP.dump"

echo "💾 Dumping $DB_NAME → $OUT"
docker exec hans-db pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -Z 9 > "$OUT"

# Retention: keep the newest $RETENTION dumps.
ls -t "$BACKUP_DIR"/hans-*.dump 2>/dev/null | tail -n +$((RETENTION + 1)) | xargs -r rm
echo "🧹 Retained newest $RETENTION backups in $BACKUP_DIR"
