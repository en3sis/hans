import { Buffer } from 'node:buffer'
import { mongoClient } from '../../lib/mongodb-driver'
import { getFromCache, setToCache } from '../../lib/node-cache'

type TMongoCRUD = {
  dataBase: string
  collection: string
  query: unknown
  data?: unknown
  cache?: boolean
  ttl?: number
}

export const findOne = async ({ dataBase, collection, query, cache, ttl }: TMongoCRUD) => {
  try {
    const b = Buffer.from(JSON.stringify({ find: true })).toString('base64')
    if (cache) {
      const cached = getFromCache(JSON.stringify(b))

      if (cached !== null) {
        return cached
      }
    } else {
      const document = await mongoClient.db(dataBase).collection(collection).findOne(query)

      setToCache(b, document, ttl)
      return document
    }
  } catch (error) {
    console.error('❌ ERROR: findOne(): ', error)
  }
}

export const find = async ({ dataBase, collection, query, cache, ttl }: TMongoCRUD) => {
  try {
    const b = Buffer.from(JSON.stringify({ find: true })).toString('base64')
    if (cache) {
      const cached = getFromCache(JSON.stringify(b))

      if (cached !== null) {
        return cached
      } else {
        const document = await mongoClient.db(dataBase).collection(collection).find(query).toArray()

        setToCache(b, document, ttl)
      }
    } else {
      const document = await mongoClient.db(dataBase).collection(collection).find(query).toArray()

      return document
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
