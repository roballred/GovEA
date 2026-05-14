import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type PostgresClient = ReturnType<typeof postgres>

declare global {
  var __goveaPostgresClient: PostgresClient | undefined
}

const maxConnections = Number.parseInt(process.env.DATABASE_POOL_MAX ?? '5', 10)

const client = globalThis.__goveaPostgresClient ?? postgres(process.env.DATABASE_URL!, {
  max: Number.isFinite(maxConnections) ? maxConnections : 5,
})

globalThis.__goveaPostgresClient = client

export const db = drizzle(client, { schema })
