/**
 * Unit tests: Data Vault naming helpers (#570)
 *
 * The slug / suggestion / prefix-match helpers used by the soft Data Vault
 * naming hints in the Data Architecture forms. UI behavior is exercised by
 * inspection; this suite pins the slug and suggestion outputs.
 */
import { describe, it, expect } from 'vitest'
import {
  slugifyForDataVault,
  suggestDataVaultName,
  matchesDataVaultPrefix,
} from '@/lib/data-vault-naming'

describe('slugifyForDataVault', () => {
  it('lowercases', () => {
    expect(slugifyForDataVault('Customer')).toBe('customer')
  })

  it('joins spaced words with underscore', () => {
    expect(slugifyForDataVault('Customer Order')).toBe('customer_order')
  })

  it('replaces multiple non-alphanumeric runs with a single underscore', () => {
    expect(slugifyForDataVault('Customer  --  Order!')).toBe('customer_order')
  })

  it('trims leading and trailing underscores', () => {
    expect(slugifyForDataVault('  Order ')).toBe('order')
    expect(slugifyForDataVault('--Order--')).toBe('order')
  })

  it('returns empty string for empty / whitespace-only input', () => {
    expect(slugifyForDataVault('')).toBe('')
    expect(slugifyForDataVault('   ')).toBe('')
  })

  it('preserves digits', () => {
    expect(slugifyForDataVault('FY2026 Plan')).toBe('fy2026_plan')
  })

  it('strips punctuation that occurs inside words', () => {
    expect(slugifyForDataVault("Driver's Licence")).toBe('driver_s_licence')
  })
})

describe('suggestDataVaultName', () => {
  it('produces the seed convention for Hub', () => {
    expect(suggestDataVaultName('h', 'Customer')).toBe('h_customer')
    expect(suggestDataVaultName('h', 'Order')).toBe('h_order')
    expect(suggestDataVaultName('h', 'Product')).toBe('h_product')
  })

  it('produces the seed convention for Satellite', () => {
    expect(suggestDataVaultName('s', 'Customer Profile')).toBe('s_customer_profile')
    expect(suggestDataVaultName('s', 'Order Status')).toBe('s_order_status')
  })

  it('produces the seed convention for Link', () => {
    expect(suggestDataVaultName('l', 'Customer Order')).toBe('l_customer_order')
  })

  it('returns empty string when there is nothing to slugify', () => {
    expect(suggestDataVaultName('h', '')).toBe('')
    expect(suggestDataVaultName('h', '   ')).toBe('')
    expect(suggestDataVaultName('h', '!!!')).toBe('')
  })
})

describe('matchesDataVaultPrefix', () => {
  it('matches values starting with the prefix and underscore', () => {
    expect(matchesDataVaultPrefix('h', 'h_customer')).toBe(true)
    expect(matchesDataVaultPrefix('s', 's_customer_profile')).toBe(true)
    expect(matchesDataVaultPrefix('l', 'l_customer_order')).toBe(true)
  })

  it('rejects values with the wrong prefix', () => {
    expect(matchesDataVaultPrefix('h', 's_customer')).toBe(false)
    expect(matchesDataVaultPrefix('s', 'h_customer')).toBe(false)
  })

  it('rejects values missing the prefix', () => {
    expect(matchesDataVaultPrefix('h', 'customer')).toBe(false)
    expect(matchesDataVaultPrefix('h', 'hub_customer')).toBe(false)
    expect(matchesDataVaultPrefix('h', 'h-customer')).toBe(false)
  })

  it('rejects empty / whitespace input', () => {
    expect(matchesDataVaultPrefix('h', '')).toBe(false)
    expect(matchesDataVaultPrefix('h', 'h_')).toBe(false)
  })

  it('rejects uppercase / mixed case (the slug is always lower)', () => {
    expect(matchesDataVaultPrefix('h', 'h_Customer')).toBe(false)
    expect(matchesDataVaultPrefix('h', 'H_customer')).toBe(false)
  })
})
