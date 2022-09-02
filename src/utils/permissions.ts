import { Message, Permissions } from 'discord.js'

export const isAdmin = (message: Message) => {
  return message.member.permissions.has([Permissions.FLAGS.ADMINISTRATOR])
}

export const isStaff = (message: Message) => {
  return message.member.permissions.has([Permissions.FLAGS.VIEW_AUDIT_LOG])
}
