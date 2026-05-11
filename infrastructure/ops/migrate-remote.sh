#!/usr/bin/env bash
# Apply pending Drizzle migrations to a remote Postgres.
#
# Reachability is your responsibility — typical setup is Tailscale:
# the prod Postgres listens on 127.0.0.1:5432 inside the host, and
# Tailscale forwards your laptop's connection (via `tailscale serve`)
# without ever exposing the port to the internet.
#
# The migrator is `drizzle-kit migrate`, same command used locally.
# Migration files in /drizzle are the source of truth — applied
# by content hash, so local and remote stay byte-for-byte identical.
#
# Usage:
#   DATABASE_URL=postgres://hans:****@hans-prod.tailnet-name.ts.net:5432/hans_db \
#     yarn db:migrate:remote
#
# Or set it once in your shell rc / direnv and just run:
#   yarn db:migrate:remote

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL is required."
  echo
  echo "Example (Tailscale):"
  echo "  DATABASE_URL=postgres://hans:****@hans-prod.tailnet-name.ts.net:5432/hans_db \\"
  echo "    yarn db:migrate:remote"
  echo
  echo "Tip: yarn db:status to preview what would be applied without changing anything."
  exit 1
fi

# Mask password for the user-visible target line.
DISPLAY_URL="$(echo "$DATABASE_URL" | sed -E 's#(://[^:]+:)[^@]+@#\1***@#')"
echo "🎯 Target: $DISPLAY_URL"
echo

exec npx drizzle-kit migrate
