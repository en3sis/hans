import { mongoClient } from '../../lib/mongodb-driver'
import { getFromCache, setToCache } from '../../lib/node-cache'
import { CACHE_TTL } from '../../utils/constants'
import { base64 } from '../../utils/crypto'

type TMongoCRUD = {
  dataBase: string
  collection: string
  query: unknown
  data?: unknown
  cache?: boolean
  ttl?: number
}

export const find = async ({ dataBase, collection, query, cache, ttl = CACHE_TTL }: TMongoCRUD) => {
  try {
    const encoded = base64(query)
    if (cache && query) {
      const cached = getFromCache(encoded)

      if (cached !== null) {
        return cached
      } else {
        const document = await mongoClient.db(dataBase).collection(collection).find(query).toArray()

        if (document.length === 1) {
          // Acts like findOne
          setToCache(encoded, document[0], ttl)
          return document[0]
        } else {
          setToCache(encoded, document, ttl)
          return document
        }
      }
    } else {
      const document = await mongoClient.db(dataBase).collection(collection).find(query).toArray()

      if (document.length === 1) {
        // Acts like findOne
        return document[0]
      } else {
        return document
      }
    }
  } catch (error) {
    console.error('❌ ERROR: findOne(): ', error)
  }
}

export const insertOne = async ({
  dataBase,
  collection,
  data,
}: Pick<TMongoCRUD, 'dataBase' | 'collection' | 'data'>) => {
  try {
    const document = await mongoClient.db(dataBase).collection(collection).insertOne(data)

    return document
  } catch (error) {
    console.error('❌ ERROR: insertOne(): ', error)
  }
}

export const updateOne = async ({
  dataBase,
  collection,
  query,
  data,
}: Exclude<TMongoCRUD, 'cache' | 'ttl'>) => {
  try {
    if (!query || !data) throw new Error('❌ ERROR: updateOne(): query or data is missing')

    const document = await mongoClient
      .db(dataBase)
      .collection(collection)
      .updateOne(query, data, { upsert: true })

    return document
  } catch (error) {
    console.error('❌ ERROR: updateOne(): ', error)
  }
}
