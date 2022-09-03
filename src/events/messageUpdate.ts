import { Client, Message, TextChannel } from 'discord.js';
import { resolveGuildEvents } from '../controllers/bot/guilds.controller';

module.exports = {
  name: 'messageUpdate',
  once: false,
  enabled: true,
  async execute(Hans: Client, oldMessage: Message, newMessage: Message) {
    try {
      const { enabled, ..._guildSettings } = await resolveGuildEvents(
        oldMessage.guildId,
        'messageUpdate'
      )

      if (!enabled) return
      const channel = Hans.channels.cache.get(
        _guildSettings.plugins.moderation.messagesAlterations.logChannelId
      ) as TextChannel

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
                value: oldMessage.content || 'Could not read',
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
