import crypto from 'node:crypto'

/**
 * AES-256-GCM encryption for SMTP credentials at rest (#528,
 * capability rule "SMTP credentials are stored encrypted").
 *
 * Key derivation: `EMAIL_CRED_KEY` env var if set, otherwise derived from
 * `AUTH_SECRET` via HKDF. This means a working dev environment with
 * AUTH_SECRET present already has a stable encryption key without further
 * setup. Production deployments should set EMAIL_CRED_KEY explicitly to a
 * 32-byte random base64 string and rotate it independently of AUTH_SECRET.
 *
 * Ciphertext format: base64(iv || authTag || ciphertext). The 12-byte IV
 * and 16-byte authentication tag are prepended to the ciphertext so a
 * single column stores the complete sealed envelope.
 */

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const TAG_BYTES = 16

function getKey(): Buffer {
  const explicit = process.env.EMAIL_CRED_KEY
  if (explicit) {
    const buf = Buffer.from(explicit, 'base64')
    if (buf.length !== 32) {
      throw new Error('EMAIL_CRED_KEY must be a 32-byte base64-encoded value')
    }
    return buf
  }
  const authSecret = process.env.AUTH_SECRET
  if (!authSecret) {
    throw new Error(
      'Neither EMAIL_CRED_KEY nor AUTH_SECRET is set — cannot derive an email-credential encryption key.'
    )
  }
  // HKDF with the salt "govea-email-cred-v1" so a future key-derivation
  // change can coexist with v1 ciphertext by changing the salt.
  return Buffer.from(
    crypto.hkdfSync('sha256', Buffer.from(authSecret, 'utf8'), Buffer.from('govea-email-cred-v1'), Buffer.alloc(0), 32)
  )
}

export function encryptCredential(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

export function decryptCredential(sealed: string): string {
  const key = getKey()
  const buf = Buffer.from(sealed, 'base64')
  if (buf.length < IV_BYTES + TAG_BYTES + 1) {
    throw new Error('Sealed credential is too short to be valid ciphertext')
  }
  const iv = buf.subarray(0, IV_BYTES)
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const ct = buf.subarray(IV_BYTES + TAG_BYTES)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}

/**
 * Plain placeholder returned to the UI when a password is set. Used so
 * forms can show "credentials are saved" without disclosing the encrypted
 * blob or its length.
 */
export const PASSWORD_PLACEHOLDER = '••••••••'
