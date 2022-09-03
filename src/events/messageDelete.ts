import { Client, Message, TextChannel } from 'discord.js'
import { resolveGuildEvents } from '../controllers/bot/guilds.controller'

module.exports = {
  name: 'messageDelete',
  once: false,
  enabled: true,
  async execute(Hans: Client, message: Message) {
    const { enabled, ..._guildSettings } = await resolveGuildEvents(
      message.guild.id,
      'messageDelete'
    )

    if (!enabled) return
    const channel = Hans.channels.cache.get(
      _guildSettings.plugins.moderation.messagesAlterations.logChannelId
    ) as TextChannel

    if (!channel) return

    channel.send({
      embeds: [
        {
          author: {
            name: `${message.author?.username || 'Could not read'}#${message.author?.discriminator || 'Could not read'
              }`,
            icon_url: message.author?.displayAvatarURL() || undefined,
          },
          description: `Message deleted in <#${message.channel.id}> by <@${message.author?.id || 'Could not read'
            }> [Jump to message](${message.url}) `,
          fields: [
            {
              name: 'Deleted message:',
              value: message.content! || 'Could not read',
            },
          ],
          color: 0xa8102d,
        },
      ],
    })
  },
}
