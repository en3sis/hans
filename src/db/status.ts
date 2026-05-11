#!/usr/bin/env node
/**
 * Show which migrations are applied vs pending on the target DB.
 *
 * Works against any DB — set DATABASE_URL to point wherever:
 *   yarn db:status                                          # uses .env
 *   DATABASE_URL=postgres://prod... yarn db:status          # explicit
 */
import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'

dotenv.config({ path: path.join(process.cwd(), '.env') })

const resolveMigrationsFolder = (): string => {
  const candidates = [
    path.join(process.cwd(), 'drizzle'),
    path.join(__dirname, '..', '..', 'drizzle'),
  ]
  const found = candidates.find((p) => fs.existsSync(p))
  if (!found) throw new Error('drizzle/ folder not found')
  return found
}

const main = async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

  const url = process.env.DATABASE_URL
  // Mask password for display.
  const display = url.replace(/(:)[^:@/]+(@)/, '$1***$2')
  console.log(`🎯 Target: ${display}\n`)

  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5000 })

  // Local migrations
  const dir = resolveMigrationsFolder()
  const localFiles = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  // Applied migrations (Drizzle stores in drizzle.__drizzle_migrations)
  let applied: Array<{ hash: string; created_at: number }> = []
  try {
    const { rows } = await pool.query<{ hash: string; created_at: string }>(
      'SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id ASC',
    )
    applied = rows.map((r) => ({ hash: r.hash, created_at: Number(r.created_at) }))
  } catch (err) {
    const msg = (err as Error).message
    if (msg.includes('does not exist')) {
      console.log('⚠️  No __drizzle_migrations table — DB has never been migrated.')
    } else {
      throw err
    }
  } finally {
    await pool.end()
  }

  console.log(`📂 Local files:        ${localFiles.length}`)
  console.log(`✅ Applied on target:  ${applied.length}`)

  const pending = localFiles.length - applied.length
  if (pending > 0) {
    console.log(`\n⏳ Pending (${pending}):`)
    for (const f of localFiles.slice(applied.length)) console.log(`   • ${f}`)
    console.log('\nApply with: yarn db:migrate (local) or yarn db:migrate:remote (host)')
  } else if (pending < 0) {
    console.log(`\n❗ Target is AHEAD by ${-pending} — your local /drizzle is missing files.`)
  } else {
    console.log('\n✨ Up to date.')
  }
}

main().catch((err) => {
  console.error('❌ db:status failed:', err.message ?? err)
  process.exit(1)
})
