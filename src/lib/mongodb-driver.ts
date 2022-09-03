import * as dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), `.env`) })

export const mongoClient = new MongoClient(process.env.MONGODB_CONNECTION!, {
  keepAlive: true,
})
