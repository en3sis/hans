#!/bin/bash
set -e

# Hans Discord Bot - Production Deployment Script
# Usage:
#   Install:  curl -fsSL https://raw.githubusercontent.com/en3sis/hans/main/scripts/deploy.sh | bash
#   Update:   ./deploy.sh update
#   Update + wipe data: ./deploy.sh update --prune

HANS_DIR="${HANS_DIR:-$HOME/hans}"
REPO_URL="https://raw.githubusercontent.com/en3sis/hans/main"
COMMAND="${1:-deploy}"

# Helper: Sync DATABASE_URL from POSTGRES_* vars
sync_database_url() {
    local user="${POSTGRES_USER:-hans}"
    local pass="$POSTGRES_PASSWORD"
    local db="${POSTGRES_DB:-hans_db}"
    local new_url="postgresql://${user}:${pass}@postgres:5432/${db}"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=$new_url|" .env
    else
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=$new_url|" .env
    fi
}

case "$COMMAND" in
    deploy)
        echo "🤖 Hans Discord Bot - Deployment Script"
        echo "========================================"

        # Create directory
        mkdir -p "$HANS_DIR"
        cd "$HANS_DIR"

        # Download required files
        echo "📥 Downloading deployment files..."
        curl -fsSL "$REPO_URL/docker-compose.yaml" -o docker-compose.yaml
        curl -fsSL "$REPO_URL/.env.template" -o .env.template

        CREATED_NEW_ENV=false

        # Create .env from template if it doesn't exist
        if [ ! -f ".env" ]; then
            cp .env.template .env
            CREATED_NEW_ENV=true
        fi

        source .env

        # Generate POSTGRES_PASSWORD if empty or placeholder
        if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "your_secure_password_here" ]; then
            GENERATED_PW=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$GENERATED_PW/" .env
            else
                sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$GENERATED_PW/" .env
            fi

            echo "✅ Generated secure POSTGRES_PASSWORD"

            # Reload env vars after update
            source .env
        fi

        # Sync DATABASE_URL from POSTGRES_* vars
        sync_database_url
        echo "✅ Synced DATABASE_URL"

        # If new .env was created, prompt user to configure Discord vars
        if [ "$CREATED_NEW_ENV" = true ]; then
            echo ""
            echo "⚠️  Created .env file from template."
            echo "   Please edit $HANS_DIR/.env with:"
            echo ""
            echo "   Required variables:"
            echo "   - DISCORD_TOKEN"
            echo "   - DISCORD_CLIENT_ID"
            echo "   - BOT_GUILD_ID"
            echo ""
            echo "   Run this script again after configuring."
            exit 0
        fi

        # Validate required env vars
        MISSING_VARS=""
        [ -z "$DISCORD_TOKEN" ] && MISSING_VARS="$MISSING_VARS DISCORD_TOKEN"
        [ -z "$DISCORD_CLIENT_ID" ] && MISSING_VARS="$MISSING_VARS DISCORD_CLIENT_ID"

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
        echo "   ./deploy.sh update            # Update to latest version"
        echo ""
        ;;

    update)
        cd "$HANS_DIR"

        # Check for --prune flag
        PRUNE_VOLUMES=false
        for arg in "$@"; do
            [ "$arg" = "--prune" ] && PRUNE_VOLUMES=true
        done

        echo "🔄 Updating Hans..."

        # Handle volume pruning
        if [ "$PRUNE_VOLUMES" = true ]; then
            read -p "⚠️  This will DELETE all data (database, redis). Continue? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                docker compose down -v
                echo "🗑️  Volumes removed"
            else
                echo "Cancelled."
                exit 0
            fi
        else
            docker compose down
        fi

        # Download latest docker-compose.yaml
        echo "📥 Downloading latest configuration..."
        curl -fsSL "$REPO_URL/docker-compose.yaml" -o docker-compose.yaml

        # Sync DATABASE_URL in case POSTGRES_* vars changed
        source .env
        sync_database_url

        # Pull latest images and start
        echo "📦 Pulling latest images..."
        docker compose pull

        echo "🚀 Starting services..."
        docker compose up -d

        sleep 5
        echo ""
        echo "✅ Update complete!"
        docker compose ps
        ;;

    *)
        echo "Hans Discord Bot - Deployment Script"
        echo ""
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  deploy    First-time installation (default)"
        echo "  update    Update to latest version"
        echo ""
        echo "Options:"
        echo "  --prune   Remove volumes (fresh database) - use with 'update'"
        echo ""
        echo "Examples:"
        echo "  $0              # First-time deploy"
        echo "  $0 update       # Update to latest"
        echo "  $0 update --prune  # Update and wipe data"
        exit 1
        ;;
esac
