import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from 'discord.js'
import { and, eq } from 'drizzle-orm'
import OpenAI from 'openai'
import { db } from '../../db/client'
import { guildsPlugins } from '../../db/schema'
import { GuildPluginChatGTPMetadata } from '../../types/plugins'
import { CHATGPT_COMMANDS_USAGE_DAILY } from '../../utils/constants'
import { decrypt } from '../../utils/crypto'
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
    const { response, token, model } = await sendPrompt({
      input: prompt,
      apiKey,
      organization,
    })

    return {
      response: (response ?? '').replace('AI:', ''),
      token,
      model,
    }
  } catch (error) {
    console.log('❌ chatGTPController(): ', error)
    throw Error(error.message)
  }
}

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

    return {
      response: completion.choices[0].message.content ?? '',
      token: completion.usage?.total_tokens ?? 0,
      model: completion.model,
    }
  } catch (error) {
    throw Error(error.message)
  }
}

export const chatGptCommandHandler = async (
  interaction: ChatInputCommandInteraction,
  guild: GuildPlugin & { premium: boolean },
  guildPlugin: PluginMetadata,
  usage?: number,
) => {
  try {
    const API_KEY =
      guild.premium || (usage ?? 0) > 0 ? process.env.OPENAI_API_KEY : decrypt(guildPlugin.api_key)

    const ORGANIZATION =
      guild.premium || (usage ?? 0) > 0
        ? process.env.OPENAI_ORGANIZATION_ID
        : decrypt(guildPlugin.org)

    const prompt = interaction.options.get('prompt')!.value as string
    const answer = await chatGTPController(prompt, API_KEY!, ORGANIZATION!)

    if (!answer?.response || answer?.response === '' || answer?.response === undefined)
      return await interaction.editReply('💢 Something went wrong, please try again later.')

    const userAvatar = interaction.user.displayAvatarURL({ size: 128 })
    const botAvatar = interaction.client.user!.displayAvatarURL({ size: 128 })
    const cost = ((answer.token / 1000) * 0.00015).toFixed(6)
    const left = !guild.premium ? `  ·  🎟 ${(usage ?? 0) - 1} left today` : ''

    const container = new ContainerBuilder().setAccentColor(0x10a37f) // OpenAI green
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${interaction.user.username}** asked\n${prompt}`,
          ),
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar)),
    )
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${interaction.client.user!.username}** answered\n${truncate(answer.response, 3800)}`,
          ),
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(botAvatar)),
    )
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false))
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# 🪙 ${answer.token} tokens  ·  💵 $${cost}${left}  ·  🤖 \`${answer.model}\``,
      ),
    )

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    })
  } catch (error) {
    console.error('❌ chatGptCommandHandler(): ', error)
    throw Error(error.message)
  }
}

/** Truncate while preserving the ending and adding an ellipsis. */
const truncate = (s: string, max: number): string =>
  s.length <= max ? s : `${s.slice(0, max - 1)}…`

export const chatGptUsage = async (
  guildPlugin: PluginMetadata,
  guild_id: string,
): Promise<GuildPlugin | undefined> => {
  try {
    const current = await db.query.guildsPlugins.findFirst({
      where: and(eq(guildsPlugins.name, 'chatGtp'), eq(guildsPlugins.owner, guild_id)),
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _metadata = (current?.metadata as any) || {}

    const usage = guildPlugin === null ? CHATGPT_COMMANDS_USAGE_DAILY - 1 : guildPlugin.usage - 1

    const result = await db
      .update(guildsPlugins)
      .set({ metadata: { ..._metadata, usage } })
      .where(and(eq(guildsPlugins.name, 'chatGtp'), eq(guildsPlugins.owner, guild_id)))
      .returning()

    return result[0]
  } catch (error) {
    console.error('❌ chatGptUsage(): ', error)
    throw Error(error.message)
  }
}
