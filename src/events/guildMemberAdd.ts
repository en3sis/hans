import formatDistance from 'date-fns/formatDistance'
import { Client, GuildMember, TextChannel } from 'discord.js'
import { resolveGuildPlugins } from '../controllers/bot/plugins.controller'

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  enabled: true,
  async execute(Hans: Client, member: GuildMember) {
    try {
      const { enabled, metadata } = await resolveGuildPlugins(
        member.guild.id,
        'serverMembersActivity',
      )

      // Check it the guild has enabled the event
      if (!enabled) return
      // Check if metadata is not an empty object
      if (!metadata || !Object.keys(metadata).length) return

      const targetChannel = Hans.channels.cache.get(metadata.channelId) as TextChannel

      if (!targetChannel) return

      const msg = `<@${member.user.id}> has has joined the server. Give him/her a warm welcome!`

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
