import { Configuration, OpenAIApi } from 'openai'

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
  })
)

interface IOpenAIRequestSettings {
  model?: 'ada' | 'davinci'
  predicate: string
  input: string
  max_tokens?: number
  temperature?: number
}

/**
 * OpenAI API request
 * @param IOpenAIRequestSettings
 * @returns Promise<string>
 */
export const OpenAiAPI = async ({
  model = 'ada',
  predicate,
  input,
  max_tokens = 200,
  temperature = 0.3,
}: IOpenAIRequestSettings) => {
  try {
    const response = await openai.createCompletion({
      model: `text-${model}-001`,
      prompt: `${predicate} \n ${input.split(', ').join('\n')}`,
      temperature: temperature,
      max_tokens: max_tokens,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    })

    return response
  } catch (error) {
    console.log('❌ OpenAiAPI(): ', error)
  }
}
