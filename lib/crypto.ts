import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO     = 'aes-256-gcm'
const KEY_LEN  = 32
const NONCE_LEN = 12

let _keyCache: Buffer | undefined

function getKey(): Buffer {
  if (_keyCache) return _keyCache
  const hex = process.env.ENCRYPTION_KEY
  if (!hex) throw new Error('ENCRYPTION_KEY env var is required (32-byte hex; openssl rand -hex 32)')
  const buf = Buffer.from(hex, 'hex')
  if (buf.length !== KEY_LEN) throw new Error(`ENCRYPTION_KEY must decode to ${KEY_LEN} bytes, got ${buf.length}`)
  _keyCache = buf
  return buf
}

export function encrypt(plaintext: string): string {
  const key   = getKey()
  const nonce = randomBytes(NONCE_LEN)
  const cipher = createCipheriv(ALGO, key, nonce)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag    = cipher.getAuthTag()
  return Buffer.concat([nonce, authTag, ciphertext]).toString('base64')
}

export function decrypt(payload: string): string {
  const key  = getKey()
  const buf  = Buffer.from(payload, 'base64')
  if (buf.length < NONCE_LEN + 16) throw new Error('Ciphertext too short')
  const nonce      = buf.subarray(0, NONCE_LEN)
  const authTag    = buf.subarray(NONCE_LEN, NONCE_LEN + 16)
  const ciphertext = buf.subarray(NONCE_LEN + 16)
  const decipher = createDecipheriv(ALGO, key, nonce)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}
