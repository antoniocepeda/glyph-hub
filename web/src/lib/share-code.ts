import { deflate, inflate } from 'pako'
import { PromptSchema, canonicalizePrompt, type PromptInput } from './validators'
import CRC32 from 'crc-32'

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const BASE64_LOOKUP = (() => {
  const table = new Uint8Array(128).fill(255)
  for (let i = 0; i < BASE64_ALPHABET.length; i++) {
    table[BASE64_ALPHABET.charCodeAt(i)] = i
  }
  return table
})()

function encodeBase64(u8: Uint8Array): string {
  let output = ''
  let i = 0
  for (; i + 2 < u8.length; i += 3) {
    const a = u8[i]
    const b = u8[i + 1]
    const c = u8[i + 2]
    output += BASE64_ALPHABET[a >> 2]
    output += BASE64_ALPHABET[((a & 0x03) << 4) | (b >> 4)]
    output += BASE64_ALPHABET[((b & 0x0f) << 2) | (c >> 6)]
    output += BASE64_ALPHABET[c & 0x3f]
  }
  const remaining = u8.length - i
  if (remaining === 1) {
    const a = u8[i]
    output += BASE64_ALPHABET[a >> 2]
    output += BASE64_ALPHABET[(a & 0x03) << 4]
    output += '=='
  } else if (remaining === 2) {
    const a = u8[i]
    const b = u8[i + 1]
    output += BASE64_ALPHABET[a >> 2]
    output += BASE64_ALPHABET[((a & 0x03) << 4) | (b >> 4)]
    output += BASE64_ALPHABET[(b & 0x0f) << 2]
    output += '='
  }
  return output
}

function decodeBase64(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '')
  if (clean.length % 4 !== 0) {
    throw new Error('Invalid base64 string')
  }
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0
  const byteLength = (clean.length / 4) * 3 - padding
  const out = new Uint8Array(byteLength)
  let outIndex = 0
  for (let i = 0; i < clean.length; i += 4) {
    const a = clean.charCodeAt(i)
    const b = clean.charCodeAt(i + 1)
    const c = clean.charCodeAt(i + 2)
    const d = clean.charCodeAt(i + 3)
    const v1 = BASE64_LOOKUP[a]
    const v2 = BASE64_LOOKUP[b]
    const v3 = c === 61 ? 0 : BASE64_LOOKUP[c] // '=' => 61
    const v4 = d === 61 ? 0 : BASE64_LOOKUP[d]
    if (v1 === 255 || v2 === 255 || (c !== 61 && v3 === 255) || (d !== 61 && v4 === 255)) {
      throw new Error('Invalid base64 character encountered')
    }
    const chunk = (v1 << 18) | (v2 << 12) | (v3 << 6) | v4
    out[outIndex++] = (chunk >> 16) & 0xff
    if (c !== 61) out[outIndex++] = (chunk >> 8) & 0xff
    if (d !== 61) out[outIndex++] = chunk & 0xff
  }
  return out
}

const base64url = {
  encode: (u8: Uint8Array) =>
    encodeBase64(u8)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, ''),
  decode: (s: string) => {
    const base64 = s.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    return decodeBase64(padded)
  },
}

function crc32(u8: Uint8Array): string {
  return (CRC32.buf(u8) >>> 0).toString(16).padStart(8, '0')
}

export function encodeShareCode(prompt: PromptInput): string {
  const canonical = canonicalizePrompt(PromptSchema.parse(prompt))
  const json = JSON.stringify(canonical)
  const deflated = deflate(new TextEncoder().encode(json))
  const payload = base64url.encode(deflated)
  const crc = crc32(deflated)
  return `PB1.${payload}.${crc}`
}

export function decodeShareCode(code: string): PromptInput {
  const [prefix, payload, crc] = code.split('.')
  if (prefix !== 'PB1') throw new Error('Unsupported version')
  if (!payload || !crc) throw new Error('Malformed code')
  const bytes = base64url.decode(payload)
  if (crc32(bytes) !== crc) throw new Error('CRC mismatch')
  const json = new TextDecoder().decode(inflate(bytes))
  return PromptSchema.parse(JSON.parse(json))
}

