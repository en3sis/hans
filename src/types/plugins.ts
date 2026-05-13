import { CommandInteraction } from 'discord.js'
import { GuildPlugin } from '../controllers/bot/guilds.controller'

export type PluginsThreadsMetadata = {
  channelId: string
  title?: string | null
  autoMessage?: string | null
  enabled?: boolean
}

export type StandupScheduleMetadata = {
  channelId?: string
  /** Cron expression derived by the panel's `transform` from hour + days. */
  expression?: string
  hour?: number
  days?: string[]
  role?: string
  message?: string
}

export type ChatGptMetadata = {
  api_key?: string
  org?: string
  usage?: number
  /** OpenAI model id from the curated catalog (see utils/openai-models.ts). */
  model?: string
}

export type VerifyMetadata = {
  enabled?: boolean
  /** Role assigned to members who pass the captcha. */
  role?: string
  /** Channel where the captcha button is posted (Post captcha message). */
  channelId?: string
}

export type ServerActivityMetadata = {
  channelId?: string
}

export type QuestsMetadata = {
  /** Channel suggested by default when creating quests (not yet wired into /quests). */
  defaultChannelId?: string
  /** Role mentioned in the quest message when a new quest is posted. */
  notifyRoleId?: string
  /** Additional roles allowed to manage quests (advisory until wired into /quests perms). */
  moderatorRoles?: string[]
}

export type RemoveLinksMetadata = {
  /** Newline-separated list of regex patterns OR bare hostnames (e.g. github.com). */
  allowedUrls?: string
  /** Role IDs that bypass the filter. */
  allowedRoles?: string[]
}

/**
 * Per-plugin metadata shapes — the JSONB content stored in
 * guilds_plugins.metadata. Add an entry here whenever a new plugin
 * stores configuration. Used by getPluginConfig<K> to type results.
 */
export interface PluginMetadataMap {
  serverMembersActivity: ServerActivityMetadata
  serverMessagesLogs: ServerActivityMetadata
  removeLinks: RemoveLinksMetadata
  chatGtp: ChatGptMetadata
  twitch: Record<string, never>
  threads: PluginsThreadsMetadata[]
  verify: VerifyMetadata
  standup: StandupScheduleMetadata[]
  quests: QuestsMetadata
}

export type PluginsThreadsSettings = {
  interaction: CommandInteraction
  metadata: PluginsThreadsMetadata
}

export interface GuildPluginData {
  enabled: boolean
  metadata: any
  data: GuildPlugin | any
}

export interface GuildPluginChatGTPMetadata extends GuildPluginData {
  metadata: {
    api_key: string
    org: string
    usage: number
    /** Selected model id from the OpenAI catalog (utils/openai-models.ts). */
    model?: string
  }
}

export interface GuildPluginQuestsMetadata extends GuildPluginData {
  metadata: {
    settings: Record<string, unknown>
  }
}

export interface GuildQuest {
  id: string // UUID string
  guild_id: number // Integer ID from guilds table
  title: string
  description: string
  question?: string
  answer?: string
  mode: 'quiz' | 'raffle'
  winners_count?: number
  reward: string
  reward_code?: string
  channel_id: string
  thread_id?: string
  message_id?: string
  created_by: string
  created_at: string
  expiration_date: string
  is_claimed: boolean
  is_pending_claim: boolean
  winner?: {
    id: string
    username: string
    claimed_at: string
    dm_sent: boolean
    dm_failed?: boolean
  }
  winners?: Array<{
    id: string
    username: string
    selected_at: string
    dm_sent: boolean
    dm_failed?: boolean
    reward_code?: string
  }>
}
