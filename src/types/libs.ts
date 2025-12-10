import { Collection } from 'discord.js'
import { BotConfig } from '../controllers/bot/config.controller'
import { GuildSettings } from '../controllers/bot/guilds.controller'
import { GuildPluginData } from './plugins'

declare module 'discord.js' {
  interface Client {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commands: Collection<string, any>
    settings: BotConfig
    guildSettings: (guildId: string) => Promise<GuildSettings>
    guildPluginSettings: (guildId: string, plugin_name: string) => Promise<GuildPluginData>
  }
}
