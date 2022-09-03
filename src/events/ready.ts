import { Client } from 'discord.js'
import { insertConfiguration } from '../controllers/admin/hans-config.controller'
import { getBotConfiguration } from '../controllers/events/ready.controller'
import { notifyPulse } from '../controllers/functions/ready.function'

module.exports = {
  name: 'ready',
  once: true,
  enabled: true,
  async execute(Hans: Client) {
    try {
      console.log(`👾  ${Hans.user.username} is ready`)
      console.log(
        `🔗  Bot invite link: https://discord.com/api/oauth2/authorize?client_id=${process.env
          .DISCORD_CLIENT_ID!}&permissions=0&scope=bot%20applications.commands`
      )
      // If no configuration is found, insert one
      await insertConfiguration()

      // Fetches MongoDB for the configuration document.
      const settings = await getBotConfiguration()

      // Notify in the configuration.botStartAlertChannel that the bot is ready.
      notifyPulse(Hans)

      const activity = {
        type: settings.activities?.type || 'WATCHING',
        name: settings.activities?.name || 'you',
      }

      Hans.user.setPresence({
        activities: [activity],
      })
    } catch (error) {
      console.log('❌ ERROR: ready(): ', error)
    }
  },
}
