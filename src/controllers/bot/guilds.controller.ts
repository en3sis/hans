import { ClientEvents } from 'discord.js'
import { mongoClient } from '../../lib/mongodb-driver'
import { GuildI } from '../../models/guild.model'

/**
 * If id is passed, returns the guild with the id. If id is not passed, returns all guilds
 * @param id guild id
 * @returns GuildI | GuildI[]
 */
export const getGuildsSettings = async (id: string): Promise<GuildI> => {
  try {
    if (id) {
      const guild = await mongoClient.db('dev').collection('guilds').findOne({ _id: id })
      return guild as GuildI
    }
    const guilds = await mongoClient.db('dev').collection('guilds').find({}).toArray()

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
    return {
      enabled: document.guildEventsNotifications[event],
      ...document,
    }
  } catch (error) {
    console.log('ERROR: resolveGuildEvents(): ', error)
  }
}
