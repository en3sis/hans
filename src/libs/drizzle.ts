import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'

const connectionString =
  process.env.DATABASE_URL || 'postgresql://hans:password@localhost:5432/hans_db'

const queryClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(queryClient, { schema })

export const closeDatabase = async () => {
  await queryClient.end()
}
