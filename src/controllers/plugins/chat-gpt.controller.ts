import { CommandInteraction } from 'discord.js'
import { Configuration, OpenAIApi } from 'openai'
import supabase from '../../libs/supabase'
import { GuildPluginChatGTPMetadata } from '../../types/plugins'
import { DEFAULT_COLOR } from '../../utils/colors'
import { CHATGPT_COMMANDS_USAGE_DAILY } from '../../utils/constants'
import { decrypt } from '../../utils/crypto'
import { ROLE_MENTION_REGEX } from '../../utils/regex'
import { GuildPlugin } from '../bot/guilds.controller'

interface IOpenAIRequestSettings {
  model?: string
  input: string
  max_tokens?: number
  temperature?: number
  presence_penalty?: number
  frequency_penalty?: number
  apiKey: string
  organization: string
}

type PluginMetadata = GuildPluginChatGTPMetadata['metadata']

export const chatGTPController = async (prompt: string, apiKey: string, organization: string) => {
  try {
    const { response, token } = await sendPrompt({
      input: prompt,
      apiKey,
      organization,
    })

    return {
      response: response.replace('AI:', ''),
      token,
    }
  } catch (error) {
    console.log('❌ chatGTPController(): ', error)
    throw Error(error.message)
  }
}

/**
 * OpenAI API request
 * @param IOpenAIRequestSettings
 * @returns Promise<string>
 */
export const sendPrompt = async ({
  input,
  model = 'gpt-3.5-turbo',
  max_tokens = 300,
  temperature = 0.7,
  presence_penalty = 0.5,
  frequency_penalty = 0.5,
  apiKey,
  organization,
}: IOpenAIRequestSettings) => {
  try {
    const OPEN_AI_CLIENT = new OpenAIApi(
      new Configuration({
        apiKey: apiKey,
        organization: organization,
      }),
    )

    // INFO: 10% chance of being sarcastic, spice things up a bit.
    const sarcasm = Math.random() < 0.1 ? 'My answer is extremely sarcastic and clever' : ''

    const completion = await OPEN_AI_CLIENT.createChatCompletion({
      model,
      n: 1,
      temperature: temperature,
      max_tokens: max_tokens,
      top_p: 0.3,
      presence_penalty,
      frequency_penalty,
      messages: [
        {
          role: 'system',
          content: `I'm Hans, your all-knowing assistant. ${sarcasm}.  Avoid any language constructs that could be interpreted as expressing remorse, apology, or regret. Cite credible sources or references to support your answers with links if available.Current date: ${new Date().toLocaleDateString()}`,
        },
        {
          role: 'user',
          content: input,
        },
      ],
    })

    const response = {
      response: completion.data.choices[0].message.content.replace(ROLE_MENTION_REGEX, '$1'),
      token: completion.data.usage.total_tokens,
    }

    return response
  } catch (error) {
    throw Error(error.message)
  }
}

export const chatGptCommandHandler = async (
  interaction: CommandInteraction,
  guild: GuildPlugin & { premium: boolean },
  guildPlugin: PluginMetadata,
  usage?: number,
) => {
  try {
    const API_KEY =
      guild.premium || usage > 0 ? process.env.OPENAI_API_KEY : decrypt(guildPlugin.api_key)

    const ORGANIZATION =
      guild.premium || usage > 0 ? process.env.OPENAI_ORGANIZATION_ID : decrypt(guildPlugin.org)

    const prompt = interaction.options.get('prompt')!.value as string
    const answer = await chatGTPController(prompt, API_KEY, ORGANIZATION)

    if (!answer?.response || answer?.response === '' || answer?.response === undefined)
      return await interaction.editReply('💢 Something went wrong, please try again later.')

    await interaction.editReply({
      embeds: [
        {
          author: {
            name: `${interaction.user.username} asked:`,
            icon_url: interaction.user.avatarURL(),
          },
          description: `${prompt}`,
          color: 0x5865f2,
        },
        {
          author: {
            name: `${interaction.client.user.username} answered: `,
            icon_url: interaction.client.user.avatarURL(),
          },
          description: `${answer?.response}`,
          footer: {
            text: `Tokens: ${answer?.token} | Price: $${((answer?.token / 1000) * 0.002).toFixed(
              6,
            )} ${!guild.premium ? `| ${usage - 1} usages left for today` : ''}`,
          },
          color: DEFAULT_COLOR,
        },
      ],
    })
  } catch (error) {
    console.error('❌ chatGptCommandHandler(): ', error)
    throw Error(error.message)
  }
}

export const chatGptUsage = async (
  guildPlugin: PluginMetadata,
  guild_id: string,
): Promise<GuildPlugin> => {
  try {
    const { data: currentSettings } = await supabase
      .from('guilds_plugins')
      .select('*')
      .eq('name', 'chatGtp')
      .eq('owner', guild_id)
      .single()

    const _metadata = JSON.parse(JSON.stringify(currentSettings?.metadata)) || {}

    const usage = guildPlugin === null ? CHATGPT_COMMANDS_USAGE_DAILY - 1 : guildPlugin.usage - 1

    const { data } = await supabase
      .from('guilds_plugins')
      .update({ metadata: { ..._metadata, usage } })
      .eq('owner', guild_id)
      .eq('name', 'chatGtp')
      .select()
      .single()

    return data
  } catch (error) {
    console.error('❌ chatGptUsage(): ', error)
    throw Error(error.message)
  }
}
