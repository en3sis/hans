import { Client, ClientEvents, Guild } from 'discord.js'

import supabase from '../../lib/supabase'
import { Database } from '../../types/database.types'
import { Hans } from './../../index'

export type GuildSettings = Database['public']['Tables']['guilds']['Row']
export type GuildPlugin = Database['public']['Tables']['guilds-plugins']['Row']
/**  Fetches guild in the DB, if found, sets it as a cache for CACHE_TTL and returns it.
 * @param guildId string with the Guild ID
 * @returns guild document
 */
export const findOneGuild = async (guildId: string) => {
  try {
    const { data, error } = await supabase
      .from('guilds')
      .select('*')
      .eq('guild_id', guildId)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('❌ ERROR: findOneGuild(): ', error)
  }
}

/**
 * Fetches the guilds Hans is part of and inserts them into the database.
 * @param Hans - The client instance
 */
export const insertAllGuilds = async (Hans: Client) => {
  try {
    const guilds: Omit<GuildSettings, 'id'>[] = await Promise.all(
      Hans.guilds.cache.map((guild) => ({
        name: guild.name,
        avatar: guild.icon,
        created_at: new Date().toISOString(),
        guild_id: guild.id,
        premium: false,
        events: [],
      })),
    )

    const { data, error } = await supabase.from('guilds').upsert(guilds, {
      onConflict: 'guild_id',
    })

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('❌ ERROR: insertAllGuilds(): ', error)
  }
}

/**
 * Inserts a new guild into the database
 * @param guild Guild Object from discord.js
 */
export const insetOneGuild = async (guild: Guild) => {
  try {
    const _guild: Omit<GuildSettings, 'id'> = {
      avatar: guild.icon,
      created_at: new Date().toISOString(),
      guild_id: guild.id,
      name: guild.name,
      premium: false,
      events: [],
    }

    const { data, error } = await supabase.from('guilds').upsert(_guild)

    if (error) throw error

    return data
  } catch (error) {
    console.error('❌ ERROR: insetOneGuild: ', error)
  }
}

/**
 * Update a new guild into the database
 * @param guild Guild Object from discord.js
 */
// export const updateOneGuild = async (guild: Guild, update: Partial<GuildDocI | object>) => {
//   try {
//     await mongoClient
//       .db('guilds')
//       .collection('global')
//       .updateOne({ _id: guild.id }, { $set: update })
//   } catch (error) {
//     console.error('❌ ERROR: updateOneGuild', error)
//   }
// }

/**
 * Resolves if a guild has the events enabled and if a specific event is enabled
 * @param id guild id
 * @param event extends ClientEvents
 * @returns boolean
 */
export const resolveGuildPlugins = async (
  id: string,
  event: keyof ClientEvents,
): Promise<{ enabled: boolean; metadata: any; data: GuildPlugin }> => {
  try {
    const { data, error } = await Hans.supabase
      .from('guilds-plugins')
      .select('*')
      .eq('guild_id', id)
      .eq('name', event)
      .single()

    if (error) throw error

    return {
      enabled: data[event] || false,
      metadata: JSON.parse(JSON.stringify(data.metadata)),
      data,
    }
  } catch (error) {
    console.error('❌ ERROR: resolveGuildPlugins(): ', error)
  }
}

// Allows to get guild user's settings directly from the client.
Hans.guildSettings = async (guildId: string) => await findOneGuild(guildId)
