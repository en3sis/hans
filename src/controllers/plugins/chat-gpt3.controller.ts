import { Client, Message } from 'discord.js'
import { OpenAiAPI } from '../../lib/open-ai'

export const gpt3Controller = async (Hans: Client, message: Message) => {
  const user = message.mentions.users.first()

  if (user && user.id === Hans.user?.id) {
    const response = await OpenAiAPI({
      input: message.content.replace(user.toString(), ''),
      predicate: 'Hans:',
      model: 'davinci',
      max_tokens: 100,
    })

    return await message.reply({ content: response.data.choices[0].text })
  }
}
