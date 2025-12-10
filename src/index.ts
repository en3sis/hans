import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js'
import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { reportErrorToMonitoring } from './utils/monitoring'
import { ProjectValidator } from './utils/pre-validation'
import { startApiServer } from './api'
import './types/libs'

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** =============================================================================
 * 🛠 Initial configuration
  ============================================================================== */
dotenv.config({ path: path.join(process.cwd(), `.env`) })

// Validate project necessary environment variables,
const validator = new ProjectValidator()
validator.runAllChecks()

export const Hans = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
})

/** =============================================================================
 * 🎉 Command handlers
  ============================================================================== */
Hans.commands = new Collection()

const loadCommands = async () => {
  try {
    // Paths to global & developed commands
    for (const ele of ['/', '/bots-playground']) {
      const commandsPath = path.join(__dirname, `/commands${ele}`)

      if (!fs.existsSync(commandsPath)) continue

      const files = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith('.js') || file.endsWith('.ts'))

      for (const file of files) {
        const filePath = path.join(commandsPath, file)
        const command = await import(filePath)
        const commandModule = command.default || command

        if ('data' in commandModule) {
          Hans.commands.set(commandModule.data.name, commandModule)
        }
      }
    }

    console.info(
      '🧾  Reading commands files for:',
      Hans.commands.map((ele) => ele.data.name).join(', '),
    )
  } catch (error) {
    console.error('❌ ERROR: loadCommands(): ', error)
  }
}

/** =============================================================================
 * 🎆 Events handler
  ============================================================================== */
const loadEvents = async () => {
  const eventsPath = path.join(__dirname, './events')
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith('.js') || file.endsWith('.ts'))

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file)
    const eventModule = await import(filePath)
    const event = eventModule.default || eventModule

    if (event.enabled) {
      if (event.once) {
        Hans.once(event.name, (...args) => event.execute(Hans, ...args))
      } else {
        Hans.on(event.name, (...args) => event.execute(Hans, ...args))
      }
    }
  }
}

/** =============================================================================
 * 🚀 Initialize bot
  ============================================================================== */
const init = async () => {
  await loadCommands()
  await loadEvents()

  Hans.login(process.env.DISCORD_TOKEN!)

  // Start API server (Bun)
  startApiServer()
}

init()

Hans.on('error', (err) => !!process.env.ISDEV && console.log('❌ ERROR: initHans()', err))
Hans.on('debug', (msg) => !!process.env.ISDEV && console.log('🐛 DEBUG: initHans()', msg))
Hans.on('unhandledRejection', async (error) => {
  const _embed = {
    title: `unhandledRejection`,
    description: `${error.message}`,
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  !!process.env.ISDEV && (await reportErrorToMonitoring({ embeds: _embed }))
  console.error('Unhandled promise rejection:', error)
})
