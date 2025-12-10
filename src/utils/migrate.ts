import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import path from 'path'
import { fileURLToPath } from 'url'
import postgres from 'postgres'

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const runMigrations = async () => {
  const connectionString =
    process.env.DATABASE_URL || 'postgresql://hans:password@localhost:5432/hans_db'

  console.log('🔄 Running database migrations...')

  const migrationClient = postgres(connectionString, {
    max: 1,
    onnotice: () => {}, // Silence PostgreSQL NOTICE messages
  })
  const db = drizzle(migrationClient)

  try {
    await migrate(db, {
      migrationsFolder: path.join(__dirname, '../db/migrations'),
    })
    console.log('✅ Migrations completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await migrationClient.end()
  }
}

runMigrations()
