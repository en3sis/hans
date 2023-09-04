import { Client, Message, TextChannel } from 'discord.js'
import { resolveGuildPlugins } from '../controllers/bot/plugins.controller'
import { NO_INTENT } from '../utils/constants'

module.exports = {
  name: 'messageUpdate',
  once: false,
  enabled: false,
  async execute(Hans: Client, oldMessage: Message, newMessage: Message) {
    try {
      if (newMessage.author.bot && oldMessage.author.bot) return

      const { enabled, metadata } = await resolveGuildPlugins(oldMessage.guildId, 'messageUpdate')

      if (!enabled) return
      const channel = Hans.channels.cache.get(metadata.logChannelId) as TextChannel

      if (oldMessage.content === newMessage.content || !channel) return

      channel.send({
        embeds: [
          {
            author: {
              name: `${newMessage.author.username}#${newMessage.author.discriminator}`,
              icon_url: newMessage.author.displayAvatarURL(),
            },
            description: `Message edited in <#${newMessage.channel.id}> by <@${newMessage.author.id}> [Jump to message](${newMessage.url}) `,
            fields: [
              {
                name: 'Before:',
                value: oldMessage.content || NO_INTENT,
              },
              {
                name: 'After:',
                value: newMessage.content,
              },
            ],
            footer: {
              icon_url: newMessage.guild.iconURL(),
              text: `${newMessage.guild.name}`,
            },
            color: 0x3165ae,
          },
        ],
      })
    } catch (error) {
      console.log('error: ', error)
    }
  },
}
