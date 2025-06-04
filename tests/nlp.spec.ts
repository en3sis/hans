import { HansNLP } from '../src/libs/nlp'

describe('HansNLP intent classification', () => {
  let nlp: HansNLP

  beforeAll(async () => {
    nlp = new HansNLP()
    await nlp.initialize()
  })

  it('should classify weather intents', async () => {
    const inputs = [
      'Is it raining in Paris?',
      'What is the weather like in Tokyo?',
      'Give me the forecast for Berlin',
    ]
    for (const input of inputs) {
      const result = await nlp.classify(input)
      expect(result.command).toBe('weather')
    }
  })

  it('should classify twitch intents', async () => {
    const inputs = [
      'Show me Ninja Twitch stream',
      'What is the viewer count for Pokimane?',
      'Is xQc live right now?',
    ]
    for (const input of inputs) {
      const result = await nlp.classify(input)
      expect(result.command).toBe('twitch')
    }
  })

  it('should classify moderation intents', async () => {
    const inputs = [
      'Delete last 5 messages',
      'Remove all messages from @spammer',
      'Clear chat history',
      'delete last 10 messages from en3sis',
    ]
    for (const input of inputs) {
      const result = await nlp.classify(input)
      expect(result.command).toBe('moderation')
    }
  })

  it('should classify ask intents', async () => {
    const inputs = [
      'What is quantum computing?',
      'Explain how neural networks work',
      'How does the internet work?',
    ]
    for (const input of inputs) {
      const result = await nlp.classify(input)
      expect(result.command).toBe('ask')
    }
  })
})
