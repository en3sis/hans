import { Client } from 'discord.js'
import { getBotConfiguration, insertConfiguration, insertPlugins } from '../controllers/bot/config'
import { insertAllGuilds } from '../controllers/bot/guilds.controller'
import { notifyPulse } from '../controllers/events/ready.controller'
import { CronJobsTasks } from '../controllers/tasks/cron-jobs'

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
      await insertAllGuilds(Hans)
      await insertConfiguration()
      await insertPlugins()

      // Fetches for the configuration.
      Hans.settings = await getBotConfiguration()

      // Notify in the configuration.botStartAlertChannel that the bot is ready.
      await notifyPulse(Hans)

      // Init all cron jobs tasks
      await CronJobsTasks(Hans)

      Hans.user.setPresence({
        activities: [
          {
            type: Hans.settings.activity_type || 3,
            name: Hans.settings.activity_name || 'you',
          },
        ],
      })
    } catch (error) {
      console.log('❌ ERROR: ready(): ', error)
    }
  },
}
