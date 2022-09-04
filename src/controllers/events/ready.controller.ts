import { mongoClient } from '../../lib/mongodb-driver'
import { getFromCache, setToCache } from '../../lib/node-cache'
import { BotI } from '../../types'
import { insertConfiguration } from '../admin/hans-config.controller'

// Creates a function that queries mongodb for the bot configuration, if founded, adds it to the cache
export const getBotConfiguration = async (): Promise<BotI> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Checks is the bot configuration is in the cache
      const configuration = getFromCache('config')
      if (configuration) return configuration

      const config = await mongoClient.db('hans').collection('config').findOne({ name: 'Hans' })

      if (config) {
        setToCache('config', config)
        resolve(config as unknown as BotI)
      } else {
        await insertConfiguration()
      }
    } catch (error) {
      reject(error)
    }
  })
}
