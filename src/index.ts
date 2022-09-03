import { Client, Collection, Intents } from 'discord.js'
import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { mongoClient } from './lib/mongodb-driver'
import { ProjectValidator } from './utils/pre-validation'

/** =============================================================================
 * 🛠 Initial configuration
  ============================================================================== */
dotenv.config({ path: path.join(process.cwd(), `.env`) })

// Validate project necessary files,
// INFO: Disable this since we're now deploying to an K8s Cluster
const validator = new ProjectValidator()
validator.runAllChecks()

const Hans = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
})

Hans.mongo = mongoClient
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

        Hans.commands.set(command.data.name, command)
      })
    })

    if (process.env.ISDEV)
      console.info(
        '🗓  All commands registered:',
        Hans.commands.map((ele) => ele.data.name).join(', ')
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
