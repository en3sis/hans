import { Client, Guild } from 'discord.js'
import supabase from '../../libs/supabase'
import { Database } from '../../types/database.types'
import { Hans } from './../../index'
import { insertGuildPlugin, resolveGuildPlugins } from './plugins.controller'

export type GuildSettings = Database['public']['Tables']['guilds']['Row']
export type GuildPlugin = Database['public']['Tables']['guilds_plugins']['Row']

/** Fetches guild in the DB, if found, sets it as a cache for CACHE_TTL and returns it.
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

/** Fetches the guilds Hans is part of and inserts them into the database.
 * @param Hans - The client instance
 */
export const insertAllGuilds = async (Hans: Client) => {
  try {
    const guilds: Omit<GuildSettings, 'id' | 'premium'>[] = Hans.guilds.cache.map((guild) => ({
      name: guild.name,
      avatar: guild.icon,
      created_at: new Date().toISOString(),
      guild_id: guild.id,
    }))

    const { data, error } = await supabase
      .from('guilds')
      .upsert(guilds, {
        onConflict: 'guild_id',
      })
      .select()

    if (data)
      guilds.forEach(async (guild) => {
        try {
          await insertGuildPlugin(guild.guild_id)
        } catch (error) {
          console.error('❌ ERROR: insertAllGuilds(): ', error)
        }
      })

    if (error) {
      throw error
    }

    console.log(`🪯  Initial ${data.length} guilds inserted/updated`)
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
    }

    const { data, error } = await supabase.from('guilds').upsert(_guild)

    if (error) throw error

    // Set the guild plugins to the default values
    await insertGuildPlugin(guild.id)

    return data
  } catch (error) {
    console.error('❌ ERROR: insetOneGuild: ', error)
  }
}

/**
 * Removes a guild
 * @param guild Guild Object from discord.js
 */
export const removeOneGuild = async (guild: Guild) => {
  try {
    const { data, error } = await supabase.from('guilds').delete().eq('guild_id', guild.id).single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('❌ ERROR: insetOneGuild: ', error)
  }
}

// Allows to get guild user's settings directly from the client.
Hans.guildSettings = async (guildId: string) => await findOneGuild(guildId)
Hans.guildPluginSettings = async (guildId: string, plugin_name: string) =>
  await resolveGuildPlugins(guildId, plugin_name)
