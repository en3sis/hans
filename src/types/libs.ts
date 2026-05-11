import { Collection } from 'discord.js'
import { BotConfig } from '../controllers/bot/config.controller'
import { GuildSettings } from '../controllers/bot/guilds.controller'
import { GuildPluginData } from './plugins'

declare module 'discord.js' {
  export interface Client {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commands: Collection<unknown, any>
    settings: BotConfig | undefined
    guildSettings: (guildId: string) => Promise<GuildSettings | undefined>
    guildPluginSettings: (guildId: string, plugin_name: string) => Promise<GuildPluginData | undefined>
  }
}
