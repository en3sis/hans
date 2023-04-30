import formatDistance from 'date-fns/formatDistance'
import { Client, GuildMember, TextChannel } from 'discord.js'
import { resolveGuildPlugins } from '../controllers/bot/plugins.controller.'

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  enabled: true,
  async execute(Hans: Client, member: GuildMember) {
    try {
      const { enabled, metadata } = await resolveGuildPlugins(member.guild.id, 'guildMemberAdd')

      // Check it the guild has enabled the event
      if (!enabled) return
      if (metadata) {
        return console.error(`⚠️  No join/leave channel set for ${member.guild.name}`)
      }

      const targetChannel = Hans.channels.cache.get(metadata.targetChannel) as TextChannel

      if (!targetChannel) return

      const msg = `<@${member.user.id}> has has joined the server`

      return await targetChannel.send({
        embeds: [
          {
            title: `📥  Welcome ${member.user.username}`,
            description: msg.padEnd(50, ''),
            fields: [
              {
                name: 'Account created',
                value: formatDistance(member.user.createdAt, new Date(), {
                  addSuffix: true,
                }),
              },
            ],
            color: 0x8bc34a,
            thumbnail: { url: member.user.displayAvatarURL() },
            footer: {
              text: '\u0020\u0020\u0020\u0020\u0020\u0020\u0020',
            },
          },
        ],
      })
    } catch (error) {
      console.log('❌ GuildMemberAdd() : ', error)
    }
  },
}
