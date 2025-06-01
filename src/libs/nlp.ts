import { NlpManager } from 'node-nlp'
import path from 'path'
import fs from 'fs'

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
  private trainingData: Record<string, TrainingData>
  private usageStats: UsageStats
  private modelPath: string

  constructor() {
    this.manager = new NlpManager({ languages: ['en'], forceNER: true })
    this.isInitialized = false
    this.trainingData = this.getTrainingData()
    this.modelPath = path.join(__dirname, '../models/hans-nlp-model.nlp')
    this.usageStats = {
      totalRequests: 0,
      correctClassifications: 0,
      fallbackToAsk: 0,
      commandCounts: { weather: 0, twitch: 0, moderation: 0, ask: 0 },
    }
  }

  private getTrainingData(): Record<string, TrainingData> {
    return {
      weather: {
        intents: [
          'weather in Madrid',
          'what is the temperature in Tokyo',
          'how is the weather today',
          'temperature in London',
          'is it raining in Paris',
          'climate in New York',
          'what is the weather like in Berlin',
          'how hot is it in Miami',
          'is it sunny in Los Angeles',
          'weather forecast for Chicago',
          'current weather in Barcelona',
          'temperature check for Rome',
          'weather conditions in Moscow',
          'is it cold in Stockholm',
          'weather update for Dublin',
          'how is the climate in Sydney',
          'temperature today in Amsterdam',
          'weather status in Vienna',
          'is it windy in San Francisco',
          'weather report for Mumbai',
          'current temperature in Seoul',
          'weather in my city',
          'local weather conditions',
          'today weather forecast',
          'check weather outside',
        ],
        answers: [
          'I will check the weather for you',
          'Getting weather information',
          'Fetching current weather data',
        ],
        entities: [
          { start: 11, end: 17, entity: 'city', sourceText: 'Madrid' },
          { start: 31, end: 36, entity: 'city', sourceText: 'Tokyo' },
          { start: 15, end: 21, entity: 'city', sourceText: 'London' },
          { start: 20, end: 25, entity: 'city', sourceText: 'Paris' },
          { start: 14, end: 22, entity: 'city', sourceText: 'New York' },
        ],
      },
      twitch: {
        intents: [
          'show ninja twitch',
          'twitch profile summit1g',
          'get twitch user shroud',
          'ninja twitch profile',
          'check twitch streamer xqc',
          'twitch channel pokimane',
          'streamer info tfue',
          'show me amouranth twitch',
          'hasanabi twitch stats',
          'twitch user lirik',
          'streamer profile asmongold',
          'check out sodapoppin twitch',
          'twitch channel myth',
          'show twitch user timthetatman',
          'get info on twitch streamer disguisedtoast',
          'twitch profile drlupo',
          'check twitch channel nickmercs',
          'show me twitch user cohhcarnage',
          'twitch streamer info dakotaz',
          'get twitch profile kitboga',
          'show twitch channel mizkif',
          'twitch user ludwig',
          'streamer profile valkyrae',
          'check twitch user pewdiepie',
          'twitch channel info markiplier',
          'is riot live?',
        ],
        answers: [
          'I will get the Twitch profile for you',
          'Fetching Twitch streamer information',
          'Getting Twitch channel data',
        ],
        entities: [
          { start: 5, end: 10, entity: 'username', sourceText: 'ninja' },
          { start: 15, end: 23, entity: 'username', sourceText: 'summit1g' },
          { start: 16, end: 22, entity: 'username', sourceText: 'shroud' },
          { start: 0, end: 5, entity: 'username', sourceText: 'ninja' },
          { start: 22, end: 25, entity: 'username', sourceText: 'xqc' },
        ],
      },
      moderation: {
        intents: [
          'delete 5 messages',
          'remove last 10 messages',
          'purge 3 messages',
          'clear the last 7 messages',
          'clean up 15 messages',
          'delete recent 20 messages',
          'remove 2 messages',
          'purge last 50 messages',
          'clear 8 messages',
          'clean 12 messages',
          'delete one message',
          'remove two messages',
          'purge three messages',
          'clear four messages',
          'delete five messages',
          'remove six messages',
          'purge seven messages',
          'clear eight messages',
          'delete nine messages',
          'remove ten messages',
          'delete 5',
          'remove 10',
          'purge 3',
          'clear 7',
          'clean 15',
          'delete 20',
          'remove 2',
          'purge 50',
          'clear 8',
          'clean 12',
          'bulk delete messages',
          'mass delete chat',
          'cleanup chat history',
          'clear recent chat',
          'delete spam messages',
        ],
        answers: [
          'I will delete the messages for you',
          'Purging messages from the channel',
          'Cleaning up the chat',
        ],
        entities: [
          { start: 7, end: 8, entity: 'amount', sourceText: '5' },
          { start: 17, end: 19, entity: 'amount', sourceText: '10' },
          { start: 6, end: 7, entity: 'amount', sourceText: '3' },
          { start: 15, end: 16, entity: 'amount', sourceText: '7' },
          { start: 9, end: 11, entity: 'amount', sourceText: '15' },
          { start: 7, end: 8, entity: 'amount', sourceText: '1' },
          { start: 7, end: 8, entity: 'amount', sourceText: '2' },
          { start: 7, end: 8, entity: 'amount', sourceText: '4' },
          { start: 7, end: 8, entity: 'amount', sourceText: '6' },
          { start: 7, end: 8, entity: 'amount', sourceText: '8' },
          { start: 7, end: 8, entity: 'amount', sourceText: '9' },
          { start: 7, end: 9, entity: 'amount', sourceText: '12' },
          { start: 7, end: 9, entity: 'amount', sourceText: '20' },
          { start: 7, end: 9, entity: 'amount', sourceText: '50' },
        ],
      },
      ask: {
        intents: [
          'what is JavaScript',
          'explain quantum physics',
          'how does machine learning work',
          'tell me about artificial intelligence',
          'help me understand React',
          'what is the meaning of life',
          'how do computers work',
          'explain blockchain technology',
          'what is TypeScript',
          'how does the internet work',
          'tell me about Node.js',
          'what is artificial neural networks',
          'explain database design',
          'how does encryption work',
          'what is cloud computing',
          'explain APIs and REST',
          'how does Git work',
          'what is Docker',
          'explain microservices architecture',
          'how does authentication work',
          'what is DevOps',
          'explain CI/CD pipelines',
          'how does caching work',
          'what is GraphQL',
          'explain web security',
          'help me with programming',
          'teach me about coding',
          'explain software development',
          'what are design patterns',
          'how to optimize performance',
        ],
        answers: [
          'I will help answer your question',
          'Let me explain that for you',
          'I can help you understand that topic',
        ],
        entities: [],
      },
    }
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

      Object.entries(this.trainingData).forEach(([intent, data]) => {
        data.intents.forEach((utterance) => {
          this.manager.addDocument('en', utterance, intent)
        })

        data.answers.forEach((answer) => {
          this.manager.addAnswer('en', intent, answer)
        })

        if (data.entities && data.entities.length > 0) {
          data.entities.forEach((entity) => {
            this.manager.addNamedEntityText(
              'en',
              entity.entity,
              entity.sourceText,
              ['en'],
              [entity.sourceText.toLowerCase()],
            )
          })
        }
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
        console.log(`   ✅ Classification successful | Parameters:`, parameters)
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

    // Reset initialization flag
    this.isInitialized = false

    // Reinitialize (will trigger training since no model file exists)
    return await this.initialize()
  }

  getModelPath(): string {
    return this.modelPath
  }
}
