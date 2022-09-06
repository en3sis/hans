import { ClientEvents } from 'discord.js'
import { GuildI } from '../../models/guild.model'
import { findOneGuild } from '../mongodb/mongo-guilds.controller'
import { Hans } from './../../index'

/**
 * If id is passed, returns the guild with the id. If id is not passed, returns all guilds
 * @param id guild id
 * @returns GuildI | GuildI[]
 */
export const getGuildsSettings = async (id: string): Promise<GuildI> => {
  try {
    const guild = await findOneGuild(id)

    return guild as GuildI
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
    const document = await findOneGuild(id)

    if ('name' in document) {
      return {
        enabled: document.guildEventsNotifications[event] || false,
        ...document,
      }
    }
  } catch (error) {
    console.error('❌ ERROR: resolveGuildEvents(): ', error)
  }
}

// Allows to get guild user's settings directly from the client.
Hans.guildSettings = async (guildId: string) => await findOneGuild(guildId)
