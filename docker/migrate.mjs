import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

const sql = postgres(process.env.DATABASE_URL, { max: 1 })
const db = drizzle(sql)

await migrate(db, { migrationsFolder })
await sql.end()

console.log('    Migrations complete.')
