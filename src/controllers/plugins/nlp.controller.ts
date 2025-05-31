import { Message, CommandInteraction, TextChannel, GuildMember } from 'discord.js'
import { Hans } from '../..'
import { resolveGuildPlugins } from '../bot/plugins.controller'
import { logger } from '../../utils/debugging'
import { GuildPluginChatGTPMetadata } from '../../types/plugins'
import { decrypt } from '../../utils/crypto'
import OpenAI from 'openai'

interface CommandMapping {
  command: string
  parameters?: Record<string, any>
  confidence: number
}

const sendNLPPrompt = async (
  systemPrompt: string,
  userInput: string,
  apiKey: string,
  organization: string,
) => {
  try {
    const OPEN_AI_CLIENT = new OpenAI({ apiKey: apiKey })

    const completion = await OPEN_AI_CLIENT.chat.completions.create({
      model: 'gpt-4o-mini',
      max_completion_tokens: 150,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userInput,
        },
      ],
    })

    return {
      response: completion.choices[0].message.content,
      token: completion.usage.total_tokens,
      model: completion.model,
    }
  } catch (error) {
    throw Error(error.message)
  }
}

const parseNaturalLanguageCommand = async (
  input: string,
  apiKey: string,
  organization: string,
): Promise<CommandMapping> => {
  const systemPrompt = `You are a command parser for a Discord bot. Analyze the user input and return ONLY a JSON object - no explanations, no text, just JSON.

Available commands:
- weather: Get weather information for a specific city (requires: city name)
- twitch: Get Twitch profile information for a user (requires: username)  
- moderation: Delete recent messages from channel (requires: number, needs admin permissions)
- ask: Ask AI questions or general conversation (requires: prompt text)

IMPORTANT: You MUST respond with ONLY valid JSON in this exact format:
{"command": "command_name", "parameters": {"param": "value"}, "confidence": 0.95}

Examples:
- "weather in Madrid" → {"command": "weather", "parameters": {"city": "Madrid"}, "confidence": 0.95}
- "what's the weather in Tokyo" → {"command": "weather", "parameters": {"city": "Tokyo"}, "confidence": 0.95}
- "temperature in London" → {"command": "weather", "parameters": {"city": "London"}, "confidence": 0.90}
- "delete 5 messages" → {"command": "moderation", "parameters": {"n": "5"}, "confidence": 0.90}
- "show ninja twitch" → {"command": "twitch", "parameters": {"username": "ninja"}, "confidence": 0.85}
- "twitch profile summit1g" → {"command": "twitch", "parameters": {"username": "summit1g"}, "confidence": 0.85}
- "what is JavaScript" → {"command": "ask", "parameters": {"prompt": "what is JavaScript"}, "confidence": 0.80}
- "explain quantum physics" → {"command": "ask", "parameters": {"prompt": "explain quantum physics"}, "confidence": 0.75}

Weather command triggers:
- Any mention of "weather", "temperature", "temp", "rain", "snow", "climate" with a city name
- Patterns like "what's the weather in [city]", "temperature in [city]", "weather [city]"

Twitch command triggers:
- Any mention of "twitch" with a username
- Patterns like "show [username] twitch", "twitch profile [username]", "twitch user [username]"

Moderation command triggers:
- Any mention of "delete", "remove", "purge" with a number and "messages"
- Patterns like "delete [n] messages", "remove last [n] messages", "purge [n] messages"

Rules:
- confidence: 0.0-1.0 (use "ask" if < 0.7 or unclear)
- Extract exact city names, usernames, or numbers from input
- Return ONLY the JSON object
- No markdown, no explanations, no extra text`

  try {
    const response = await sendNLPPrompt(
      systemPrompt,
      `Parse this user input into a command: "${input}"`,
      apiKey,
      organization,
    )

    let jsonText = response.response.trim()

    // Try to extract JSON if it's wrapped in markdown or has extra text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    const parsed = JSON.parse(jsonText)

    // Validate the response structure
    if (!parsed.command || !parsed.confidence) {
      throw new Error('Invalid response structure')
    }

    return parsed
  } catch (error) {
    console.log('❌ AI Response parsing failed, raw response:', error)
    console.log('⚠️ Falling back to ask command for input:', input)

    return {
      command: 'ask',
      parameters: { prompt: input },
      confidence: 0.5,
    }
  }
}

class MockInteraction {
  private message: Message
  private commandName: string
  private _options: Map<string, any>
  private _deferred: boolean = false
  private _replied: boolean = false
  private _ephemeral: boolean = false
  private sentMessage: Message

  constructor(
    message: Message,
    commandName: string,
    options: Record<string, any> = {},
    thinkingMessage: Message,
  ) {
    this.message = message
    this.commandName = commandName
    this._options = new Map()
    this.sentMessage = thinkingMessage // Use the pre-sent "thinking" message

    Object.entries(options).forEach(([key, value]) => {
      this._options.set(key, {
        value,
        type: typeof value === 'string' ? 3 : typeof value === 'number' ? 4 : 5,
      })
    })
  }

  get user() {
    return this.message.author
  }

  get member() {
    return this.message.member
  }

  get guild() {
    return this.message.guild
  }

  get guildId() {
    return this.message.guildId
  }

  get channel() {
    return this.message.channel
  }

