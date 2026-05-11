<div align="center">
	<br />
	<p>
		<a href="https://hans.app">
            <img src="https://raw.githubusercontent.com/en3sis/hans/main/docs/images/github.png" width="546" alt="Hans, Discord Bot" />
        </a>
	</p>
</div>

![Docker Pulls](https://img.shields.io/docker/pulls/en3sis/hans?style=for-the-badge)
![Docker Image Version (tag latest semver)](https://img.shields.io/docker/v/en3sis/hans/latest?label=production%20image&style=for-the-badge)
![Discord](https://img.shields.io/discord/904719402044383273?style=for-the-badge)

# 🤖 Hans - Discord Bot

Hans is built with a modular architecture that makes it easy to add and remove functionality on the fly, empowering you to create a bot tailored to your community's needs.

Built with [Discord.JS](https://discord.js.org/#/), [TypeScript](https://www.typescriptlang.org/), [Postgres 17](https://www.postgresql.org/), [Drizzle ORM](https://orm.drizzle.team/), and lots of ❤️

## Invite to server

Bring Hans to your Discord server and start using his available features immediately [here 🔗](https://discord.com/oauth2/authorize?client_id=403523619222847488). It uses the latest `hans:nightly` image with the latest features.

The list of commands & plugins can be found [here 🔗](https://github.com/en3sis/hans/wiki/Commands-&-Plugins).

## Developing Hans

> 🪬 **NOTE**: Please consider opening an issue and PR for bugs, suggestions, or new features.

---

### 🔅 Prepare environment

```bash
yarn install
cp .env.template .env
# fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, CRYPTO_KEY, CRYPTO_IV, BOT_GUILD_ID
```

To create your Discord application, visit the [Developer Portal](https://discord.com/developers/docs/intro).

Docker is required for local development — the dev script spins up a
local Postgres 17 container automatically.

### 💾 Database

Hans uses **Postgres 17** with [Drizzle ORM](https://orm.drizzle.team/).
Schema is defined in TypeScript at [`src/db/schema.ts`](src/db/schema.ts)
and migrations are auto-generated into `drizzle/`.

```bash
yarn db:up         # start the dev Postgres + apply migrations
yarn db:psql       # psql into the dev DB
yarn db:studio     # open Drizzle Studio at https://local.drizzle.studio
yarn db:down       # stop the dev DB (data preserved)
yarn db:reset      # wipe and recreate from scratch
```

When you change the schema:

```bash
# 1. Edit src/db/schema.ts
# 2. Generate a migration
yarn db:generate
# 3. Apply it locally
yarn db:migrate
# 4. Commit src/db/schema.ts and the new drizzle/ file
```

Production migrations are applied separately from your laptop over
Tailscale — see [infrastructure/README.md](infrastructure/README.md#migrations).

## 👩🏼‍💻 Development

### `yarn dev`

Starts the dev Postgres container (if not running), applies migrations,
then launches the bot with `nodemon` for live-reload. Invite link prints
to the console on first boot.

### Slash commands

All commands (under `src/commands`) are built with the [Slash Command](https://discordjs.guide/interactions/slash-commands.html) interaction.

> 🪬 **IMPORTANT**: before developing commands, make sure you invite the bot to your server and that there is a row in the `configs` table whose `bot_guild_id` matches your guild ID. The bot creates this on first connect; otherwise insert one with `yarn db:psql`.

Commands under the main folder are registered globally (takes a moment
to propagate). Commands under `bots-playground/` are guild-specific and
deploy instantly — use that folder for debugging.

To redeploy commands: `yarn slash:dev` for dev, `yarn slash` for production.

---

## 🧪 Tests

```bash
yarn test          # runs Jest against ./tests
```

Test coverage is light — contributions welcome, especially around
command controllers.

---

## 🏗 Production

Production runs on a single Hetzner VPS as two Docker containers
(`db` + `bot`) managed by docker compose. Deploys are manual: SSH to
the box and run `./infrastructure/ops/deploy.sh`. Schema migrations
are applied from your laptop over Tailscale.

The full production playbook — host setup, deploy flow, Tailscale
configuration, backups, rollback, and the one-time data-migration
procedure — lives in [infrastructure/README.md](infrastructure/README.md).

### Run the bot image standalone

If you just want to run the bot against your own Postgres:

```bash
docker run --env-file .env --name hans -d --restart=always \
  en3sis/hans:nightly
```

`.env` must include a `DATABASE_URL` reachable from the container. You
are responsible for applying schema migrations against that DB before
the bot connects (`DATABASE_URL=... yarn db:migrate`).
