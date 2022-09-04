import { ClientEvents } from 'discord.js'
import { mongoClient } from '../../lib/mongodb-driver'
import { GuildI } from '../../models/guild.model'
import { findOneGuild } from '../mongodb/mongo-guilds.controller'

/**
 * If id is passed, returns the guild with the id. If id is not passed, returns all guilds
 * @param id guild id
 * @returns GuildI | GuildI[]
 */
export const getGuildsSettings = async (id: string): Promise<GuildI> => {
  try {
    if (id) {
      const guild = await findOneGuild(id)

      return guild as GuildI
    }

    const guilds = await mongoClient
      .db(process.env.MONGODB_DATABASE)
      .collection('guilds')
      .find({})
      .toArray()

    if (guilds) {
      return guilds as unknown as GuildI
    } else {
      return [] as unknown as GuildI
    }
  } catch (error) {
    return error.message
  }
}

/**
 * Resolves if a guild has the events enabled and if a specific event is enabled
 * @param id guild id
 * @param event extends ClientEvents
 * @returns boolean
 */
export const resolveGuildEvents = async (id: string, event: keyof ClientEvents) => {
  try {
    const document = await getGuildsSettings(id)

    if (document) {
      return {
        enabled: document.guildEventsNotifications[event] || false,
        ...document,
      }
    }

  } catch (error) {
    console.error('❌ ERROR: resolveGuildEvents(): ', error)
  }
}