  get channelId() {
    return this.message.channelId
  }

  get client() {
    return this.message.client
  }

  get memberPermissions() {
    return this.message.member?.permissions
  }

  get options() {
    return {
      get: (name: string) => this._options.get(name),
      getSubcommand: () => this.subcommand,
      getSubcommandGroup: () => this.subcommandGroup,
      getString: (name: string) => this._options.get(name)?.value as string,
      getNumber: (name: string) => this._options.get(name)?.value as number,
      getBoolean: (name: string) => this._options.get(name)?.value as boolean,
    }
  }

  private subcommand: string | null = null
  private subcommandGroup: string | null = null

  setSubcommand(subcommand: string) {
    this.subcommand = subcommand
  }

  setSubcommandGroup(group: string) {
    this.subcommandGroup = group
  }

  async deferReply(options?: { ephemeral?: boolean }) {
    this._deferred = true
    this._ephemeral = options?.ephemeral || false
    // Don't send a new message, just mark as deferred since we already have the thinking message

    return this.sentMessage
  }

  async editReply(options: any) {
    if (!this.sentMessage) {
      throw new Error('No message to edit')
    }

    if (typeof options === 'string') {
      await this.sentMessage.edit(options)
    } else {
      await this.sentMessage.edit({
        content: options.content || '',
        embeds: options.embeds || [],
        files: options.files || [],
      })
    }

    return this.sentMessage
  }

  isCommand() {
    return true
  }

  isChatInputCommand() {
    return true
  }

  get replied() {
    return this._replied
  }

  get deferred() {
    return this._deferred
  }
}

const executeSlashCommand = async (
  message: Message,
  commandMapping: CommandMapping,
  userInput: string,
  thinkingMessage: Message,
) => {
  const command = Hans.commands.get(commandMapping.command)

  if (!command) {
    throw new Error(`Command ${commandMapping.command} not found`)
  }

  let mockInteraction: MockInteraction

  // Handle different command types
  switch (commandMapping.command) {
    case 'weather':
      mockInteraction = new MockInteraction(
        message,
        'weather',
        {
          city: commandMapping.parameters?.city || '',
        },
        thinkingMessage,
      )
      break

    case 'twitch':
      mockInteraction = new MockInteraction(
        message,
        'twitch',
        {
          username: commandMapping.parameters?.username || '',
        },
        thinkingMessage,
      )
      break

    case 'moderation':
      mockInteraction = new MockInteraction(
        message,
        'moderation',
        {
          n: parseInt(commandMapping.parameters?.n || commandMapping.parameters?.amount || '1'),
        },
        thinkingMessage,
      )
      mockInteraction.setSubcommandGroup('messages')
      mockInteraction.setSubcommand('purge')
      break

    case 'ask':
      mockInteraction = new MockInteraction(
        message,
        'ask',
        {
          prompt: commandMapping.parameters?.prompt || userInput,
        },
        thinkingMessage,
      )
      break

    default:
      throw new Error(`Unsupported command: ${commandMapping.command}`)
  }

  await command.execute(mockInteraction as unknown)
}

export const handleMentionNLP = async (message: Message) => {
  try {
    const {
      enabled,
      metadata: guildPluginData,
      data: guildData,
    } = (await resolveGuildPlugins(message.guildId!, 'chatGtp')) as GuildPluginChatGTPMetadata

    console.log('🔍 Guild plugin data:', JSON.stringify(guildData, null, 2))

    if (!enabled) {
      return await message.reply('This plugin requires ChatGPT to be enabled for this server.')
    }

    const API_KEY =
      guildData?.premium || (guildPluginData?.usage !== undefined && guildPluginData?.usage > 0)
        ? process.env.OPENAI_API_KEY
        : guildPluginData?.api_key
          ? decrypt(guildPluginData.api_key)
          : process.env.OPENAI_API_KEY

    const ORGANIZATION =
      guildData?.premium || (guildPluginData?.usage !== undefined && guildPluginData?.usage > 0)
        ? process.env.OPENAI_ORGANIZATION_ID
        : guildPluginData?.org
          ? decrypt(guildPluginData.org)
          : process.env.OPENAI_ORGANIZATION_ID

    if (!API_KEY || !ORGANIZATION) {
      return await message.reply(
        'ChatGPT configuration is required to use natural language commands. Please configure it with `/plugins chatgpt`.',
      )
    }

    // Extract the message content after the mention
    const userInput = message.content.replace(/<@!?\d+>/g, '').trim()

    if (!userInput) {
      return await message.reply(
        'Please tell me what you want me to do! For example: `@hans what is the weather in Madrid?`',
      )
    }

    // Send thinking message that will be edited by the command
    const thinkingMessage = await message.reply('🤔 Let me understand what you want...')

    const commandMapping = await parseNaturalLanguageCommand(userInput, API_KEY, ORGANIZATION)

    if (commandMapping.confidence < 0.7) {
      console.log(
        '⚠️ Low confidence, falling back to ask command. Confidence:',
        commandMapping.confidence,
      )
    }

    // Execute the actual slash command
    await executeSlashCommand(message, commandMapping, userInput, thinkingMessage)
  } catch (error) {
    logger('❌ handleMentionNLP():', error instanceof Error ? error : new Error(String(error)))
    await message.reply('An error occurred while processing your natural language command.')
  }
}
