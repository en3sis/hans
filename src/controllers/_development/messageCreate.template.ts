import { Client, Message } from 'discord.js'

const _messageCreate = async (Hans: Client, message: Message, command: string, args: unknown) => {
  // 🪬 IMPORTANT: Make sure to add your discord username ID so no one else can use this command while your dev bot is enabled.
  if (message.author.id === 'YOUR_ID') {
    if (command === 'test') {
      message.reply('Test command: test')
    }
  }
}

export default _messageCreate
