import { eq } from 'drizzle-orm'
import { Client, Guild as DiscordGuild } from 'discord.js'
import { db } from '../../db/client'
import { Guild as GuildRow, GuildPluginRow, guilds } from '../../db/schema'
import { Hans } from './../../index'
import { insertGuildPlugin, resolveGuildPlugins } from './plugins.controller'

export type GuildSettings = GuildRow
export type GuildPlugin = GuildPluginRow

export const findOneGuild = async (guildId: string): Promise<GuildSettings | undefined> => {
  try {
    return await db.query.guilds.findFirst({ where: eq(guilds.guild_id, guildId) })
  } catch (error) {
    console.error('❌ ERROR: findOneGuild(): ', error)
  }
}

export const insertAllGuilds = async (Hans: Client) => {
  try {
    const rows = Hans.guilds.cache.map((guild) => ({
      guild_id: guild.id,
      name: guild.name,
      avatar: guild.icon,
    }))

    for (const g of rows) {
      await db
        .insert(guilds)
        .values(g)
        .onConflictDoUpdate({
          target: guilds.guild_id,
          set: { name: g.name, avatar: g.avatar },
        })
    }

    for (const g of rows) {
      try {
        await insertGuildPlugin(g.guild_id)
      } catch (error) {
        console.error('❌ ERROR: insertAllGuilds(): ', error)
      }
    }

    console.info(`🪯  Initial ${rows.length} guilds inserted/updated`)
    return rows
  } catch (error) {
    console.error('❌ ERROR: insertAllGuilds(): ', error)
  }
}

export const insetOneGuild = async (guild: DiscordGuild) => {
  try {
    await db
      .insert(guilds)
      .values({ guild_id: guild.id, name: guild.name, avatar: guild.icon })
      .onConflictDoUpdate({
        target: guilds.guild_id,
        set: { name: guild.name, avatar: guild.icon },
      })
    await insertGuildPlugin(guild.id)
  } catch (error) {
    console.error('❌ ERROR: insetOneGuild: ', error)
  }
}

export const removeOneGuild = async (guild: DiscordGuild) => {
  try {
    await db.delete(guilds).where(eq(guilds.guild_id, guild.id))
  } catch (error) {
    console.error('❌ ERROR: removeOneGuild: ', error)
  }
}

Hans.guildSettings = async (guildId: string) => await findOneGuild(guildId)
Hans.guildPluginSettings = async (guildId: string, plugin_name: string) =>
  await resolveGuildPlugins(guildId, plugin_name)
