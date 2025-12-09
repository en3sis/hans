import { Client, Guild } from 'discord.js'
import { eq } from 'drizzle-orm'
import { db } from '../../libs/drizzle'
import { guilds } from '../../db/schema'
import { Hans } from './../../index'
import { insertGuildPlugin, resolveGuildPlugins } from './plugins.controller'

export type GuildSettings = typeof guilds.$inferSelect
export type GuildPlugin = typeof guilds.$inferSelect

/** Fetches guild in the DB, if found, sets it as a cache for CACHE_TTL and returns it.
 * @param guildId string with the Guild ID
 * @returns guild document
 */
export const findOneGuild = async (guildId: string) => {
  try {
    const result = await db.select().from(guilds).where(eq(guilds.guildId, guildId)).limit(1)

    return result[0] ?? null
  } catch (error) {
    console.error('❌ ERROR: findOneGuild(): ', error)
  }
}

/** Fetches the guilds Hans is part of and inserts them into the database.
 * @param Hans - The client instance
 */
export const insertAllGuilds = async (Hans: Client) => {
  try {
    const guildsList = Hans.guilds.cache.map((guild) => ({
      name: guild.name,
      avatar: guild.icon,
      createdAt: new Date().toISOString(),
      guildId: guild.id,
    }))

    const insertedGuilds: GuildSettings[] = []

    for (const guild of guildsList) {
      const result = await db
        .insert(guilds)
        .values(guild)
        .onConflictDoUpdate({
          target: guilds.guildId,
          set: {
            name: guild.name,
            avatar: guild.avatar,
          },
        })
        .returning()

      if (result[0]) {
        insertedGuilds.push(result[0])
        try {
          await insertGuildPlugin(guild.guildId)
        } catch (error) {
          console.error('❌ ERROR: insertAllGuilds(): ', error)
        }
      }
    }

    console.info(`🪯  Initial ${insertedGuilds.length} guilds inserted/updated`)

    return insertedGuilds
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
    const guildData = {
      avatar: guild.icon,
      createdAt: new Date().toISOString(),
      guildId: guild.id,
      name: guild.name,
      premium: false,
    }

    await db.insert(guilds).values(guildData).onConflictDoUpdate({
      target: guilds.guildId,
      set: guildData,
    })

    // Set the guild plugins to the default values
    await insertGuildPlugin(guild.id)

    return guildData
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
    const result = await db.delete(guilds).where(eq(guilds.guildId, guild.id)).returning()

    return result[0] ?? null
  } catch (error) {
    console.error('❌ ERROR: insetOneGuild: ', error)
  }
}

// Allows to get guild user's settings directly from the client.
Hans.guildSettings = async (guildId: string) => await findOneGuild(guildId)
Hans.guildPluginSettings = async (guildId: string, plugin_name: string) =>
  await resolveGuildPlugins(guildId, plugin_name)
