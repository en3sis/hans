import { OpenAiAPI } from '../../lib/open-ai'

export const gpt3Controller = async (prompt: string) => {
  const response = await OpenAiAPI({
    input: `${prompt}`,
    version: '003',
    max_tokens: 150,
  })

  return response.replace('AI:', '')
}
