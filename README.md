<div align="center">
	<br />
	<p>
		<a href="https://discord.com/invite/sMmbbSefwH"><img src="https://res.cloudinary.com/vac/image/upload/v1683578541/Hans/hans-banner-pattern.png" width="546" alt="discord.js" /></a>
	</p>

</div>

![Docker Pulls](https://img.shields.io/docker/pulls/en3sis/hans?style=for-the-badge)
![Docker Image Version (tag latest semver)](https://img.shields.io/docker/v/en3sis/hans/latest?label=production%20image&style=for-the-badge)
![Discord](https://img.shields.io/discord/904719402044383273?style=for-the-badge)

# 🤖 Hans - Discord Bot

Hans is built with a modular architecture that makes it easy to add and remove functionality on the fly, empowering you to create a bot tailored to your community's needs.

Built with [Discord.JS](https://discord.js.org/#/), [TypeScript](https://www.typescriptlang.org/), and lots of ❤️

## Invite to server

Bring Hans to your Discord server and start using his available features right away by inviting it to your server [here 🔗](https://discord.com/api/oauth2/authorize?client_id=403523619222847488&permissions=0&scope=bot%20applications.commands). It's using the latest `hans:nightly` image with the latest features.

The list of commands & plugins can be found [here 🔗](https://github.com/en3sis/hans/wiki/Commands-&-Plugins)

## Developing Hans

> 🪬 **NOTE**: Please consider opening an issue and PR for bugs, suggestions or new features.

---

### 🔅 Prepare environment

Before running any command, run `npm install && cp .env.template .env`, fill all the env variables needed. To create your application, visit [Discord's Developer Portal](https://discord.com/developers/docs/intro)

> 🪬 **IMPORTANT**: A Supabase instance is needed for the bot to work. A free cluster should be more than enough (even for small bots & communities) for development.

### Supabase Local Development.

Supabase is used for storing the bot's configs, guilds, and users.

You can work with supabase local, just follow the instructions [here 🔗](https://supabase.io/docs/guides/local-development).
Once you run `supabase start` the local supabase will be populate with the latest schema (have a look at the `supabase/seed.template.sql` file for more configuration)

More information related to working with Supabase local development can be found [📹 here 🔗](https://www.youtube.com/watch?v=N0Wb85m3YMI)

## 👩🏼‍💻 Development

Once the `Prepare environment` section is done, you can start developing your bot.

### `npm run dev`

Will start a development server with `ts-node` and `nodemon` for livereload. A bot Invite link will be displayed in the console. Use it to invite the bot to your server.

### Slash commands

All commands (under `src/commands`) are built with the [Slash Command](https://discordjs.guide/interactions/slash-commands.html) interaction.

> 🪬 **IMPORTANT**: before developing commands, make sure you invite the bot to your server and the entry in Supabase `configs -> bot_guild_id` is your guild_id.

All commands under the main folder are available globally (it will take a second to have them available) while the ones under `bots-playground/` are guild specific and are instantly deployed, use this folder for debugging & development purposes.

To deploy the commands: `npm run slashDev` or `npm run slash` in production.

---

## 🧪 Unit Tests

For testing, we use Mocha with TS.

All the tests are under the `/tests` directory. Right now they're none or a few, ideally, we should add more test coverage for command controllers.

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

> 🪬 **IMPORTANT**: Make sure to follow the `Prepare environment` section.

### `npm run build`

To generate the application's build.

### `npm start`

Will run the bot with the production environment.

### With Kubernetes (WIP)

> 💢 NOTE: This is a WIP, it's not fully tested yet, things are missing. Please feel free to contribute.

It's also possible to deploy the bot to a Kubernetes cluster, the necessary files are in the `k8s` folder.

**Steps**:

1. You'll need your K8S cluster, ofc ;P
2. Create the namespace `kubectl apply -f k8s/namespace.yaml`
3. Run `cp k8s/secrets.template.yaml k8s/secrets.yaml`, fill it up and apply the secrets `kubectl apply -f k8s/secrets.yaml`
4. Deploy the workload `kubectl apply -f k8s/deployment.yaml`
