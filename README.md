<div align="center">
	<br />
	<p>
		<a href="https://discord.gg/WpTrnnvJXe"><img src="https://cdn.discordapp.com/attachments/626034007087513601/1014802216831438879/hans-fff.png" width="546" alt="discord.js" /></a>
	</p>

</div>

![Docker Pulls](https://img.shields.io/docker/pulls/en3sis/hans?style=for-the-badge)
![Docker Image Version (tag latest semver)](https://img.shields.io/docker/v/en3sis/hans/latest?label=production%20image&style=for-the-badge)
![Discord](https://img.shields.io/discord/904719402044383273?style=for-the-badge)

# Hans - Discord Bot

Discord Bot build with [Discord.JS](https://discord.js.org/#/), [TypeScript](https://www.typescriptlang.org/), and lots of ❤️

## 🔗 Invite hans to your server

You can invite the bot [here 🔗](https://discord.com/api/oauth2/authorize?client_id=403523619222847488&permissions=0&scope=bot%20applications.commands). It's using the latest hans:nightly image with the latest features.

## ❇️ Commands and Functionality

The list of commands can be found [here 🔗](https://github.com/en3sis/hans/wiki/Commands) and,
the list of functionalities can be found [here 🔗](https://github.com/en3sis/hans/wiki/Functionality)

## 📜 Terms of Services & Privacy Policy

The Terms of Services for using Hans can be found [here 🔗](https://github.com/en3sis/hans/wiki/Terms-of-Services-&-Privacy-Policy)

---

# Developing Hans

> 🪬 **NOTE**: Please consider opening an issue and PR for bugs, suggestions or new features.

---

## 🔅 Prepare environment

Before running any command, run `npm install` & `cp .env.template .env`, fill all the env variables needed. To create your application, visit [Discord's Developer Portal](https://discord.com/developers/docs/intro)

> 🪬 **IMPORTANT**: A MongoDB instance is needed for the bot to work. A free Atlas cluster should be more than enough (even for small bots & communities) for development.

An alternative is to spin a MongoDB instance yourself with Docker locally.
Use `docker compose up -d` command to start it. `docker-compose down` to stop it.

MongoDB Compass is recommended. Your connection string should be `mongodb://hans:S3cret@localhost:27017`

---

## 👩🏼‍💻 Development

### `npm run dev`

Will start a development server with ts-node and nodemon for livereload. A bot Invite link will be displayed in the console. Use it to invite the bot to your server.

### Slash commands

All commands (under `src/commands`) are built with the [Slash Command](https://discordjs.guide/interactions/slash-commands.html) interaction.

> 🪬 **IMPORTANT**: before developing commands, make sure you invite the bot to your server and the entry in mongodb `hans -> config` has the commandsDevGuild.id set to your server id.

All commands under the main folder are available globally (it will take a second to have them available) while the ones under `bots-playground` are guild specific and are instantly deployed, use this folder for debugging & development purposes.

To deploy the commands, run `npm run slash`.

> 🪬 **IMPORTANT**: Since the command process is isolated, make sure to export the mongodb connection string to your current shell, ex: `export MONGODB_CONNECTION="mongodb://hans:S3cret@localhost:27017"`

---

## 🧪 Testing

For testing, we use Mocha with TS.

All the tests are under the `/tests` directory. Right now they're none or a few, ideally, we should add more test coverage for command controllers.

### `npm run test`

Will run all the tests.

---

## 🏗 Production

We have multiple environments for deploying your bot (see Deployment section below).
The easiest way would be to clone the repo and do:

> 🪬 **IMPORTANT**: Make sure to follow the `Prepare environment` section.

### `npm run build`

To generate the application's build.

### `npm start`

Will run the bot with the production environment.

### Other deployments

### With Docker

There's an image in the DockerHub at `en3sis/hans` with the latest version or you can build your image.
Build it locally with `docker build -t en3sis/hans . `

### With Kubernetes

It's also possible to deploy the bot to a Kubernetes cluster, the necessary files are in the `k8s` folder.

**Steps**:

1. You'll need your K8S cluster, ofc ;P
2. Create the namespace `kubectl apply -f k8s/namespace.yaml`
3. Run `cp k8s/secrets.template.yaml k8s/secrets.yaml`, fill it up and apply the secrets `kubectl apply -f k8s/secrets.yaml`
4. Deploy the workload `kubectl apply -f k8s/deployment.yaml`
