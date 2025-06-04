import { Message } from 'discord.js'
import { Hans } from '../..'
import { resolveGuildPlugins } from '../bot/plugins.controller'
import { logger } from '../../utils/debugging'
import { GuildPluginChatGTPMetadata } from '../../types/plugins'
import { HansNLP } from '../../libs/nlp'
import { findUserByNameOrNickname } from './moderation.controller'

interface CommandMapping {
  command: string
  parameters?: Record<string, any>
  confidence: number
}

const nlpInstance = new HansNLP()

class MockInteraction {
  private message: Message
  private commandName: string
  private _options: Map<string, any>
  private _deferred: boolean = false
  private _replied: boolean = false
  private _ephemeral: boolean = false
  private sentMessage: Message
  private _memberPermissions: any

  constructor(
    message: Message,
    commandName: string,
    options: Record<string, any> = {},
    thinkingMessage: Message,
    memberPermissions?: any,
    ephemeral?: boolean,
  ) {
    this.message = message
    this.commandName = commandName
    this._options = new Map()
    this.sentMessage = thinkingMessage
    this._memberPermissions = memberPermissions || {
      has: () => false,
    }
    this._ephemeral = ephemeral || false

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
    return this._memberPermissions
  }

  get options() {
    return {
      get: (name: string) => {
        const option = this._options.get(name)
        if (name === 'user' && option?.value && typeof option.value === 'object') {
          return { user: option.value }
        }
        return option
      },
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

    return this.sentMessage
  }

  async editReply(options: any) {
    if (!this.sentMessage) {
      throw new Error('No message to edit')
    }

    if (this._ephemeral) {
      try {
        await this.sentMessage.delete()
      } catch (error) {
        // Ignore if message is already deleted
      }

      try {
        if (typeof options === 'string') {
          await this.message.author.send(options)
        } else {
          await this.message.author.send({
            content: options.content || '',
            embeds: options.embeds || [],
            files: options.files || [],
          })
        }
      } catch (error) {
        await this.message.reply(
          '⚠️ I tried to send you a private response, but your DMs are disabled. Please enable DMs to receive ephemeral command responses.',
        )
      }

      return this.sentMessage
    } else {
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

const parseNaturalLanguageWithNLP = async (input: string): Promise<CommandMapping> => {
  try {
    if (!!process.env.ISDEV) {
      console.log(`🔍 [NLP-LIB] Processing input: "${input}"`)
    }

    const result = await nlpInstance.classify(input)

    return {
      command: result.command,
      parameters: result.parameters,
      confidence: result.confidence,
    }
  } catch (error) {
    logger('❌ NLP classification failed:', error)

    return {
      command: 'ask',
      parameters: { prompt: input },
      confidence: 0.5,
    }
  }
}

const getAvailableNLPCommands = () => {
  const nlpSupportedCommands = ['weather', 'twitch', 'moderation', 'ask']
  const commandFields: Array<{ name: string; value: string; inline: boolean }> = []

  const commandIcons = {
    weather: '🌤️',
    twitch: '🎮',
    moderation: '🛡️',
    ask: '🤖',
  }

  const commandExamples = {
    weather: '"What\'s the weather in Tokyo?"',
    twitch: '"Show me ninja\'s Twitch profile"',
    moderation: '"Delete 5 messages"',
    ask: '"Explain how JavaScript works"',
  }

  nlpSupportedCommands.forEach((commandName) => {
    const command = Hans.commands.get(commandName)
    if (command) {
      const icon = commandIcons[commandName] || '🔧'
      const example = commandExamples[commandName] || `"Use ${commandName} command"`
      const name = command.data.name || commandName
      const description = command.data.description || 'No description available'

      commandFields.push({
        name: `${icon} ${name.charAt(0).toUpperCase() + name.slice(1)}`,
        value: `${description}\n*Example: ${example}*`,
        inline: commandName !== 'ask',
      })
    }
  })

  return commandFields
}

const executeSlashCommand = async (
  message: Message,
  commandMapping: CommandMapping,
  userInput: string,
  thinkingMessage: Message,
) => {
  const command = Hans.commands.get(commandMapping.command)

  if (!command) {
    if (commandMapping.command === 'None' || commandMapping.command === 'none') {
      const availableCommands = getAvailableNLPCommands()

      await thinkingMessage.edit({
        embeds: [
          {
            title: '🤔 Command Not Recognized',
            description: `I couldn't map your request to a specific command. Here are the available commands I can handle through natural language:`,
            fields: availableCommands,
            footer: {
              text: `Your input: "${userInput}"`,
            },
          },
        ],
      })

      return
    }

    throw new Error(`Command ${commandMapping.command} not found`)
  }

  const memberPermissions = message.member?.permissions || {
    has: () => false,
  }

  const isEphemeral = command.ephemeral || false

  let mockInteraction: MockInteraction

  switch (commandMapping.command) {
    case 'weather':
      mockInteraction = new MockInteraction(
        message,
        'weather',
        {
          city: commandMapping.parameters?.city || '',
        },
        thinkingMessage,
        memberPermissions,
        isEphemeral,
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
        memberPermissions,
        isEphemeral,
      )
      break

    case 'moderation':
      const moderationOptions: Record<string, any> = {
        n: parseInt(commandMapping.parameters?.n || commandMapping.parameters?.amount || '1'),
      }

      let subcommand = 'purge'
      const subcommandGroup = 'messages'

      if (commandMapping.parameters?.user) {
        const targetUser = await findUserByNameOrNickname(
          message.guild!,
          commandMapping.parameters.user,
        )

        if (targetUser) {
          moderationOptions.user = targetUser
          subcommand = 'user'

          if (!!process.env.ISDEV) {
            console.log(
              `🎯 [NLP-LIB] Found user: ${targetUser.username} (${targetUser.id}) for query: "${commandMapping.parameters.user}"`,
            )
          }
        } else {
          if (!!process.env.ISDEV) {
            console.log(
              `⚠️ [NLP-LIB] User not found for query: "${commandMapping.parameters.user}", falling back to general purge`,
            )
          }
        }
      }

      mockInteraction = new MockInteraction(
        message,
        'moderation',
        moderationOptions,
        thinkingMessage,
        memberPermissions,
        isEphemeral,
      )
      mockInteraction.setSubcommandGroup(subcommandGroup)
      mockInteraction.setSubcommand(subcommand)
      break

    case 'ask':
      mockInteraction = new MockInteraction(
        message,
        'ask',
        {
          prompt: commandMapping.parameters?.prompt || userInput,
        },
        thinkingMessage,
        memberPermissions,
        isEphemeral,
      )
      break

    default:
      throw new Error(`Unsupported command: ${commandMapping.command}`)
  }

  await command.execute(mockInteraction as unknown)
}

export const handleMentionNLPLib = async (message: Message) => {
  try {
    const {
      enabled,
      // metadata: guildPluginData,
      // data: guildData,
    } = (await resolveGuildPlugins(message.guildId!, 'chatGtp')) as GuildPluginChatGTPMetadata

    if (!enabled) {
      return await message.reply('This plugin requires ChatGPT to be enabled for this server.')
    }

    const userInput = message.content.replace(/<@!?\d+>/g, '').trim()

    if (!userInput) {
      return await message.reply(
        'Please tell me what you want me to do! For example: `@hans what is the weather in Madrid?`',
      )
    }

    const thinkingMessage = await message.reply('💭 Understanding your request...')

    const commandMapping = await parseNaturalLanguageWithNLP(userInput)

    if (!!process.env.ISDEV) {
      console.log(
        `🎯 [NLP-LIB] Classified "${userInput}" as "${commandMapping.command}" with ${commandMapping.confidence.toFixed(3)} confidence`,
      )

      if (commandMapping.confidence < 0.6) {
        console.log(
          '⚠️ Low confidence, falling back to ask command. Confidence:',
          commandMapping.confidence,
        )
      }
    }

    // Moderation commands are not allowed to be executed with low confidence
    if (commandMapping.command === 'moderation' && commandMapping.confidence < 0.9) {
      await thinkingMessage.edit(
        'I do not feel confident enough to execute this command. Please try again with more specific instructions.',
      )

      return
    }

    await executeSlashCommand(message, commandMapping, userInput, thinkingMessage)

    if (nlpInstance.getStats().totalRequests % 10 === 0) {
      nlpInstance.logStats()
    }
  } catch (error) {
    logger('❌ handleMentionNLPLib():', error instanceof Error ? error : new Error(String(error)))
    await message.reply('An error occurred while processing your natural language command.')
  }
}

export { parseNaturalLanguageWithNLP, nlpInstance }
