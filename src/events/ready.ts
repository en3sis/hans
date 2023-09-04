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
      // If no configuration is found, insert one
      await insertConfiguration()
      await insertPlugins()
      await insertAllGuilds(Hans)

      // Fetches for the configuration.
      Hans.settings = await getBotConfiguration()

      // Notify in the configuration.botStartAlertChannel that the bot is ready.
      await notifyPulse(Hans)

      // Init all cron jobs tasks
      // await CronJobsTasks(Hans)

      // Set the bot presence to the default one.
      await setPresence(
        Hans.settings?.activity_type ?? 4,
        Hans.settings?.activity_name ?? 'Responding to commands ',
      )

      configsRealtime()
    } catch (error) {
      console.log('❌ ERROR: ready(): ', error)

      const _embed = {
        title: `Event: ready`,
        description: `${error.message}`,
      }

      await reportErrorToMonitoring({ embeds: _embed })
    }
  },
}
