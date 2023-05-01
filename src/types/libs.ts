import { SupabaseClient } from '@supabase/supabase-js'
import { Collection } from 'discord.js'
import { BotConfig } from '../controllers/bot/config'
import { GuildSettings } from '../controllers/bot/guilds.controller'
import { GuildPluginData } from '../controllers/bot/plugins.controller.'
import { Database } from './database.types'

declare module 'discord.js' {
  export interface Client {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commands: Collection<unknown, any>
    settings: BotConfig
    supabase: SupabaseClient<Database>
    guildSettings: (guildId: string) => Promise<GuildSettings>
    guildPluginSettings: (guildId: string, plugin_name: string) => Promise<GuildPluginData>
  }
}
