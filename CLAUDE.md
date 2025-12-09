# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (starts PostgreSQL container + runs migrations + nodemon)
yarn dev

# Build
yarn build

# Deploy slash commands
yarn slash:dev    # Development (guild-specific, instant)
yarn slash        # Production (global, ~1 second delay)

# Database (Drizzle ORM)
yarn db:migrate   # Run migrations
yarn db:push      # Push schema to database (dev)
yarn db:studio    # Open Drizzle Studio GUI
npx drizzle-kit pull  # Pull schema from existing database (NEVER auto-generate)

# Tests
yarn test                           # Run all tests
yarn test -- --testPathPattern=foo  # Run single test

# Lint & Format
yarn lint
yarn format
```

## Architecture

Hans is a Discord bot built with Discord.js and TypeScript, using a plugin-based architecture.

### Core Flow

1. **Entry point** (`src/index.ts`): Creates Discord client, loads commands from `src/commands/`, registers event handlers from `src/events/`
2. **Ready event** (`src/events/ready.ts`): On bot startup, inserts config/plugins to DB, syncs guilds, sets presence, starts cron jobs
3. **Interaction handler** (`src/events/interactionCreate.ts`): Routes slash commands to their handlers, handles buttons/modals

### Key Directories

- `src/commands/` - Slash command definitions (global commands)
- `src/commands/bots-playground/` - Development commands (guild-specific, instant deploy)
- `src/controllers/` - Business logic organized by domain (bot, plugins, events, tasks)
- `src/db/schema/` - Drizzle ORM schema (generated via `drizzle-kit pull`)
- `src/events/` - Discord.js event handlers
- `src/models/` - Plugin definitions and initial states
- `src/types/` - TypeScript type definitions

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

Optional plugins: `OPENAI_API_KEY`, `WEATHER_API`, `TWITCH_CLIENT/SECRET`, `HUGGINGFACE_API_KEY`
