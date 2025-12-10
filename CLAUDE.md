# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (starts PostgreSQL container + runs migrations + watch mode)
bun run dev

# Build
bun run build

# Deploy slash commands
bun run slash:dev    # Development (guild-specific, instant)
bun run slash        # Production (global, ~1 second delay)

# Database (Drizzle ORM)
bun run db:migrate   # Run migrations
bun run db:push      # Push schema to database (dev)
bun run db:studio    # Open Drizzle Studio GUI
bunx drizzle-kit pull  # Pull schema from existing database (NEVER auto-generate)

# Tests
bun test                    # Run all tests
bun test --filter=foo       # Run single test

# Lint & Format
bun run lint
bun run format
```

## Architecture

Hans is a Discord bot built with Discord.js and TypeScript, using a plugin-based architecture. It runs on Bun runtime.

### Core Flow

1. **Entry point** (`src/index.ts`): Creates Discord client, loads commands from `src/commands/`, registers event handlers from `src/events/`, starts the API server
2. **Ready event** (`src/events/ready.ts`): On bot startup, inserts config/plugins to DB, syncs guilds, sets presence, starts cron jobs
3. **Interaction handler** (`src/events/interactionCreate.ts`): Routes slash commands to their handlers, handles buttons/modals
4. **API server** (`src/api/`): Bun HTTP server for dashboard management (port 3009)

### Key Directories

- `src/commands/` - Slash command definitions (global commands)
- `src/commands/bots-playground/` - Development commands (guild-specific, instant deploy)
- `src/controllers/` - Business logic organized by domain (bot, plugins, events, tasks)
- `src/db/schema/` - Drizzle ORM schema (generated via `drizzle-kit pull`)
- `src/events/` - Discord.js event handlers
- `src/models/` - Plugin definitions and initial states
- `src/types/` - TypeScript type definitions
- `src/api/` - REST API for web dashboard

### API Server

The bot includes a REST API (Bun.serve) for the web dashboard at `hans-app/`:

- `GET /api/v1/health` - Health check
- `GET /api/v1/guilds` - List user's manageable guilds (requires Discord OAuth token)
- `GET /api/v1/guilds/:id` - Get guild details + plugins
- `PATCH /api/v1/guilds/:id/plugins/:name` - Update plugin settings

### Plugin System

Plugins are defined in `src/models/plugins.model.ts` with metadata (category, premium, enabled). Each guild can enable/configure plugins via the `/plugins` command. Plugin logic lives in `src/controllers/plugins/`.

Guild-specific plugin settings are stored in `guilds_plugins` table with JSONB `metadata` column for flexible configuration.

### Database

Uses Drizzle ORM with PostgreSQL. Tables: `configs`, `guilds`, `plugins`, `guilds_plugins`, `guild_quests`, `users_settings`.

**Schema management**: Always use `drizzle-kit pull` to generate schema from the database. Never manually create or auto-generate schemas.

### Command Structure

Commands export: `data` (SlashCommandBuilder), `execute` (handler function), and optionally `ephemeral` (boolean).

```typescript
module.exports = {
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName('commandname')
    .setDescription('Description'),
  async execute(interaction: ChatInputCommandInteraction) {
    // Handler logic
  },
}
```

## Environment Variables

Required: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DATABASE_URL`, `BOT_GUILD_ID`

API server: `API_PORT` (default 3009), `API_CORS_ORIGIN` (comma-separated origins)

Optional plugins: `OPENAI_API_KEY`, `WEATHER_API`, `TWITCH_CLIENT/SECRET`, `HUGGINGFACE_API_KEY`
