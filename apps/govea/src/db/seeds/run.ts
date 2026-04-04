// Entry point for seeding. Run via: pnpm db:seed
// Set DEV=true to also load dev fixtures.

import { GOV_TAXONOMY } from './gov-taxonomy'

async function seed() {
  console.log('Seeding government taxonomy...')
  // Taxonomy insertion logic goes here once db client is wired in
  console.log(`Loaded ${GOV_TAXONOMY.length} top-level domains`)

  if (process.env.DEV === 'true') {
    console.log('Loading dev fixtures...')
    // Dev fixture insertion goes here
  }

  console.log('Seed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
