/**
 * Applies the canonical Postgres triggers from `src/db/sql/*.sql` to the
 * database referenced by `DATABASE_URL`.
 *
 * Run after every `db:push` so the triggers are re-installed on a freshly
 * pushed schema. Idempotent: each SQL file uses CREATE OR REPLACE / DROP IF
 * EXISTS so it can run any number of times.
 *
 * Local: `pnpm --filter govea db:apply-triggers`
 * CI:    `pnpm --filter govea db:apply-triggers:container`
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import postgres from 'postgres'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('apply-triggers: DATABASE_URL is not set')
    process.exit(1)
  }

  const sqlDir = resolve(process.cwd(), 'src/db/sql')
  const files = readdirSync(sqlDir).filter(f => f.endsWith('.sql')).sort()
  if (files.length === 0) {
    console.log('apply-triggers: no SQL files in', sqlDir)
    return
  }

  const sql = postgres(url, { onnotice: () => {} })
  try {
    for (const f of files) {
      const text = readFileSync(resolve(sqlDir, f), 'utf8')
      await sql.unsafe(text)
      console.log(`apply-triggers: applied ${f}`)
    }
  } finally {
    await sql.end()
  }
}

main().catch(err => {
  console.error('apply-triggers: failed', err)
  process.exit(1)
})
