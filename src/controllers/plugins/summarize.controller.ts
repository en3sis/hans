import { inference } from '../../libs/huggingface'

export const summarizeController = async (text: string): Promise<string> => {
  try {
    const { summary_text } = await inference.summarization({
      model: 'facebook/bart-large-cnn',
      parameters: {
        max_length: 100,
      },
      inputs: text,
    })

    return summary_text
  } catch (error) {
    console.error('❌ summarizeController(): ', error)
    throw new Error(error)
  }
}
