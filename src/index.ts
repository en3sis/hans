import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js'
import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { reportErrorToMonitoring } from './utils/monitoring'
import { ProjectValidator } from './utils/pre-validation'

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
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
})

/** =============================================================================
 * 🎉 Command handlers
  ============================================================================== */
Hans.commands = new Collection()

const setCommandsNames = async () => {
  try {
    for (const ele of ['/', '/bots-playground']) {
      const dir = path.join(path.resolve(__dirname), `/commands${ele}`)
      const files = fs
        .readdirSync(dir)
        .filter((file) => file.endsWith('.js') || file.endsWith('.ts'))

      for (const file of files) {
        const mod = await import(path.join(dir, file))
        const command = mod.default ?? mod
        if ('data' in command) {
          Hans.commands.set(command.data.name, command)
        }
      }
    }

    console.info(
      '🧾  Reading commands files for:',
      Hans.commands.map((ele) => ele.data.name).join(', '),
    )
  } catch (error) {
    console.error('❌ ERROR: setCommandsNames(): ', error)
  }
}

/** =============================================================================
 * 🎆 Events handler
  ============================================================================== */
const registerEvents = async () => {
  const eventsDir = path.join(path.resolve(__dirname), `./events`)
  const eventFiles = fs
    .readdirSync(eventsDir)
    .filter((file) => file.endsWith('.js') || file.endsWith('.ts'))

  for (const file of eventFiles) {
    const mod = await import(path.join(eventsDir, file))
    const event = mod.default ?? mod

    if (event.enabled) {
      if (event.once) {
        Hans.once(event.name, (...args) => event.execute(Hans, ...args))
      } else {
        Hans.on(event.name, (...args) => event.execute(Hans, ...args))
      }
    }
  }
}

await setCommandsNames()
await registerEvents()

Hans.login(process.env.DISCORD_TOKEN!)

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
