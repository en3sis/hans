import { MongoClient } from 'mongodb'

export const mongoClient = new MongoClient(process.env.MONGODB_CONNECTION!, {
  keepAlive: true,
})
