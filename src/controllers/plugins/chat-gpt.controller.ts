import { ChatInputCommandInteraction } from 'discord.js'
import { and, eq } from 'drizzle-orm'
import { db } from '../../libs/drizzle'
import { guildsPlugins } from '../../db/schema'
import { GuildPluginChatGTPMetadata } from '../../types/plugins'
import { DEFAULT_COLOR } from '../../utils/colors'
import { CHATGPT_COMMANDS_USAGE_DAILY } from '../../utils/constants'
import { decrypt } from '../../utils/crypto'
import { GuildPluginRow } from '../bot/plugins.controller'
import OpenAI from 'openai'

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
    const { response, token, model } = await sendPrompt({
      input: prompt,
      apiKey,
      organization,
    })

    return {
      response: response.replace('AI:', ''),
      token,
      model,
    }
  } catch (error) {
    console.log('❌ chatGTPController(): ', error)
    throw Error(error.message)
  }
}

/**
 * OpenAI API request
 * @param IOpenAIRequestSettings
 * @returns Promise<{response, token, model}>
 */
export const sendPrompt = async ({
  input,
  model = 'gpt-4o-mini',
  max_tokens = 3000,
  apiKey,
}: IOpenAIRequestSettings) => {
  try {
    const OPEN_AI_CLIENT = new OpenAI({ apiKey: apiKey })

    const completion = await OPEN_AI_CLIENT.chat.completions.create({
      model,
      max_completion_tokens: max_tokens,
      messages: [
        {
          role: 'system',
          content: `You are Hans, your all-knowing assistant.
          Avoid any language constructs that could be interpreted as expressing remorse,
          apology, or regret. Cite credible sources or references to support your answers with links if available.
          Current date: ${new Date().toLocaleDateString()}.
          For code or commands, use markdown code blocks with the right syntax (e.g., \`\`\`javascript for JS, \`\`\`python for Python). Use Discord-friendly markdown formatting (bold, italics, code blocks)
          When providing measurements, always include both metric and imperial units in this format:
          Always provide the metric unit first, followed by the imperial unit in parentheses.
          Use numbered lists for steps and bullet points for options and keep messages concise when possible; use thread formatting for longer explanations.
          `,
        },
        {
          role: 'user',
          content: input,
        },
      ],
    })

    const response = {
      response: completion.choices[0].message.content,
      token: completion.usage.total_tokens,
      model: completion.model,
    }

    return response
  } catch (error) {
    throw Error(error.message)
  }
}

export const chatGptCommandHandler = async (
  interaction: ChatInputCommandInteraction,
  guild: GuildPluginRow & { premium: boolean },
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
            text: `Tokens: ${answer?.token} | Price: $${((answer?.token / 1000) * 0.00015).toFixed(6)} ${!guild.premium ? `| ${usage - 1} usages left for today` : ''} | Model: ${answer.model}`,
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
): Promise<GuildPluginRow> => {
  try {
    const currentSettings = await db
      .select()
      .from(guildsPlugins)
      .where(and(eq(guildsPlugins.name, 'chatGtp'), eq(guildsPlugins.owner, guild_id)))
      .limit(1)

    const _metadata = JSON.parse(JSON.stringify(currentSettings[0]?.metadata)) || {}

    const usage = guildPlugin === null ? CHATGPT_COMMANDS_USAGE_DAILY - 1 : guildPlugin.usage - 1

    const result = await db
      .update(guildsPlugins)
      .set({ metadata: { ..._metadata, usage } })
      .where(and(eq(guildsPlugins.owner, guild_id), eq(guildsPlugins.name, 'chatGtp')))
      .returning()

    return result[0]
  } catch (error) {
    console.error('❌ chatGptUsage(): ', error)
    throw Error(error.message)
  }
}
