import { defineConfig } from 'drizzle-kit'
import * as dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://hans:password@localhost:5432/hans_db',
  },
  verbose: true,
  strict: true,
})
