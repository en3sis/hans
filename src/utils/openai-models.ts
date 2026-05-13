/**
 * Curated catalog of OpenAI chat models the bot is allowed to use.
 *
 * Single source of truth for:
 *  - the model picker shown in the /plugins panel (chatGtp);
 *  - server-side validation when a guild's stored model id is no longer
 *    in the catalog;
 *  - cost calculation in the answer footer.
 *
 * Prices are in USD per 1 million tokens and reflect public OpenAI list
 * pricing at time of edit — update here when OpenAI changes them. They
 * are advisory only (the footer note in chat-gpt.controller.ts says
 * "approx."), and stale prices won't break the bot.
 */
export interface OpenAIModelInfo {
  /** OpenAI model id passed verbatim to the API. */
  id: string
  /** Short human label for the picker. */
  label: string
  /** One-line description shown in the picker. */
  description: string
  /** USD per 1M input tokens (uncached). */
  inputPerMTokens: number
  /**
   * USD per 1M cached input tokens. Optional — defaults to 10% of
   * `inputPerMTokens` (OpenAI's standard prompt-cache discount) when
   * not explicitly set.
   */
  cachedInputPerMTokens?: number
  /** USD per 1M output tokens. */
  outputPerMTokens: number
}

/** Ordered cheapest → most expensive so the picker reads as a cost ladder. */
export const OPENAI_MODELS: readonly OpenAIModelInfo[] = [
  {
    id: 'gpt-5-nano',
    label: '5 nano',
    description: 'Cheapest, latest — Hans default.',
    inputPerMTokens: 0.05,
    cachedInputPerMTokens: 0.01,
    outputPerMTokens: 0.4,
  },
  {
    id: 'gpt-4.1-nano',
    label: '4.1 nano',
    description: 'Cheap 4.1 — short answers, basic Q&A.',
    inputPerMTokens: 0.1,
    outputPerMTokens: 0.4,
  },
  {
    id: 'gpt-4o-mini',
    label: '4o mini',
    description: 'Reliable cheap option, well-tested.',
    inputPerMTokens: 0.15,
    outputPerMTokens: 0.6,
  },
  {
    id: 'gpt-4.1-mini',
    label: '4.1 mini',
    description: 'Stronger reasoning than 4o-mini at moderate cost.',
    inputPerMTokens: 0.4,
    outputPerMTokens: 1.6,
  },
  {
    id: 'gpt-4.1',
    label: '4.1',
    description: 'Flagship 4.1 — better quality, ~13× the cost of 4o-mini.',
    inputPerMTokens: 2.0,
    outputPerMTokens: 8.0,
  },
  {
    id: 'gpt-4o',
    label: '4o',
    description: 'Multimodal flagship — expensive, use sparingly.',
    inputPerMTokens: 2.5,
    outputPerMTokens: 10.0,
  },
] as const

export type OpenAIModelId = (typeof OPENAI_MODELS)[number]['id']

export const DEFAULT_OPENAI_MODEL: OpenAIModelId = 'gpt-5-nano'

const MODEL_INDEX: Record<string, OpenAIModelInfo> = Object.fromEntries(
  OPENAI_MODELS.map((m) => [m.id, m]),
)

/** Returns the catalog entry if the id is allowed, otherwise undefined. */
export const findModel = (id: string | undefined | null): OpenAIModelInfo | undefined =>
  id ? MODEL_INDEX[id] : undefined

/** Always returns a usable model — falls back to the default when unknown. */
export const resolveModel = (id: string | undefined | null): OpenAIModelInfo =>
  findModel(id) ?? MODEL_INDEX[DEFAULT_OPENAI_MODEL]

/**
 * Compute USD cost for one completion, accounting for prompt caching.
 *
 * OpenAI returns `usage.prompt_tokens_details.cached_tokens` when its
 * automatic prefix cache hits (currently triggered for stable prefixes
 * ≥ 1024 tokens on supported models). Cached tokens are billed at the
 * model's `cachedInputPerMTokens` rate (defaults to 10% of input).
 *
 * Falls back to the default model's rates if `modelId` is unknown —
 * mirrors the runtime fallback so the footer always shows *something*
 * coherent.
 */
export const estimateCost = (
  modelId: string,
  promptTokens: number,
  completionTokens: number,
  cachedPromptTokens = 0,
): number => {
  const m = resolveModel(modelId)
  const cachedRate = m.cachedInputPerMTokens ?? m.inputPerMTokens * 0.1
  const uncachedPrompt = Math.max(promptTokens - cachedPromptTokens, 0)
  return (
    (uncachedPrompt * m.inputPerMTokens +
      cachedPromptTokens * cachedRate +
      completionTokens * m.outputPerMTokens) /
    1_000_000
  )
}
