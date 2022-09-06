import { Client, Guild } from 'discord.js'
import { ObjectId } from 'mongodb'
import { mongoClient } from '../../lib/mongodb-driver'
import { getFromCache, setToCache } from '../../lib/node-cache'
import documentDetails, { GuildDocI, GuildI } from '../../models/guild.model'
import { CACHE_TTL_GUILDS } from '../../utils/constants'

/**
 * Fetches guild in the DB, if found, sets it as a cache for CACHE_TTL_GUILDS and returns it.
 * @param guildId string with the Guild ID
 * @returns guild document
 */
export const findOneGuild = async (
  guildId: string
): Promise<GuildI | { status: number; message: string }> => {
  try {
    const guild = getFromCache(guildId)

    if (guild !== null) {
      return guild
    } else {
      const document = await mongoClient
        .db(process.env.MONGODB_DATABASE || 'dev')
        .collection('guilds')
        .findOne({
          _id: guildId,
        })

      if (document) {
        setToCache(guildId, document, CACHE_TTL_GUILDS)

        return document as unknown as GuildI
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
    const guilds: GuildI[] = await Promise.all(
      Hans.guilds.cache.map((guild) => ({
        _id: guild.id as unknown as ObjectId,
        name: guild.name,
        avatar: guild.iconURL({ dynamic: true }),
        date: new Date(),
        premium: false,
        ...documentDetails,
      }))
    )

    return await mongoClient
      .db(process.env.MONGODB_DATABASE! || 'dev')
      .collection('guilds')
      .insertMany(guilds)
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
    const guildData: GuildI = {
      _id: guild.id as unknown as ObjectId,
      name: guild.name,
      date: new Date(),
      premium: false,
      avatar: guild.iconURL({ dynamic: true }),
      ...documentDetails,
    }

    await mongoClient
      .db(process.env.MONGODB_DATABASE! || 'dev')
      .collection('guilds')
      .updateOne({ _id: guild.id }, { $set: guildData }, { upsert: true })
  } catch (error) {
    console.error('❌ ERROR: insetOneGuild: ', error)
  }
}

/**
 * Update a new guild into the database
 * @param guild Guild Object from discord.js
 */
export const updateOneGuild = async (guild: Guild, update: Partial<GuildDocI>) => {
  try {
    await mongoClient
      .db(process.env.MONGODB_DATABASE! || 'dev')
      .collection('guilds')
      .updateOne({ _id: guild.id }, { $set: update })
  } catch (error) {
    console.error('❌ ERROR: updateOneGuild', error)
  }
}
