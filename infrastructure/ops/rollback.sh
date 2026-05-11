#!/usr/bin/env bash
# Restore the Postgres database from a pg_dump and restart the bot.
#
# Usage:
#   ./rollback.sh                                       # latest backup
#   ./rollback.sh ./data/backups/hans-<ts>.dump         # specific backup

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-$PWD}"
cd "$DEPLOY_DIR"

COMPOSE_FILE="infrastructure/compose/docker-compose.yaml"
dc() { docker compose -f "$COMPOSE_FILE" --project-directory . "$@"; }

DB_USER="${POSTGRES_USER:-hans}"
DB_NAME="${POSTGRES_DB:-hans}"

BACKUP="${1:-}"
if [ -z "$BACKUP" ]; then
  BACKUP=$(ls -t ./data/backups/hans-*.dump 2>/dev/null | head -1 || true)
fi
if [ -z "$BACKUP" ] || [ ! -f "$BACKUP" ]; then
  echo "❌ No backup found. Specify a path or check ./data/backups/."
  exit 1
fi

echo "About to restore: $BACKUP"
echo "Current $DB_NAME will be dropped and recreated."
read -r -p "Continue? [y/N] " ans
[[ "${ans:-}" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

# Stop the bot so it doesn't write during the restore. Leave the db up.
dc stop bot

# Stream the dump into pg_restore --clean so existing objects are dropped first.
docker exec -i hans-db pg_restore \
  --clean --if-exists --no-owner --no-acl \
  -U "$DB_USER" -d "$DB_NAME" < "$BACKUP"

echo "✅ Restored $BACKUP"

dc up -d bot
sleep 4
dc ps
dc logs --tail=40 bot
