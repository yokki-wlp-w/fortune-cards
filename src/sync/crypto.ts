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

/** 入力ゆれ（前後の空白、全角・半角の違いなど）で不一致にならないよう、保存前にそろえる */
export const normalizePassphrase = (raw: string): string => raw.normalize('NFKC').trim()

/**
 * パスフレーズの照合コード（4文字）。2台の端末で同じ言葉が保存されているかを、
 * 言葉そのものを見せずに見比べるためのもの。
 */
export async function passphraseCode(passphrase: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`fortune-cards:${passphrase}`))
  return [...new Uint8Array(hash).subarray(0, 2)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
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
    super(
      '同期ファイルを開けませんでした。この端末のパスフレーズが、同期ファイルを暗号化したときの言葉と違います。下の「パスフレーズ」欄の照合コードを、もう一方の端末と見比べてください。直らないときは「うまく同期できないとき」から同期ファイルを作り直せます。（端末内のデータと同期ファイルは変更していません）',
    )
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
