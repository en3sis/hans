import { Client } from 'discord.js'
import { insertConfiguration } from '../controllers/admin/hans-config.controller'
import { getBotConfiguration, notifyPulse } from '../controllers/events/ready.controller'
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
      await insertConfiguration()

      // Fetches MongoDB for the configuration document.
      const settings = await getBotConfiguration()
      Hans.settings = settings

      // Notify in the configuration.botStartAlertChannel that the bot is ready.
      await notifyPulse(Hans)

      // Init all cron jobs tasks
      await CronJobsTasks(Hans)

      Hans.user.setPresence({
        activities: [
          {
            type: settings.activities?.type || 3,
            name: settings.activities?.name || 'you',
          },
        ],
      })
    } catch (error) {
      console.log('❌ ERROR: ready(): ', error)
    }
  },
}
