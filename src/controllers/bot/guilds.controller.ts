import { and, eq, isNull, notInArray, sql } from 'drizzle-orm'
import { Client, Guild as DiscordGuild } from 'discord.js'
import { db } from '../../db/client'
import { Guild as GuildRow, GuildPluginRow, guilds } from '../../db/schema'
import { Hans } from './../../index'
import { insertGuildPlugin, resolveGuildPlugins } from './plugins.controller'
import { log } from '../../utils/log'

export type GuildSettings = GuildRow
export type GuildPlugin = GuildPluginRow

export const findOneGuild = async (guildId: string): Promise<GuildSettings | undefined> => {
  try {
    return await db.query.guilds.findFirst({ where: eq(guilds.guild_id, guildId) })
  } catch (error) {
    log.error('❌ ERROR: findOneGuild(): ', error)
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
          set: { name: g.name, avatar: g.avatar, left_at: null },
        })
    }

    if (rows.length > 0) {
      const marked = await db
        .update(guilds)
        .set({ left_at: sql`now()` })
        .where(
          and(
            isNull(guilds.left_at),
            notInArray(
              guilds.guild_id,
              rows.map((g) => g.guild_id),
            ),
          ),
        )
        .returning({ guild_id: guilds.guild_id })
      if (marked.length > 0) log.info(`🚪 Marked ${marked.length} guild(s) as left`)
    }

    for (const g of rows) {
      try {
        await insertGuildPlugin(g.guild_id)
      } catch (error) {
        log.error('❌ ERROR: insertAllGuilds(): ', error)
      }
    }

    log.info(`🪯  Initial ${rows.length} guilds inserted/updated`)
    return rows
  } catch (error) {
    log.error('❌ ERROR: insertAllGuilds(): ', error)
  }
}

export const insetOneGuild = async (guild: DiscordGuild) => {
  try {
    await db
      .insert(guilds)
      .values({ guild_id: guild.id, name: guild.name, avatar: guild.icon })
      .onConflictDoUpdate({
        target: guilds.guild_id,
        set: { name: guild.name, avatar: guild.icon, left_at: null },
      })
    await insertGuildPlugin(guild.id)
  } catch (error) {
    log.error('❌ ERROR: insetOneGuild: ', error)
  }
}

export const removeOneGuild = async (guild: DiscordGuild) => {
  try {
    await db.delete(guilds).where(eq(guilds.guild_id, guild.id))
  } catch (error) {
    log.error('❌ ERROR: removeOneGuild: ', error)
  }
}

Hans.guildSettings = async (guildId: string) => await findOneGuild(guildId)
Hans.guildPluginSettings = async (guildId: string, plugin_name: string) =>
  await resolveGuildPlugins(guildId, plugin_name)
