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
import { getBotConfiguration } from '../bot/config.controller'
import { GuildPluginChatGTPMetadata } from '../../types/plugins'
import { CHATGPT_COMMANDS_USAGE_DAILY } from '../../utils/constants'
import { decrypt } from '../../utils/crypto'
import {
  DEFAULT_OPENAI_MODEL,
  estimateCost,
  resolveModel,
} from '../../utils/openai-models'
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

/**
 * Hans's assistant system prompt.
 *
 * Kept fully static (no dynamic interpolation) so it forms a stable token
 * prefix across every call — OpenAI's automatic prompt cache reuses it
 * across all guilds/users when the prefix exceeds ~1024 tokens, cutting
 * input cost ~90% on cache hits. The dynamic current-date hint moves to
 * the user message instead.
 *
 * Style targets: useful, modern, Discord-aware, opinionated about
 * formatting so answers render correctly in chat (no LaTeX, no tables,
 * no nested deep lists).
 */
const SYSTEM_PROMPT = `You are Hans, an AI assistant embedded in Discord servers as a community-facing helper. Your output lands directly inside a Discord message, so formatting and length matter as much as accuracy.

## Voice & approach
- Be direct, useful, and concrete. Get to the answer fast; cut filler like "Great question!", "I'd be happy to…", and unsolicited apologies.
- Match the user's register: casual for casual asks, precise and technical for engineering questions.
- Default to brevity. Expand only when the topic genuinely needs it. Aim for the shortest answer that fully addresses the question.
- Never claim feelings, consciousness, or personal experiences. You are a tool, not a persona — Hans is just a name.
- When a question is ambiguous, ask one focused clarifying question instead of guessing across multiple interpretations.
- When you are unsure, or your training data may be stale (frameworks, prices, public figures, current events), say so explicitly. Do not fabricate facts, URLs, statistics, version numbers, or quotes.
- Push back when the user is wrong, including politely correcting false premises. Don't sycophantically agree.

## Discord-native formatting
Your response renders as Discord markdown. Use exactly the subset Discord supports:
- **Bold** for emphasis, *italic* sparingly, ~~strikethrough~~ for corrections, \`inline code\` for identifiers, paths, commands, and short tokens.
- Fenced code blocks with explicit language tags for every code or shell snippet. Examples: \`\`\`ts, \`\`\`python, \`\`\`bash, \`\`\`sql, \`\`\`json, \`\`\`yaml. Never use a fenced block without a language.
- Headers \`# H1\`, \`## H2\`, \`### H3\` — at most one H1 per answer, only when the response is genuinely multi-section.
- Bullet lists with \`-\` and ordered steps with \`1.\`. Avoid lists of fewer than three items; use prose instead.
- Block quotes with \`>\` for short cited snippets. Spoilers with \`||text||\` for puzzle answers or content the asker might want to reveal voluntarily.
- Mask URLs as \`[label](https://…)\` when the bare URL would be noisy; otherwise paste the URL plain.

Do not use:
- HTML tags, LaTeX, or Markdown tables — Discord does not render any of them.
- Nested lists more than two levels deep — they break visually.
- Embedded images or image links — they will not render inline; describe the image or link out instead.
- Mentions (\`@user\`, \`@everyone\`, \`@here\`, \`<@id>\`) — you do not have permission to ping.

Keep total message length under ~3500 characters. If the topic genuinely needs more, lead with a 2–3 sentence executive summary, then expand; offer to continue in a thread for very long topics.

## Code & technical answers
- Show runnable, complete examples over abstract prose. If a snippet won't run alone, say what it depends on.
- For shell commands, show the command first, then a one-line explanation. Prefer POSIX-compatible commands unless the user is clearly on Windows.
- For multi-step procedures, use numbered steps; each step performs one observable action.
- When citing libraries, frameworks, or APIs, name the package and a known-good version if version sensitivity matters (\`react@18\`, \`drizzle-orm@0.40\`).
- Acknowledge ecosystem velocity: package APIs, cloud-provider UIs, and best practices change quickly; if your training data may be behind, flag it and suggest checking the official docs.
- Prefer modern idioms: ES modules over CommonJS, async/await over .then chains, type-safe APIs over stringly-typed ones, immutable updates over in-place mutation.
- Security defaults: never produce code that hardcodes secrets, disables TLS verification, or constructs SQL/HTML/shell input by string concatenation. If the user asks for one of those patterns, explain the risk and offer a safer alternative.

## Citations
- When you state facts that a reader might verify (specs, statistics, recent releases, dates, legal claims), include a link to a credible primary source: \`[MDN](https://developer.mozilla.org/...)\`, \`[RFC 7231](https://datatracker.ietf.org/doc/html/rfc7231)\`, official docs, vendor changelogs.
- Never invent URLs. If you don't have a real source, write "I don't have a citation handy — verify with the official docs" instead of guessing.
- For programming answers, link the language/library official docs over third-party tutorials when both exist.

## Units & numbers
- Provide metric first with imperial in parentheses: "100 km (62 mi)", "5 kg (11 lb)", "20 °C (68 °F)".
- For currency, include the unit code: "$100 USD", "€80 EUR".
- For large numbers, use thousands separators in prose ("12,400 requests") and SI prefixes in technical contexts ("12.4k req/s").
- For dates, prefer ISO 8601 (\`2026-05-13\`) when precision matters; otherwise use the format natural to the user's locale.

## Boundaries
- Decline malicious requests: malware, doxxing, targeted harassment, instructions enabling real-world harm. State the refusal briefly and without lecturing.
- You don't have visibility into the server, channel, or any member data beyond what's in the current message. If asked "who is X?" or "what was said yesterday?", say you can't see it.
- You can't take actions: you cannot ban members, post messages, fetch live data, browse the web, run code, or read files. If a user asks for one, explain you can only respond with text in this single message.
- For server-moderation, billing, or account questions, redirect to the server's admins or the official support channel rather than improvising policy.

When you must choose, prioritize in this order: accuracy > clarity > brevity > style.`

