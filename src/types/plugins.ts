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
    quests: Array<{
      id: string
      title: string
      description: string
      question: string
      answer: string
      reward: string
      reward_code?: string
      expiration_date: string
      is_claimed: boolean
      is_pending_claim: boolean
      created_at: string
      created_by: string
      channel_id: string
      thread_id?: string
      winner?: {
        id: string
        username: string
        claimed_at: string
        dm_sent: boolean
        dm_failed?: boolean
      }
    }>
    settings: {
      moderator_roles: string[]
      allowed_channels: string[]
      default_expiration_days: number
    }
  }
}
