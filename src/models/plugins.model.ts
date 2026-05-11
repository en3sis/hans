/**
 * Canonical plugin registry.
 *
 * One source of truth: to add a plugin, add a single entry to PLUGIN_REGISTRY.
 * The fields previously split across `pluginsList` and `initialGuildPluginState()`
 * are now colocated here. The two legacy exports are derived from the registry
 * for backwards compatibility with existing call sites.
 *
 * Fields:
 *   - description    Shown in UI / docs.
 *   - category       Grouping for slash-command pickers.
 *   - enabled        Global kill-switch (the `plugins.enabled` column).
 *                    If false, no guild can use the plugin regardless of their
 *                    per-guild setting.
 *   - premium        Marks the plugin as premium-only.
 *   - defaultEnabled Initial value of `guilds_plugins.enabled` when a guild
 *                    first sees this plugin (via guildCreate or startup backfill).
 *   - cacheable      Whether resolved config can be cached for 5 min.
 *                    Set to false for plugins whose metadata is mutated on
 *                    every invocation (e.g. usage counters).
 */
import { GuildPluginRow, Plugin } from '../db/schema'

export type Plugins = Plugin
export type GuildPlugins = GuildPluginRow
export type GenericPluginParts = Omit<Plugin, 'id' | 'name'>

export type PluginCategory =
  | 'miscellaneous'
  | 'server'
  | 'moderation'
  | 'productivity'
  | 'entertainment'
  | 'engagement'

export interface PluginDefinition {
  /** Human-readable name shown in the panel & list view. */
  label: string
  /** Single emoji rendered before the label. */
  icon: string
  description: string
  category: PluginCategory
  enabled: boolean
  premium: boolean
  defaultEnabled: boolean
  cacheable: boolean
}

export const PLUGIN_REGISTRY = {
  serverMembersActivity: {
    label: 'Join / Leave Notifications',
    icon: '🚪',
    description: 'Posts a message in a channel whenever a member joins or leaves.',
    category: 'server',
    enabled: true,
    premium: false,
    defaultEnabled: false,
    cacheable: true,
  },
  serverMessagesLogs: {
    label: 'Message Audit Log',
    icon: '📝',
    description: 'Logs edited and deleted messages to a channel.',
    category: 'moderation',
    enabled: true,
    premium: false,
    defaultEnabled: false,
    cacheable: true,
  },
  removeLinks: {
    label: 'Link Removal',
    icon: '🔗',
    description: 'Auto-removes links unless the channel, URL or role is allowed.',
    category: 'moderation',
    enabled: true,
    premium: false,
    defaultEnabled: false,
    cacheable: true,
  },
  chatGtp: {
    label: 'ChatGPT',
    icon: '🤖',
    description: 'Conversational AI powered by your own OpenAI key.',
    category: 'productivity',
    enabled: true,
    premium: true,
    defaultEnabled: true,
    // Metadata holds a per-day usage counter that is mutated on every /ask
    // call; caching would serve stale counts.
    cacheable: false,
  },
  twitch: {
    label: 'Twitch Lookup',
    icon: '📺',
    description: 'Pulls a Twitch streamer’s public profile and stream status.',
    category: 'entertainment',
    enabled: true,
    premium: false,
    defaultEnabled: true,
    cacheable: true,
  },
  threads: {
    label: 'Auto-Threads',
    icon: '🧵',
    description: 'Auto-creates a thread on every message in selected channels.',
    category: 'server',
    enabled: true,
    premium: false,
    defaultEnabled: true,
    cacheable: true,
  },
  verify: {
    label: 'Captcha Verification',
    icon: '🛡️',
    description: 'Gates new members behind an emoji captcha before granting a role.',
    category: 'moderation',
    enabled: true,
    premium: false,
    defaultEnabled: false,
    cacheable: true,
  },
  standup: {
    label: 'Standups',
    icon: '📣',
    description: 'Posts scheduled standup prompts and opens a thread for replies.',
    category: 'productivity',
    enabled: true,
    premium: false,
    defaultEnabled: false,
    cacheable: true,
  },
  quests: {
    label: 'Quests & Raffles',
    icon: '🏆',
    description: 'Run quiz or raffle events where members win rewards.',
    category: 'engagement',
    enabled: true,
    premium: false,
    defaultEnabled: true,
    cacheable: true,
  },
} as const satisfies Record<string, PluginDefinition>

export type PluginName = keyof typeof PLUGIN_REGISTRY

export const PLUGIN_NAMES = Object.keys(PLUGIN_REGISTRY) as PluginName[]

export const isPluginName = (name: string): name is PluginName => name in PLUGIN_REGISTRY

/** Legacy export — derived from PLUGIN_REGISTRY. Prefer PLUGIN_REGISTRY directly. */
export const pluginsList: Record<PluginName, GenericPluginParts> = Object.fromEntries(
  Object.entries(PLUGIN_REGISTRY).map(([name, def]) => [
    name,
    {
      description: def.description,
      category: def.category,
      enabled: def.enabled,
      premium: def.premium,
      created_at: new Date().toISOString(),
    },
  ]),
) as Record<PluginName, GenericPluginParts>

/** Legacy export — derived from PLUGIN_REGISTRY. Prefer PLUGIN_REGISTRY directly. */
export const initialGuildPluginState = (): Record<PluginName, { default_enabled: boolean }> =>
  Object.fromEntries(
    Object.entries(PLUGIN_REGISTRY).map(([name, def]) => [name, { default_enabled: def.defaultEnabled }]),
  ) as Record<PluginName, { default_enabled: boolean }>
