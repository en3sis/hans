import { Client, Message } from 'discord.js'
import { OpenAiAPI } from '../../lib/open-ai'

export const gpt3Controller = async (Hans: Client, message: Message) => {
  const user = message.mentions.users.first()

  if (user && user.id === Hans.user?.id) {
    const response = await OpenAiAPI({
      input: `${message.content.replace(user.toString(), '')}`,
      predicate: '',
      // model: 'davinci',
      version: '003',
      max_tokens: 150,
    })

    return await message.reply({ content: response.replace('AI:', '') })
  }
}
