import { Client, Message, TextChannel } from 'discord.js'
import { getPluginConfig } from '../controllers/bot/plugins.controller'
import { postDeleteLog } from '../controllers/plugins/audit-log'

module.exports = {
  name: 'messageDelete',
  once: false,
  enabled: true,
  async execute(Hans: Client, message: Message) {
    try {
      if (!message.guildId) return
      if (message.author?.bot) return

      const cfg = await getPluginConfig(message.guildId, 'serverMessagesLogs')
      if (!cfg?.enabled || !cfg.metadata?.channelId) return

      const channel = Hans.channels.cache.get(cfg.metadata.channelId) as TextChannel | undefined
      if (!channel) return

      await postDeleteLog(channel, message)
    } catch (error) {
      console.error('❌ messageDelete(): ', error)
    }
  },
}
