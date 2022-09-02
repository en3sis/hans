import sentiment from 'sentiment'

const SENTIMENT = new sentiment()

export const sentimentAnalysis = async (text: string) => {
  const result = SENTIMENT.analyze(text)
  if (process.env.ISDEV) {
    console.dir(`🧪 DEV: Sentiment result:`, result)
  }

  return result
}

export default SENTIMENT
