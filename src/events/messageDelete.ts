import { Client, Message, TextChannel } from 'discord.js'

import { resolveGuildPlugins } from '../controllers/bot/plugins.controller'
import { NO_INTENT } from '../utils/constants'

module.exports = {
  name: 'messageDelete',
  once: true,
  enabled: true,
  async execute(Hans: Client, message: Message) {
    try {
      const { metadata, enabled } = await resolveGuildPlugins(message.guild.id, 'messageDelete')

      if (!enabled) return
      const channel = Hans.channels.cache.get(metadata.logChannelId) as TextChannel

      if (!channel) return

      channel.send({
        embeds: [
          {
            author: {
              name: `${message.author?.username || NO_INTENT}#${
                message.author?.discriminator || NO_INTENT
              }`,
              icon_url: message.author?.displayAvatarURL() || undefined,
            },
            description: `Message deleted in <#${message.channel.id}> by <@${
              message.author?.id || NO_INTENT
            }> [Jump to message](${message.url}) `,
            fields: [
              {
                name: 'Deleted message:',
                value: message.content! || NO_INTENT,
              },
            ],
            color: 0xa8102d,
          },
        ],
      })
    } catch (error) {
      console.log('❌ ERROR: error: ', error)
    }
  },
}
