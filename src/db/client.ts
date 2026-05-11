import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Expected something like postgres://user:pass@host:5432/db',
  )
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PGPOOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

pool.on('error', (err) => {
  console.error('❌ Unexpected idle pg client error:', err)
})

export const db: NodePgDatabase<typeof schema> = drizzle(pool, {
  schema,
  casing: 'snake_case',
})

export { schema }
