#!/usr/bin/env bash
# Manual production deploy. Run this ON the VPS, from ~/hans.
#
# Assumes the host already has:
#   ~/hans/.env                                         (production secrets)
#   ~/hans/infrastructure/compose/docker-compose.yaml   (uploaded manually)
#   ~/hans/infrastructure/ops/{deploy,rollback,backup}.sh
#
# What it does:
#   1. pg_dump the current db (skipped on first deploy).
#   2. Pull the new bot image.
#   3. `docker compose up -d` (db + bot).
#
# Migrations are NOT part of deploy. Apply them separately from your
# laptop over Tailscale:
#
#   DATABASE_URL=postgres://hans:****@hans-prod.<tailnet>.ts.net:5432/hans \
#     yarn db:migrate:remote
#
# Apply schema-additive migrations BEFORE running this script; apply
# destructive ones AFTER. See infrastructure/README.md.
#
# Environment:
#   IMAGE_TAG   bot image tag to deploy (default: nightly)

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-$PWD}"
cd "$DEPLOY_DIR"

COMPOSE_FILE="infrastructure/compose/docker-compose.yaml"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ Missing $COMPOSE_FILE under $DEPLOY_DIR."
  echo "   Upload it manually from the repo before running deploy."
  exit 1
fi
if [ ! -f .env ]; then
  echo "❌ No .env found in $DEPLOY_DIR."
  exit 1
fi

dc() { docker compose -f "$COMPOSE_FILE" --project-directory . "$@"; }

mkdir -p ./data ./data/pg ./data/backups

echo "── 💾 Pre-deploy backup ──"
if docker ps --format '{{.Names}}' | grep -qx hans-db; then
  ./infrastructure/ops/backup.sh || echo "⚠️  Backup failed (continuing)"
else
  echo "ℹ️  hans-db not running — assuming first deploy."
fi

if [ -n "${IMAGE_TAG:-}" ] && [ "$IMAGE_TAG" != "nightly" ]; then
  echo "── 🏷  Overriding bot image tag to $IMAGE_TAG ──"
  export HANS_IMAGE="en3sis/hans:$IMAGE_TAG"
fi

echo "── 📥 Pulling images ──"
dc pull

echo "── 🚀 Bringing stack up ──"
dc up -d --remove-orphans

echo "── 🩺 Stack status ──"
sleep 5
dc ps

echo "── 📜 Recent bot logs ──"
dc logs --tail=40 bot

echo
echo "ℹ️  If this deploy included schema changes, apply them now from your laptop:"
echo "    DATABASE_URL=postgres://hans:****@<tailnet-host>:5432/hans yarn db:migrate:remote"
