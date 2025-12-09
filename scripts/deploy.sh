#!/bin/bash
set -e

# Hans Discord Bot - Production Deployment Script
# Usage: curl -fsSL https://raw.githubusercontent.com/en3sis/hans/main/scripts/deploy.sh | bash

HANS_DIR="${HANS_DIR:-$HOME/hans}"
REPO_URL="https://raw.githubusercontent.com/en3sis/hans/main"

echo "🤖 Hans Discord Bot - Deployment Script"
echo "========================================"

# Create directory
mkdir -p "$HANS_DIR"
cd "$HANS_DIR"

# Download required files
echo "📥 Downloading deployment files..."
curl -fsSL "$REPO_URL/docker-compose.yaml" -o docker-compose.yaml
curl -fsSL "$REPO_URL/.env.template" -o .env.template

# Check for .env file
if [ ! -f ".env" ]; then
    cp .env.template .env
    echo ""
    echo "⚠️  Created .env file from template."
    echo "   Please edit $HANS_DIR/.env with your configuration:"
    echo ""
    echo "   Required variables:"
    echo "   - DISCORD_TOKEN"
    echo "   - DISCORD_CLIENT_ID"
    echo "   - POSTGRES_PASSWORD (set a secure password)"
    echo "   - BOT_GUILD_ID"
    echo ""
    echo "   Run this script again after configuring .env"
    exit 0
fi

# Validate required env vars
source .env
MISSING_VARS=""
[ -z "$DISCORD_TOKEN" ] && MISSING_VARS="$MISSING_VARS DISCORD_TOKEN"
[ -z "$DISCORD_CLIENT_ID" ] && MISSING_VARS="$MISSING_VARS DISCORD_CLIENT_ID"
[ -z "$POSTGRES_PASSWORD" ] && MISSING_VARS="$MISSING_VARS POSTGRES_PASSWORD"

if [ -n "$MISSING_VARS" ]; then
    echo "❌ Missing required environment variables:$MISSING_VARS"
    echo "   Please edit $HANS_DIR/.env"
    exit 1
fi

# Pull latest images
echo "📦 Pulling latest images..."
docker compose pull

# Start services
echo "🚀 Starting services..."
docker compose up -d

# Wait and show logs
echo "⏳ Waiting for services to start..."
sleep 5

echo ""
echo "✅ Hans deployment complete!"
echo ""
docker compose ps
echo ""
echo "📋 Useful commands:"
echo "   cd $HANS_DIR"
echo "   docker compose logs -f bot    # View bot logs"
echo "   docker compose restart bot    # Restart bot"
echo "   docker compose down           # Stop all services"
echo "   docker compose pull && docker compose up -d  # Update"
echo ""
