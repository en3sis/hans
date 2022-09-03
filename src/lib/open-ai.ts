import { Configuration, OpenAIApi } from 'openai'

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
  })
)

type models = 'ada' | 'davinci'

export const OpenAiAPI = async (
  model: models,
  predicate: string,
  input: string,
  max_tokens = 200,
  temperature = 0.3
) => {
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
