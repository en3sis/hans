import { Client, Message } from 'discord.js'
import { pluginsController } from '../controllers/plugins'

module.exports = {
  name: 'messageCreate',
  once: false,
  enabled: true,
  async execute(Hans: Client, message: Message) {
    try {
      if (message.author.bot) return
      // const args = message.content.slice(1).trim().split(/ +/g)
      // const command = args.shift().toLowerCase()

      // Server outage
      if (!message.guild?.available) return

      // Not logged in
      if (message.client.user === null) return

      // +=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=+
      // ==-=-=-=-=-=-=-=-=             DEVELOPMENT                    =-=-=-=-=-=-=-= +
      // +=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=+
      // Uncomment for development and do your tests/debug there, !!!DON'T COMMIT!!!
      // TODO: Requires refactor, find a way to dynamically load the file if in development
      // _messageCreate(Hans, message, command, args)

      // Plugins
      // +=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=+
      await pluginsController(Hans, message)
    } catch (error) {
      console.log('❌ messageCreate(): ', error)
    }
  },
}
