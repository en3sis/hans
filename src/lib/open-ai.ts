import { ChatCompletionResponseMessage, Configuration, OpenAIApi } from 'openai'

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
  }),
)

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
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Who won the world series in 2020?' },
          { role: 'assistant', content: 'The Los Angeles Dodgers won the World Series in 2020.' },
          { role: 'user', content: input.split(', ').join('\n') },
        ],
      })
      response = completion.data.choices[0].message.content
    }

    return response
  } catch (error) {
    console.log('❌ OpenAiAPI(): ', error)
  }
}
