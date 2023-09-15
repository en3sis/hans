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

export type GuildPluginData = {
  enabled: boolean
  metadata: any
  data: GuildPlugin | any
}
