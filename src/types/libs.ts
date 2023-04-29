import { SupabaseClient } from '@supabase/supabase-js'
import { Collection } from 'discord.js'
import { Hans } from '.'
import { GuildSettings } from '../controllers/bot/guilds.controller'
import { Database } from './database.types'

declare module 'discord.js' {
  export interface Client {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commands: Collection<unknown, any>
    settings: Hans
    supabase: SupabaseClient<Database>
    guildSettings: (guildId: string) => Promise<GuildSettings>
  }
}
