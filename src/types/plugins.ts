import { CommandInteraction } from 'discord.js'
import { GuildPlugin } from '../controllers/bot/guilds.controller'

export type PluginsThreadsMetadata = {
  channelId: string
  title?: string | null
  autoMessage?: string | null
  enabled?: boolean
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

// Define metadata of Plugins
export interface GuildPluginChatGTPMetadata extends GuildPluginData {
  metadata: {
    api_key: string
    org: string
    usage: number
  }
}
