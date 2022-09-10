import { GuildMember } from 'discord.js'
import { formatFromNow } from '../../utils/dates'

export const getUserInformation = (member: GuildMember) => {
  // INFO: Disables status since Hans has no intend for members status.
  // const status = {
  //   online: ':green_circle: User is online!',
  //   idle: ':yellow_circle: User is idle',
  //   offline: ':black_circle: User is offline',
  //   dnd: ":red_circle: User doesn't want to be disturbed right now",
  // }

  const roles = member.roles.cache.filter((role) => role.name !== '@everyone')

  return {
    author: {
      name: member.displayName,
      icon_url: member.user.displayAvatarURL(),
    },
    title: `Information about ${member.displayName}`,
    thumbnail: {
      url: member.user.displayAvatarURL(),
    },
    fields: [
      // {
      //   name: 'Status',
      //   value: member?.presence?.status ? status[member?.presence.status] : 'Intent not allowed',
      //   inline: false,
      // },
      {
        name: 'Account created',
        value: formatFromNow(member.user.createdAt),
        inline: true,
      },
      {
        name: 'Joined the server',
        value: formatFromNow(member.joinedAt),
        inline: true,
      },
      {
        name: `Roles `,
        value: `${roles.size}`,
      },
    ],
    color: member.displayColor,
    footer: {
      text: `User ID: ${member.id}`,
    },
  }
}
