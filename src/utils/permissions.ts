import { GuildMember, Message } from 'discord.js'

export const isAdmin = (member: Message | GuildMember) => {
  if (member instanceof Message) {
    return member.member?.permissions.has(['Administrator']) ?? false
  }
  return member.permissions.has(['Administrator'])
}

export const isStaff = (member: Message | GuildMember) => {
  if (member instanceof Message) {
    return member.member?.permissions.has(['ViewAuditLog']) ?? false
  }
  return member.permissions.has(['ViewAuditLog'])
}
