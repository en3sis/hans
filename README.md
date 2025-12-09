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

Built with [Discord.JS](https://discord.js.org/#/), [TypeScript](https://www.typescriptlang.org/), and lots of ❤️

## Invite to server

Bring Hans to your Discord server and start using his available features immediately [here 🔗](https://discord.com/oauth2/authorize?client_id=403523619222847488). It uses the latest `hans:nightly` image with the latest features.

The list of commands & plugins can be found [here 🔗](https://github.com/en3sis/hans/wiki/Commands-&-Plugins)

## Developing Hans

> 🪬 **NOTE**: Please consider opening an issue and PR for bugs, suggestions, or new features.

---

### 🔅 Prepare environment

Before running any command, run `npm install && cp .env.template .env`, and fill in all the env variables needed. To create your application, visit [Discord's Developer Portal](https://discord.com/developers/docs/intro)

### Database Setup

Hans uses PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/).

**Local development** uses Supabase local (includes PostgreSQL):

```bash
supabase start
```

**Production** uses a self-hosted PostgreSQL container via `docker-compose.yaml`.

Set `DATABASE_URL` in your `.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/hans_db
```

#### Drizzle Commands

| Command            | Description                   |
| ------------------ | ----------------------------- |
| `yarn db:push`     | Push schema to database (dev) |
| `yarn db:generate` | Generate migration files      |
| `yarn db:migrate`  | Run migrations                |
| `yarn db:studio`   | Open Drizzle Studio GUI       |

To pull schema from existing database: `npx drizzle-kit pull`

## 👩🏼‍💻 Development

Once the `Prepare environment` section is done, you can follow along with the development.

### `npm run dev`

It will start a development server with `ts-node` and `nodemon` for live-reload. A bot Invite link will be displayed in the console.

### Slash commands

All commands (under `src/commands`) are built with the [Slash Command](https://discordjs.guide/interactions/slash-commands.html) interaction.

> 🪬 **IMPORTANT**: before developing commands, make sure you invite the bot to your server and set `BOT_GUILD_ID` in your `.env` file.

All commands under the main folder are available globally (it will take a second to have them available) while the ones under `bots-playground/` are guild-specific and are instantly deployed, use this folder for debugging & development purposes.

To deploy the commands: `npm run slashDev` or `npm run slash` in production.

---

## 🧪 Unit Tests

For testing, we use Mocha with TS.

All the tests are under the `/tests` directory. Right now they're none or a few, we should add more test coverage for command controllers.

### `npm run test`

Will run all the tests.

---

## 🏗 Production

We have multiple environments for deploying your bot.

### With Docker

You can either use the pre-built Docker image from DockerHub at `en3sis/hans:latest` or build your own locally using the command `docker build -t en3sis/hans .`

To run the container, use the command `docker run --env-file .env --name hans -d --restart=always en3sis/hans:latest` while making sure that the `.env` file is in the same directory as the command and contains all the necessary environment variables for the bot to function properly.
You can also run it with `docker-compose` using the command `docker-compose up -d --build bot`.

> Note: for M1 Macs, you'll need to use `docker-compose build --build-arg M1=true` before running the `docker-compose up -d`.

### Locally

You can also run the bot locally using the following commands:

> 🪬 **IMPORTANT**: Follow the `Prepare environment` section.

### `npm run build`

To generate the application's build.

### `npm start`

It will run the bot with the production environment.
