import { Client, Message } from 'discord.js'
import { threadAutoCreate } from '../controllers/plugins/threads.controller'

module.exports = {
  name: 'messageCreate',
  once: false,
  enabled: true,
  async execute(Hans: Client, message: Message) {
    try {
      if (message.author.bot) return

      // Server outage
      if (!message.guild?.available) return

      // Not logged in
      if (message.client.user === null) return

      // Plugins
      // +=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=+
      await threadAutoCreate(message, await Hans.guildPluginSettings(message.guildId, 'threads'))

      // +=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=+
      // ==-=-=-=-=-=-=-=-=             DEVELOPMENT                    =-=-=-=-=-=-=-= +
      // +=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=+
      // INFO: This is a development feature that allows to run commands without the need of a bot slash command, it will only work in development mode and it will try to run the command from the messageCreate.ts file. Make sure you duplicate and rename messageCreate.template.ts file.
      if (!!process.env.ISDEV) {
        const args = message.content.slice(1).trim().split(/ +/g)
        const command = args.shift().toLowerCase()

        const module = await import('../controllers/_development/messageCreate')
        module.default(Hans, message, command, args)
      }
    } catch (error) {
      console.log('❌ messageCreate(): ', error)
    }
  },
}