/**
 * Bot-wide configuration is read on every /ask via the Hans-pays path. Cache
 * it for 60s so we don't hammer the DB — the only mutable field we care
 * about (`default_openai_model`) is set rarely and from outside `/ask`.
 */
const BOT_CONFIG_TTL_MS = 60_000
let botConfigCache: { value: Awaited<ReturnType<typeof getBotConfiguration>>; at: number } | null =
  null
const getCachedBotConfig = async () => {
  const now = Date.now()
  if (botConfigCache && now - botConfigCache.at < BOT_CONFIG_TTL_MS) return botConfigCache.value
  const value = await getBotConfiguration()
  botConfigCache = { value, at: now }
  return value
}

export const chatGTPController = async (
  prompt: string,
  apiKey: string,
  organization: string,
  modelId?: string,
) => {
  try {
    const { response, token, promptTokens, completionTokens, cachedPromptTokens, model } =
      await sendPrompt({
        input: prompt,
        apiKey,
        organization,
        // Validate caller's stored choice against the catalog; fall back to
        // default if a model was removed/renamed since they last configured.
        model: resolveModel(modelId).id,
      })

    return {
      response: (response ?? '').replace('AI:', ''),
      token,
      promptTokens,
      completionTokens,
      cachedPromptTokens,
      model,
    }
  } catch (error) {
    console.log('❌ chatGTPController(): ', error)
    throw Error(error.message)
  }
}

export const sendPrompt = async ({
  input,
  model = DEFAULT_OPENAI_MODEL,
  max_tokens = 3000,
  apiKey,
  organization,
}: IOpenAIRequestSettings) => {
  try {
    const OPEN_AI_CLIENT = new OpenAI({ apiKey, organization })

    const completion = await OPEN_AI_CLIENT.chat.completions.create({
      model,
      max_completion_tokens: max_tokens,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          // Date stays out of the system prompt so the cached prefix is fully
          // stable. Prepending it here keeps it visible to the model without
          // busting the daily cache.
          role: 'user',
          content: `(Today is ${new Date().toISOString().slice(0, 10)}.)\n\n${input}`,
        },
      ],
    })

    return {
      response: completion.choices[0].message.content ?? '',
      token: completion.usage?.total_tokens ?? 0,
      promptTokens: completion.usage?.prompt_tokens ?? 0,
      completionTokens: completion.usage?.completion_tokens ?? 0,
      // Server-side prompt cache hits (≥1024 token stable prefixes). 0 when
      // not engaged; the field is present on supported models from late 2024.
      cachedPromptTokens: completion.usage?.prompt_tokens_details?.cached_tokens ?? 0,
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

    // Model selection follows the same split as the API key:
    //   - Hans-pays path (premium / free quota) → bot-wide default from the
    //     `configs` table (set by Hans owners).
    //   - BYO-key path → guild's per-plugin choice.
    // Both fall back to DEFAULT_OPENAI_MODEL inside chatGTPController if the
    // stored id is unset or no longer in the catalog.
    const usesHansKey = guild.premium || (usage ?? 0) > 0
    const modelId = usesHansKey
      ? (await getCachedBotConfig())?.default_openai_model
      : guildPlugin.model
    const answer = await chatGTPController(prompt, API_KEY!, ORGANIZATION!, modelId ?? undefined)

    if (!answer?.response || answer?.response === '' || answer?.response === undefined)
      return await interaction.editReply('💢 Something went wrong, please try again later.')

    const userAvatar = interaction.user.displayAvatarURL({ size: 128 })
    const botAvatar = interaction.client.user!.displayAvatarURL({ size: 128 })
    const cost = estimateCost(
      answer.model,
      answer.promptTokens,
      answer.completionTokens,
      answer.cachedPromptTokens,
    ).toFixed(6)
    const cacheNote = answer.cachedPromptTokens > 0 ? `  ·  ⚡ ${answer.cachedPromptTokens} cached` : ''
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
        `-# 🪙 ${answer.token} tokens${cacheNote}  ·  💵 $${cost}${left}  ·  🤖 \`${answer.model}\``,
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
