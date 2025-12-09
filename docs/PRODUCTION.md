# Hans - Production Deployment

Deploy Hans Discord Bot to a production server.

## Requirements

- Docker & Docker Compose
- Discord Application ([Developer Portal](https://discord.com/developers/applications))

## Quick Deploy

Run on your server:

```bash
curl -fsSL https://raw.githubusercontent.com/en3sis/hans/main/scripts/deploy.sh | bash
```

This will:
1. Create `~/hans` directory
2. Download `docker-compose.yaml` and `.env.template`
3. Prompt you to configure `.env`
4. Start PostgreSQL, Redis, and the bot

## Manual Setup

```bash
mkdir ~/hans && cd ~/hans

# Download files
curl -fsSL https://raw.githubusercontent.com/en3sis/hans/main/docker-compose.yaml -o docker-compose.yaml
curl -fsSL https://raw.githubusercontent.com/en3sis/hans/main/.env.template -o .env

# Edit configuration
nano .env

# Start
docker compose up -d
```

## Configuration

Edit `.env` with your values:

```bash
# Required
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
POSTGRES_PASSWORD=secure_random_password
BOT_GUILD_ID=your_guild_id

# Optional (for plugins)
OPENAI_API_KEY=
WEATHER_API=
TWITCH_CLIENT=
TWITCH_SECRET=
```

## Commands

```bash
# View logs
docker compose logs -f bot

# Restart bot
docker compose restart bot

# Stop everything
docker compose down

# Update to latest version
docker compose pull && docker compose up -d

# View status
docker compose ps
```

## Database

Data is persisted in Docker volumes:
- `postgres_data` - PostgreSQL database
- `redis_data` - Redis cache

Migrations run automatically on bot startup.

### Backup

```bash
# Backup database
docker compose exec postgres pg_dump -U hans hans_db > backup.sql

# Restore database
docker compose exec -T postgres psql -U hans hans_db < backup.sql
```

## Architecture

```
┌─────────────────────────────────────────────┐
│                 Docker Network              │
│                                             │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  │
│  │  hans   │  │ postgres │  │   redis   │  │
│  │  (bot)  │──│  :5432   │  │   :6379   │  │
│  └─────────┘  └──────────┘  └───────────┘  │
│                     │                       │
│              ┌──────┴──────┐               │
│              │   volumes   │               │
│              │ (persistent)│               │
│              └─────────────┘               │
└─────────────────────────────────────────────┘
```

## Troubleshooting

**Bot not starting?**
```bash
docker compose logs bot
```

**Database connection issues?**
```bash
docker compose logs postgres
docker compose exec postgres pg_isready -U hans
```

**Reset everything (⚠️ deletes data):**
```bash
docker compose down -v
docker compose up -d
```
