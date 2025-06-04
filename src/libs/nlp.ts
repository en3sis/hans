import { NlpManager } from 'node-nlp'
import path from 'path'
import fs from 'fs'
import { loadTrainingData, getTrainingStats } from '../utils/training-data'

interface TrainingData {
  intents: string[]
  answers: string[]
  entities: EntityData[]
}

interface EntityData {
  start: number
  end: number
  entity: string
  sourceText: string
}

interface ClassificationResult {
  command: string
  confidence: number
  parameters: Record<string, any>
  entities: any[]
}

interface UsageStats {
  totalRequests: number
  correctClassifications: number
  fallbackToAsk: number
  commandCounts: Record<string, number>
}

export class HansNLP {
  private manager: NlpManager
  private isInitialized: boolean
  private usageStats: UsageStats
  private modelPath: string

  constructor() {
    this.manager = new NlpManager({
      languages: ['en'],
      forceNER: true,
      autoSave: false,
      modelFileName: 'hans-nlp-model.nlp',
    })
    this.isInitialized = false
    this.usageStats = {
      totalRequests: 0,
      correctClassifications: 0,
      fallbackToAsk: 0,
      commandCounts: { weather: 0, twitch: 0, moderation: 0, ask: 0 },
    }
    this.modelPath = path.join(__dirname, '../models/hans-nlp-model.nlp')
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true
    }

