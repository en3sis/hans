#!/bin/sh
# Container entrypoint for the bot.
#
# Migrations are NOT applied here — the migrate/migrate sidecar runs to
# completion before this container starts (see compose `depends_on`).
# We register Discord slash commands and exec the bot.

set -e

echo "📡 Registering Discord slash commands..."
node build/utils/deploy-commands.js

echo "🚀 Starting Hans..."
exec "$@"
