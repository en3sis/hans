import {
  ChatCompletionRequestMessage,
  ChatCompletionResponseMessage,
  Configuration,
  OpenAIApi,
} from 'openai'

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
  }),
)

const regex = /@(\w+)/g

interface IOpenAIRequestSettings {
  model?: 'ada' | 'davinci'
  version?: '003' | '001'
  predicate: string
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
export const OpenAiAPI = async ({
  model,
  version = '001',
  predicate,
  input,
  max_tokens = 100,
  temperature = 0.3,
  presence_penalty = 0,
  frequency_penalty = 0.5,
}: IOpenAIRequestSettings) => {
  try {
    let response: string | ChatCompletionResponseMessage

    if (model) {
      const completion = await openai.createCompletion({
        model: model ? `text-${model}-${version}` : 'gpt-3.5-turbo',
        prompt: `${predicate} \n ${input.split(', ').join('\n')}`,
        temperature: temperature,
        max_tokens: max_tokens,
        top_p: 0.3,
        presence_penalty,
        frequency_penalty,
      })

      response = completion.data.choices[0].text
    } else {
      const completion = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        n: 1,
        messages: [
          {
            role: 'system',
            content: `You are ChatGPT, a large language model trained by OpenAI. Answer as concisely as possible. Current date: ${new Date().toLocaleDateString()}`,
          },
          ...history,
          { role: 'user', content: input.split(', ').join('\n') },
        ],
      })

      history.slice(0, 1)
      history.push({ role: 'assistant', content: input.split(', ').join('\n') })

      response = completion.data.choices[0].message.content.replace(regex, '$1')
    }

    return response
  } catch (error) {
    console.log('❌ OpenAiAPI(): ', error)
  }
}
