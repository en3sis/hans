import { Configuration, OpenAIApi } from 'openai'

export const openAI = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
  }),
)
