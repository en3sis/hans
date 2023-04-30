import { ChatCompletionRequestMessage } from 'openai'
import { openAI } from '../../libs/open-ai'
import { ROLE_MENTION_REGEX } from '../../utils/regex'

export const gpt3Controller = async (prompt: string) => {
  const { response, token } = await sendPrompt({
    input: `${prompt}`,
    version: '003',
    max_tokens: 150,
  })

  return {
    response: response.replace('AI:', ''),
    token,
  }
}

interface IOpenAIRequestSettings {
  model?: 'ada' | 'davinci'
  version?: '003' | '001'
  input: string
  max_tokens?: number
  temperature?: number
  presence_penalty?: number
  frequency_penalty?: number
}

// TODO: Keep history for 1 round per user per conversation
const history = [] as ChatCompletionRequestMessage[]
/**
 * OpenAI API request
 * @param IOpenAIRequestSettings
 * @returns Promise<string>
 */
export const sendPrompt = async ({
  model,
  version = '001',
  input,
  max_tokens = 100,
  temperature = 0.3,
  presence_penalty = 0,
  frequency_penalty = 0.5,
}: IOpenAIRequestSettings) => {
  try {
    let response: {
      response: string
      token: number
    }

    if (model) {
      const completion = await openAI.createCompletion({
        model: model ? `text-${model}-${version}` : 'gpt-3.5-turbo',
        prompt: `${input.split(', ').join('\n')}`,
        temperature: temperature,
        max_tokens: max_tokens,
        top_p: 0.3,
        presence_penalty,
        frequency_penalty,
      })

      response = {
        response: completion.data.choices[0].text,
        token: completion.data.usage.total_tokens,
      }
    } else {
      const completion = await openAI.createChatCompletion({
        model: 'gpt-3.5-turbo',
        n: 1,
        messages: [
          {
            role: 'system',
            content: `You are ChatGPT, a large language model trained by OpenAI. Answer as concisely as possible, sometimes you can be sarcastic. Current date: ${new Date().toLocaleDateString()}`,
          },
          ...history,
          { role: 'user', content: input.split(', ').join('\n') },
        ],
      })

      history.slice(0, 1)
      history.push({ role: 'assistant', content: input.split(', ').join('\n') })

      response = {
        response: completion.data.choices[0].message.content.replace(ROLE_MENTION_REGEX, '$1'),
        token: completion.data.usage.total_tokens,
      }
    }

    return response
  } catch (error) {
    console.log('❌ OpenAiAPI(): ', error)
  }
}
