import { Client, Guild } from 'discord.js'
import { mongoClient } from '../../lib/mongodb-driver'
import { getFromCache, setToCache } from '../../lib/node-cache'
import supabase from '../../lib/supabase'
import { GuildDocI, GuildI } from '../../models/guild.model'
import { GuildSettingsT } from '../../types'
import { CACHE_TTL } from '../../utils/constants'

/**
 * Fetches guild in the DB, if found, sets it as a cache for CACHE_TTL and returns it.
 * @param guildId string with the Guild ID
 * @returns guild document
 */
export const findOneGuild = async (
  guildId: string,
): Promise<GuildI | { status: number; message: string }> => {
  try {
    const guild = getFromCache(guildId)

    if (guild !== null) {
      return guild
    } else {
      const { data, error } = await supabase.from('guilds').select('*').eq('guild_id', guildId)

      if (error) throw error

      if (data) {
        setToCache(guildId, guild, CACHE_TTL)

        return data as unknown as GuildI
      } else {
        return {
          status: 404,
          message: `Guild with id ${guildId} not found`,
        }
      }
    }
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
    const guilds: Omit<GuildSettingsT, 'id'>[] = await Promise.all(
      Hans.guilds.cache.map((guild) => ({
        name: guild.name,
        avatar: guild.icon,
        created_at: new Date().toISOString(),
        guild_id: guild.id,
        premium: false,
        plugins: [],
      })),
    )

    const { data, error } = await supabase.from('guilds').upsert(guilds)

    if (error) console.error('❌ ERROR: insertAllGuilds(): ', error)

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
    const _guild: Omit<GuildSettingsT, 'id'> = {
      name: guild.name,
      avatar: guild.icon,
      created_at: new Date().toISOString(),
      guild_id: guild.id,
      premium: false,
      plugins: [],
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
export const updateOneGuild = async (guild: Guild, update: Partial<GuildDocI | object>) => {
  try {
    await mongoClient
      .db('guilds')
      .collection('global')
      .updateOne({ _id: guild.id }, { $set: update })
  } catch (error) {
    console.error('❌ ERROR: updateOneGuild', error)
  }
}
