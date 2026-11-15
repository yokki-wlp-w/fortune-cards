// 同期ファイルの暗号化（ブラウザ標準の Web Crypto。外部には何も送らない）。
// パスフレーズから PBKDF2 で鍵を作り、AES-GCM で暗号化する。

const ITERATIONS = 310_000
export const ENCRYPTED_FORMAT = 'fortune-cards-encrypted'

interface Envelope {
  format: typeof ENCRYPTED_FORMAT
  v: 1
  salt: string
  iv: string
  data: string
}

const toB64 = (bytes: Uint8Array): string => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
const fromB64 = (b64: string): Uint8Array<ArrayBuffer> => {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptText(plain: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain))
  const env: Envelope = { format: ENCRYPTED_FORMAT, v: 1, salt: toB64(salt), iv: toB64(iv), data: toB64(new Uint8Array(data)) }
  return JSON.stringify(env)
}

export function isEncrypted(parsed: unknown): parsed is Envelope {
  return typeof parsed === 'object' && parsed !== null && (parsed as Envelope).format === ENCRYPTED_FORMAT
}

export class WrongPassphraseError extends Error {
  constructor() {
    super('パスフレーズが違うか、ファイルが壊れています')
  }
}

export async function decryptEnvelope(env: Envelope, passphrase: string): Promise<string> {
  try {
    const key = await deriveKey(passphrase, fromB64(env.salt))
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(env.iv) }, key, fromB64(env.data))
    return new TextDecoder().decode(plain)
  } catch {
    throw new WrongPassphraseError()
  }
}
