import * as dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env') })

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://hans:devpass@localhost:5432/hans_db',
  },
  strict: true,
  verbose: true,
})
