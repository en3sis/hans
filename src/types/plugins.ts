import { CommandInteraction } from 'discord.js'
import { GuildPlugin } from '../controllers/bot/guilds.controller'

export type PluginsThreadsMetadata = {
  channelId: string
  title?: string | null
  autoMessage?: string | null
  enabled?: boolean
}

export type StandupScheduleMetadata = {
  channelId: string
  expression: string
  role: string
  message: string
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
