import { OpenAiAPI } from '../../lib/open-ai'

export const gpt3Controller = async (prompt: string) => {
  const { response, token } = await OpenAiAPI({
    input: `${prompt}`,
    version: '003',
    max_tokens: 150,
  })

  return {
    response: response.replace('AI:', ''),
    token,
  }
}
