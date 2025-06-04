import { HansNLP } from '../src/libs/nlp'

describe('HansNLP intent classification', () => {
  let nlp: HansNLP

  beforeAll(async () => {
    nlp = new HansNLP()
    await nlp.initialize()
  })

  it('should classify weather intents', async () => {
    const testCases = [
      { input: 'Is it raining in Paris?', expectedCity: 'Paris' },
      { input: 'What is the weather like in Tokyo?', expectedCity: 'Tokyo' },
      { input: 'Give me the forecast for Berlin', expectedCity: 'Berlin' },
      { input: 'Is it raining in New York?', expectedCity: 'New York' },
      { input: 'What is the weather like in London?', expectedCity: 'London' },
      { input: 'Give me the forecast for Dubai', expectedCity: 'Dubai' },
      { input: 'What is the weather in Almería?', expectedCity: 'Almería' },
      { input: 'What is the weather in Málaga?', expectedCity: 'Málaga' },
    ]

    for (const testCase of testCases) {
      const result = await nlp.classify(testCase.input)
      expect(result.command).toBe('weather')

      const { city } = result.parameters
      expect(city).toBe(testCase.expectedCity)
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

  it('should find the correct number of intents', async () => {
    const testCases = [
      { input: 'Delete last 5 messages', expectedN: 5, expectedUser: null },
      { input: 'delete last 10 messages from en3sis', expectedN: 10, expectedUser: 'en3sis' },
      { input: 'clear last 3 messages', expectedN: 3, expectedUser: null },
    ]

    for (const testCase of testCases) {
      const result = await nlp.classify(testCase.input)
      expect(result.command).toBe('moderation')

      const { n, user } = result.parameters

      expect(Number(n)).toBe(testCase.expectedN)

      if (testCase.expectedUser) {
        expect(user).toBe(testCase.expectedUser)
      } else {
        expect(user).toBeUndefined()
      }
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
