import { Client, GuildMember, TextChannel } from 'discord.js'
import { resolveGuildPlugins } from '../controllers/bot/plugins.controller.'

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  enabled: true,
  async execute(Hans: Client, member: GuildMember) {
    try {
      const { enabled, metadata } = await resolveGuildPlugins(member.guild.id, 'guildMemberRemove')

      // Check it the guild has enabled the event
      if (!enabled) return
      if (!metadata) {
        return console.error(`⚠️  No join/leave channel set for ${member.guild.name}`)
      }

      const targetChannel = Hans.channels.cache.get(metadata.logChannelId) as TextChannel

      const msg = `<@${member.user.id}> has left the server. We'll be missing him/her`

      return await targetChannel.send({
        embeds: [
          {
            title: `📤  Bye ${member.user.username}`,
            description: msg.padEnd(50, ''),
            color: 0xe91e63,
            thumbnail: { url: member.user.displayAvatarURL() },
            footer: {
              text: '\u0020\u0020\u0020\u0020\u0020\u0020\u0020',
            },
          },
        ],
      })
    } catch (error) {
      console.log('❌ GuildMemberRemove() : ', error)
    }
  },
}
