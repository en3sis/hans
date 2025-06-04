import { loadTrainingData, getTrainingStats } from '../src/utils/training-data'

describe('Training Data Loader', () => {
  let trainingData: ReturnType<typeof loadTrainingData>

  beforeAll(() => {
    trainingData = loadTrainingData()
  })

  it('should load and merge training data successfully', () => {
    expect(trainingData).toBeDefined()
    expect(Object.keys(trainingData)).toContain('weather')
    expect(Object.keys(trainingData)).toContain('twitch')
    expect(Object.keys(trainingData)).toContain('moderation')
    expect(Object.keys(trainingData)).toContain('ask')
  })

  it('should have valid data structure for each intent', () => {
    Object.entries(trainingData).forEach(([intent, data]) => {
      expect(data.intents).toBeDefined()
      expect(Array.isArray(data.intents)).toBe(true)
      expect(data.answers).toBeDefined()
      expect(Array.isArray(data.answers)).toBe(true)

      // Check utterance structure
      data.intents.forEach((utterance) => {
        expect(utterance.utterance).toBeDefined()
        expect(typeof utterance.utterance).toBe('string')
        expect(Array.isArray(utterance.entities)).toBe(true)
      })
    })
  })

  it('should have valid entity data', () => {
    Object.entries(trainingData).forEach(([intent, data]) => {
      data.intents.forEach((utterance) => {
        utterance.entities.forEach((entity) => {
          expect(entity.start).toBeDefined()
          expect(typeof entity.start).toBe('number')
          expect(entity.end).toBeDefined()
          expect(typeof entity.end).toBe('number')
          expect(entity.entity).toBeDefined()
          expect(typeof entity.entity).toBe('string')
          expect(entity.sourceText).toBeDefined()
          expect(typeof entity.sourceText).toBe('string')

          // Verify entity boundaries
          expect(entity.start).toBeLessThan(entity.end)
          expect(entity.end).toBeLessThanOrEqual(utterance.utterance.length)

          // Verify entity text matches
          const extractedText = utterance.utterance.substring(entity.start, entity.end)
          expect(extractedText).toBe(entity.sourceText)
        })
      })
    })
  })

  it('should have sufficient training data', () => {
    const stats = getTrainingStats(trainingData)

    // Minimum requirements for a solid model
    expect(stats.totalIntents).toBeGreaterThanOrEqual(4) // weather, twitch, moderation, ask
    expect(stats.totalUtterances).toBeGreaterThanOrEqual(100) // At least 25 per intent
    expect(stats.totalAnswers).toBeGreaterThanOrEqual(12) // At least 3 per intent

    // Check distribution
    Object.values(stats.utterancesPerIntent).forEach((count) => {
      expect(count).toBeGreaterThanOrEqual(20) // Each intent should have at least 20 utterances
    })
  })

  it('should have no duplicate utterances within intents', () => {
    Object.entries(trainingData).forEach(([intent, data]) => {
      const utterances = data.intents.map((u) => u.utterance)
      const uniqueUtterances = new Set(utterances)
      expect(utterances.length).toBe(uniqueUtterances.size)
    })
  })

  it('should have no duplicate answers within intents', () => {
    Object.entries(trainingData).forEach(([intent, data]) => {
      const uniqueAnswers = new Set(data.answers)
      expect(data.answers.length).toBe(uniqueAnswers.size)
    })
  })
})
