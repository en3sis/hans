import { Client, Message } from 'discord.js'
import { threadAutoCreate } from '../controllers/plugins/threads.controller'
import { checkQuestAnswer } from '../controllers/plugins/quests.controller'
import { handleMentionNLP } from '../controllers/plugins/nlp.controller'

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

      // Check if the bot is mentioned and handle NLP
      if (message.mentions.has(Hans.user!.id)) {
        await handleMentionNLP(message)

        return
      }

      // Plugins
      // +=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=+
      await threadAutoCreate(message, await Hans.guildPluginSettings(message.guildId, 'threads'))

      // Check quest answers in quest threads
      await checkQuestAnswer(message)

      // +=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=+
      // ==-=-=-=-=-=-=-=-=             DEVELOPMENT                    =-=-=-=-=-=-=-= +
      // +=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=+
      // INFO: This is a development feature that allows to run commands without the need of a bot slash command, it will only work in development mode and it will try to run the command from the messageCreate.ts file. Make sure you duplicate and rename messageCreate.template.ts file.
      // TODO: Docker build will fail, look into.
      // if (!!process.env.ISDEV && process.env.NODE_ENV !== 'production') {
      //   const args = message.content.slice(1).trim().split(/ +/g)
      //   const command = args.shift().toLowerCase()

      //   const module = await import('../controllers/_development/messageCreate')
      //   module.default(Hans, message, command, args)
      // }
    } catch (error) {
      console.log('❌ messageCreate(): ', error)
    }
  },
}
