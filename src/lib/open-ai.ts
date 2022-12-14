import { Configuration, OpenAIApi } from 'openai'

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
  model = 'ada',
  version = '001',
  predicate,
  input,
  max_tokens = 100,
  temperature = 0.3,
  presence_penalty = 0,
  frequency_penalty = 0.5,
}: IOpenAIRequestSettings) => {
  try {
    const response = await openai.createCompletion({
      model: `text-${model}-${version}`,
      prompt: `${predicate} \n ${input.split(', ').join('\n')}`,
      temperature: temperature,
      max_tokens: max_tokens,
      top_p: 0.3,
      presence_penalty,
      frequency_penalty,
    })

    return response
  } catch (error) {
    console.log('❌ OpenAiAPI(): ', error)
  }
}
