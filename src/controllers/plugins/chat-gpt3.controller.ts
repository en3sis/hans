import { Client, Message } from 'discord.js'
import { OpenAiAPI } from '../../lib/open-ai'

const prompt = `The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, with a huge affection for gaming, and sometimes sarcastic.

Human: Hello, who are you?
AI: I am an AI created by OpenAI. How can I help you today?
Human:`

export const gpt3Controller = async (Hans: Client, message: Message) => {
  const user = message.mentions.users.first()

  if (user && user.id === Hans.user?.id) {
    const response = await OpenAiAPI({
      input: `${prompt} ${message.content.replace(user.toString(), '')}`,
      predicate: '',
      // model: 'davinci',
      version: '003',
      max_tokens: 150,
    })

    return await message.reply({ content: response.replace('AI:', '') })
  }
}
