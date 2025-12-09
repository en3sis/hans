import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import path from 'path'

const runMigrations = async () => {
  const connectionString =
    process.env.DATABASE_URL || 'postgresql://hans:password@localhost:5432/hans_db'

  console.log('🔄 Running database migrations...')

  const migrationClient = postgres(connectionString, {
    max: 1,
    onnotice: false, // Silence PostgreSQL NOTICE messages
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
