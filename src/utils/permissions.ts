import { Message } from 'discord.js'

export const isAdmin = (message: Message) => {
  return message.member.permissions.has(['Administrator'])
}

export const isStaff = (message: Message) => {
  return message.member.permissions.has(['ViewAuditLog'])
}
