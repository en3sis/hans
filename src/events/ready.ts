import { Client } from 'discord.js'
import {
  getBotConfiguration,
  insertConfiguration,
  insertPlugins,
  setPresence,
} from '../controllers/bot/config.controller'
import { insertAllGuilds } from '../controllers/bot/guilds.controller'
import { notifyPulse } from '../controllers/events/ready.controller'
import { configsRealtime } from '../realtime/presence.realtime'
import { reportErrorToMonitoring } from '../utils/monitoring'

module.exports = {
  name: 'ready',
  once: true,
  enabled: true,
  async execute(Hans: Client) {
    try {
      console.log(`👾  ${Hans.user.username} is ready`)
      console.log(
        `🔗  Bot invite link: https://discord.com/api/oauth2/authorize?client_id=${process.env
          .DISCORD_CLIENT_ID!}&permissions=0&scope=bot%20applications.commands`,
      )

      // INFO: Prepare the bot for the first time if no existent configuration is found.
      await insertConfiguration()
      await insertPlugins()
      await insertAllGuilds(Hans)

      // INFO: Fetches for the configuration.
      Hans.settings = await getBotConfiguration()

      // INFO: Notify in the configuration.botStartAlertChannel that the bot is ready.
      await notifyPulse(Hans)

      // INFO: Set the bot presence to the default one.
      await setPresence(
        Hans.settings?.activity_type ?? 4,
        Hans.settings?.activity_name ?? 'Responding to commands ',
      )

      // INFO: Start the realtime presence, this will listen to the database changes and update the bot presence.
      configsRealtime()
    } catch (error) {
      console.log('❌ ERROR: ready(): ', error)

      await reportErrorToMonitoring({
        embeds: {
          title: `Event: ready`,
          description: `${error.message}`,
        },
      })
    }
  },
}
