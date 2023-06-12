import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js'
import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import supabase from './libs/supabase'
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
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
})

Hans.supabase = supabase
/** =============================================================================
 * 🎉 Command handlers
  ============================================================================== */
Hans.commands = new Collection()

const setCommandsNames = () => {
  try {
    // Paths to global & developed commands
    ;['/', '/bots-playground'].map((ele) => {
      const files = fs
        .readdirSync(path.join(path.resolve(__dirname), `/commands${ele}`))
        .filter((file) => file.endsWith('.js') || file.endsWith('.ts'))

      files.forEach((file) => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const command = require(path.join(path.resolve(__dirname), `/commands${ele}/${file}`))

        if ('data' in command) {
          return Hans.commands.set(command.data.name, command)
        }
      })
    })

    console.info(
      '🧾  Reading commands files for:',
      Hans.commands.map((ele) => ele.data.name).join(', '),
    )
  } catch (error) {
    console.error('❌ ERROR: setCommandsNames(): ', error)
  }
}

setCommandsNames()
/** =============================================================================
 * 🎆 Events handler
  ============================================================================== */
const eventFiles = fs
  .readdirSync(path.join(path.resolve(__dirname), `./events`))
  .filter((file) => file.endsWith('.js') || file.endsWith('.ts'))

for (const file of eventFiles) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const event = require(`./events/${file}`)

  if (event.enabled) {
    if (event.once) {
      Hans.once(event.name, (...args) => event.execute(Hans, ...args))
    } else {
      Hans.on(event.name, (...args) => event.execute(Hans, ...args))
    }
  }
}

Hans.login(process.env.DISCORD_TOKEN!)

Hans.on('error', (err) => !!process.env.ISDEV && console.log('❌ ERROR: initHans()', err))

Hans.on('debug', (msg) => !!process.env.ISDEV && console.log('🐛 DEBUG: initHans()', msg))

Hans.on('unhandledRejection', async (error) => {
  const _embed = {
    title: `unhandledRejection`,
    description: `${error.message}`,
  }

  !!process.env.ISDEV && (await reportErrorToMonitoring({ embeds: _embed }))
  console.error('Unhandled promise rejection:', error)
})
