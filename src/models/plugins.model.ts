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
  description: string
  category: PluginCategory
  enabled: boolean
  premium: boolean
  defaultEnabled: boolean
  cacheable: boolean
}

export const PLUGIN_REGISTRY = {
  serverMembersActivity: {
    description: 'Notifies to a specific channel when a new member joins/leaves the server.',
    category: 'server',
    enabled: true,
    premium: false,
    defaultEnabled: false,
    cacheable: true,
  },
  serverMessagesLogs: {
    description: 'Logs messages those are deleted or edited into a specific channel.',
    category: 'moderation',
    enabled: true,
    premium: false,
    defaultEnabled: false,
    cacheable: true,
  },
  removeLinks: {
    description:
      'Removes any links posted in a channel, with the option to allow specific roles or links to be posted.',
    category: 'moderation',
    enabled: false,
    premium: false,
    defaultEnabled: false,
    cacheable: true,
  },
  chatGtp: {
    description: 'Enables a conversation with ChatGPT, an AI chatbot.',
    category: 'productivity',
    enabled: true,
    premium: true,
    defaultEnabled: true,
    // Metadata holds a per-day usage counter that is mutated on every /ask
    // call; caching would serve stale counts.
    cacheable: false,
  },
  summarize: {
    description: 'Summarizes a text or discord message using the facebook/bart-large-cnn model.',
    category: 'miscellaneous',
    enabled: true,
    premium: false,
    defaultEnabled: false,
    cacheable: true,
  },
  twitch: {
    description: 'Shows information about a twitch streamer.',
    category: 'entertainment',
    enabled: true,
    premium: false,
    defaultEnabled: true,
    cacheable: true,
  },
  textClassification: {
    description: 'Classifies a text, informs moderation if the sentiment is negative.',
    category: 'miscellaneous',
    enabled: false,
    premium: false,
    defaultEnabled: false,
    cacheable: true,
  },
  threads: {
    description: 'Allows for the automatic creation of threads in a specific channel.',
    category: 'server',
    enabled: true,
    premium: false,
    defaultEnabled: true,
    cacheable: true,
  },
  events: {
    description:
      'Provides quick Add to calendar links for Google & Outlook for the events you are subscribed to',
    category: 'productivity',
    enabled: true,
    premium: false,
    defaultEnabled: true,
    cacheable: true,
  },
  verify: {
    description: 'Verifies that the user is human.',
    category: 'moderation',
    enabled: true,
    premium: false,
    defaultEnabled: false,
    cacheable: true,
  },
  standup: {
    description: 'Notifies the members to post their standup.',
    category: 'productivity',
    enabled: true,
    premium: false,
    defaultEnabled: false,
    cacheable: true,
  },
  quests: {
    description:
      'Allows admins to create quest events where users can win rewards by answering questions correctly.',
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