    try {
      // Check if a pre-trained model exists
      if (fs.existsSync(this.modelPath)) {
        if (!!process.env.ISDEV) {
          console.log(`📂 [NLP LOADING] Loading existing model from: ${this.modelPath}`)
        }
        this.manager.load(this.modelPath)
        this.isInitialized = true
        if (!!process.env.ISDEV) {
          console.log('✅ [NLP LOADING] Hans NLP loaded successfully!')
        }
        return true
      }

      // In production, if no model exists, throw an error instead of training
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'No pre-trained NLP model found in production environment. ' +
            'Please ensure the model is generated during build time.',
        )
      }

      // Train new model if none exists (only in development)
      if (!!process.env.ISDEV) {
        console.log('🤖 [NLP TRAINING] No existing model found. Training new model...')
      }

      const trainingData = loadTrainingData()
      const stats = getTrainingStats(trainingData)

      if (!!process.env.ISDEV) {
        console.log('📊 [NLP TRAINING] Training data statistics:')
        console.log(`   Total intents: ${stats.totalIntents}`)
        console.log(`   Total utterances: ${stats.totalUtterances}`)
        console.log(`   Total answers: ${stats.totalAnswers}`)
        console.log(`   Total entities: ${stats.totalEntities}`)
        console.log('   Utterances per intent:', stats.utterancesPerIntent)
        console.log('   Entities per intent:', stats.entitiesPerIntent)
      }

      // Add documents and answers from training data
      Object.entries(trainingData).forEach(([intent, data]) => {
        data.intents.forEach((item) => {
          this.manager.addDocument('en', item.utterance, intent)

          // Add entities if present
          item.entities.forEach((entity) => {
            this.manager.addNamedEntityText(
              entity.entity,
              entity.sourceText,
              ['en'],
              [entity.sourceText],
            )
          })
        })

        data.answers.forEach((answer) => {
          this.manager.addAnswer('en', intent, answer)
        })
      })

      if (!!process.env.ISDEV) {
        console.log('🧠 [NLP TRAINING] Training the NLP model...')
      }
      await this.manager.train()

      // Ensure the models directory exists
      const modelsDir = path.dirname(this.modelPath)
      if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true })
      }

      if (!!process.env.ISDEV) {
        console.log(`💾 [NLP TRAINING] Saving trained model to: ${this.modelPath}`)
      }
      this.manager.save(this.modelPath)

      this.isInitialized = true
      if (!!process.env.ISDEV) {
        console.log('✅ [NLP TRAINING] Hans NLP initialized successfully!')
      }

      return true
    } catch (error) {
      console.error('❌ [NLP ERROR] Failed to initialize NLP:', error)
      throw error
    }
  }

  async classify(input: string): Promise<ClassificationResult> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    this.usageStats.totalRequests++

    try {
      const normalizedInput = input.toLowerCase().trim()
      const result = await this.manager.process('en', normalizedInput)

      const confidence = result.score || 0
      const intent = result.intent || 'ask'
      const entities = result.entities || []

      if (!!process.env.ISDEV) {
        console.log(`🔍 [NLP CLASSIFICATION] Input: "${input}"`)
        console.log(`   📊 Intent: ${intent} | Confidence: ${confidence.toFixed(3)}`)
        console.log(
          `   🏷️ Entities:`,
          entities.map((e) => `${e.entity}="${e.sourceText}"`).join(', '),
        )
      }

      if (confidence < 0.6) {
        this.usageStats.fallbackToAsk++
        if (!!process.env.ISDEV) {
          console.log(
            `   ⚠️ Low confidence (${confidence.toFixed(3)} < 0.6), falling back to 'ask'`,
          )
        }

        return {
          command: 'ask',
          confidence: 0.5,
          parameters: { prompt: input },
          entities: [],
        }
      }

      this.usageStats.commandCounts[intent]++
      const parameters = this.extractParameters(input, intent, entities)

      if (!!process.env.ISDEV) {
        console.log(`✅ Classification successful | Parameters:`, parameters)
      }

      return {
        command: intent,
        confidence,
        parameters,
        entities,
      }
    } catch (error) {
      console.error('❌ [NLP ERROR] Classification failed:', error)
      this.usageStats.fallbackToAsk++

      return {
        command: 'ask',
        confidence: 0.5,
        parameters: { prompt: input },
        entities: [],
      }
    }
  }

  private extractParameters(input: string, command: string, entities: any[]): Record<string, any> {
    const params: Record<string, any> = {}
    const extractionLog: string[] = []

    switch (command) {
      case 'weather':
        const cityEntity = entities.find((e) => e.entity === 'city')
        if (cityEntity) {
          params.city = cityEntity.sourceText
          extractionLog.push(`📍 City from entity: "${params.city}"`)
        } else {
          const cityMatch = input.match(/\b(?:in|at|for)\s+([a-zA-Z\s]+?)(?:\s|$|[.!?])/i)
          if (cityMatch) {
            params.city = cityMatch[1].trim()
            extractionLog.push(`📍 City from pattern: "${params.city}"`)
          } else {
            const fallbackMatch = input.match(/\b([A-Z][a-zA-Z\s]{2,}?)(?:\s|$|[.!?])/i)
            if (fallbackMatch) {
              params.city = fallbackMatch[1].trim()
              extractionLog.push(`📍 City from fallback: "${params.city}"`)
            }
          }
        }
        break

      case 'twitch':
        const usernameEntity = entities.find((e) => e.entity === 'username')
        if (usernameEntity) {
          params.username = usernameEntity.sourceText
          extractionLog.push(`👤 Username from entity: "${params.username}"`)
        } else {
          const usernameMatch = input.match(
            /(?:twitch|streamer|profile|user|channel)\s+(\w+)|(\w+)\s+twitch/i,
          )
          if (usernameMatch) {
            params.username = usernameMatch[1] || usernameMatch[2]
            extractionLog.push(`👤 Username from pattern: "${params.username}"`)
          }
        }
        break

      case 'moderation':
        // Look for both 'amount' and 'number' entity types (NLP.js can detect numbers as 'number')
        const amountEntity = entities.find((e) => e.entity === 'amount' || e.entity === 'number')
        if (amountEntity) {
          params.n = amountEntity.sourceText
          extractionLog.push(`🔢 Amount from entity (${amountEntity.entity}): "${params.n}"`)
        } else {
          // More flexible regex patterns that don't require "messages" suffix
          const numberMatch =
            input.match(/\b(\d+)\s*(?:messages?)?/i) ||
            input.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:messages?)?/i) ||
            input.match(/(?:delete|remove|purge|clear|clean)\s+(?:last\s+)?(\d+)/i) ||
            input.match(
              /(?:delete|remove|purge|clear|clean)\s+(?:last\s+)?(one|two|three|four|five|six|seven|eight|nine|ten)/i,
            )

          if (numberMatch) {
            const numStr = numberMatch[1]
            const wordToNum: Record<string, string> = {
              one: '1',
              two: '2',
              three: '3',
              four: '4',
              five: '5',
              six: '6',
              seven: '7',
              eight: '8',
              nine: '9',
              ten: '10',
            }
            params.n = wordToNum[numStr.toLowerCase()] || numStr
            extractionLog.push(`🔢 Amount from pattern: "${params.n}"`)
          } else {
            params.n = '5'
            extractionLog.push(`🔢 Default amount: "${params.n}"`)
          }
        }

        // Look for user entity
        const userEntity = entities.find((e) => e.entity === 'user')
        if (userEntity) {
          params.user = userEntity.sourceText
          extractionLog.push(`👤 User from entity: "${params.user}"`)
        } else {
          // Pattern matching for user mentions in various formats
          const userMatch =
            input.match(/(?:for|from|by|user)\s+([a-zA-Z0-9_]+)/i) ||
            input.match(/([a-zA-Z0-9_]+)\s+messages/i) ||
            input.match(/messages\s+(?:from|by)\s+([a-zA-Z0-9_]+)/i) ||
            input.match(/(?:delete|remove|purge|clear)\s+([a-zA-Z0-9_]+)(?:\s+messages)?/i)

          if (userMatch) {
            const potentialUser = userMatch[1]
            // Skip common words and numbers that might be matched
            const commonWords = [
              'last',
              'recent',
              'spam',
              'messages',
              'user',
              'all',
              'the',
              'these',
              'those',
            ]
            if (
              !commonWords.includes(potentialUser.toLowerCase()) &&
              isNaN(Number(potentialUser))
            ) {
              params.user = potentialUser
              extractionLog.push(`👤 User from pattern: "${params.user}"`)
            }
          }
        }
        break

      case 'ask':
        params.prompt = input
        extractionLog.push(`💬 Full input as prompt: "${params.prompt}"`)
        break
    }

    if (extractionLog.length > 0 && !!process.env.ISDEV) {
      console.log(`   🧩 [PARAMETER EXTRACTION] ${extractionLog.join(' | ')}`)
    }

    return params
  }

  getStats() {
    const { totalRequests, correctClassifications, fallbackToAsk, commandCounts } = this.usageStats

    return {
      totalRequests,
      correctClassifications,
      fallbackToAsk,
      commandCounts,
      accuracy: totalRequests > 0 ? ((totalRequests - fallbackToAsk) / totalRequests) * 100 : 0,
    }
  }

  logStats(): void {
    if (!!process.env.ISDEV) {
      const stats = this.getStats()
      console.log('\n📈 [NLP USAGE STATISTICS]')
      console.log(`   Total Requests: ${stats.totalRequests}`)
      console.log(`   Accuracy: ${stats.accuracy.toFixed(1)}%`)
      console.log(
        `   Fallback to Ask: ${stats.fallbackToAsk} (${((stats.fallbackToAsk / stats.totalRequests) * 100).toFixed(1)}%)`,
      )
      console.log(`   Command Distribution:`, stats.commandCounts)
    }
  }

  async forceRetrain(): Promise<boolean> {
    if (!!process.env.ISDEV) {
      console.log('🔄 [NLP RETRAIN] Force retraining model...')
    }

    // Delete existing model file
    if (fs.existsSync(this.modelPath)) {
      fs.unlinkSync(this.modelPath)
    }

    // Also remove any duplicate model files
    const rootModelPath = path.join(process.cwd(), 'model.nlp')
    if (fs.existsSync(rootModelPath)) {
      fs.unlinkSync(rootModelPath)
    }

    // Reset initialization flag
    this.isInitialized = false

    // Reinitialize (will trigger training since no model file exists)
    return await this.initialize()
  }

  getModelPath(): string {
    return this.modelPath
  }
}
