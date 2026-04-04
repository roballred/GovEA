// Pre-defined test users for role switching in Playwright tests.
// Matches dev-fixtures.ts so tests can restore to a known state.

export const TEST_USERS = {
  admin: { email: 'alice@govea.dev', password: 'dev-password', role: 'admin' as const },
  contributor: { email: 'carol@govea.dev', password: 'dev-password', role: 'contributor' as const },
  viewer: { email: 'victor@govea.dev', password: 'dev-password', role: 'viewer' as const },
}
