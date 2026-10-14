import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateTotpSecret(): string {
  return encodeBase32(randomBytes(20))
}

export function createTotpUri(secret: string, email: string): string {
  return `otpauth://totp/${encodeURIComponent(`Billet:${email}`)}?secret=${secret}&issuer=Billet&algorithm=SHA1&digits=6&period=30`
}

export function verifyTotp(secret: string, token: string, now = Date.now()): boolean {
  if (!/^\d{6}$/.test(token)) return false
  return [-1, 0, 1].some((offset) => {
    const expected = totp(secret, Math.floor(now / 30_000) + offset)
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  })
}

function totp(secret: string, counter: number): string {
  const value = Buffer.alloc(8)
  value.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', decodeBase32(secret)).update(value).digest()
  const offset = digest[digest.length - 1] & 15
  const binary =
    ((digest[offset] & 127) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3]
  return (binary % 1_000_000).toString().padStart(6, '0')
}

function encodeBase32(value: Buffer): string {
  let bits = ''
  for (const byte of value) bits += byte.toString(2).padStart(8, '0')
  return (
    bits
      .match(/.{1,5}/g)
      ?.map((chunk) => ALPHABET[Number.parseInt(chunk.padEnd(5, '0'), 2)])
      .join('') ?? ''
  )
}

function decodeBase32(value: string): Buffer {
  const bits = [...value.replace(/=+$/g, '').toUpperCase()]
    .map((character) => ALPHABET.indexOf(character).toString(2).padStart(5, '0'))
    .join('')
  return Buffer.from(bits.match(/.{8}/g)?.map((byte) => Number.parseInt(byte, 2)) ?? [])
}
