import { defineConfig } from 'drizzle-kit'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // The `govcore` Postgres schema (platform tables, re-exported from
  // @govcore/schema) is owned by `govcore-migrate` (see db:platform-migrate),
  // NOT drizzle-kit. Restrict `db:push` to the `public` schema so it manages
  // only GovEA's domain tables and never touches the core platform tables. (#900)
  schemaFilter: ['public'],
})
