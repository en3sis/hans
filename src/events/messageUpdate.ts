import { Client, Message, TextChannel } from 'discord.js'
import { getPluginConfig } from '../controllers/bot/plugins.controller'
import { postEditLog } from '../controllers/plugins/audit-log'

module.exports = {
  name: 'messageUpdate',
  once: false,
  enabled: true,
  async execute(Hans: Client, oldMessage: Message, newMessage: Message) {
    try {
      if (newMessage.author?.bot || oldMessage.author?.bot) return
      if (!newMessage.guildId) return
      if (oldMessage.content === newMessage.content) return

      const cfg = await getPluginConfig(newMessage.guildId, 'serverMessagesLogs')
      if (!cfg?.enabled || !cfg.metadata?.channelId) return

      const channel = Hans.channels.cache.get(cfg.metadata.channelId) as TextChannel | undefined
      if (!channel) return

      await postEditLog(channel, oldMessage, newMessage)
    } catch (error) {
      console.error('❌ messageUpdate(): ', error)
    }
  },
}
