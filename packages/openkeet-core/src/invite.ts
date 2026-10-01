import z32 from 'z32'

export interface ParsedInvite {
  /** 32-byte room topic. */
  topic: Uint8Array
  topicZ32: string
  /** Optional 32-byte private-room encryption key. */
  encryptionKey?: Uint8Array
  raw: string
}

function decodeZ32(s: string, expected = 32): Uint8Array {
  const buf = z32.decode(s)
  if (buf.length !== expected) throw new Error(`expected ${expected} bytes, got ${buf.length}`)
  return buf
}

/**
 * OpenKeet invite format (v0, open + documented):
 *   openkeet://<z32-topic>[.<z32-encryptionKey>]
 * Also accepted: `openkeet:<...>` and bare `<z32>[.<z32>]` for QR density.
 *
 * This is intentionally NOT the proprietary `keet://` byte layout (which is
 * obfuscated/closed). Captured keet links can be translated in
 * `vendor/keet-orig/` during de-obfuscation (see decodeKeetCompat stub).
 */
export function encodeInvite(topic: Uint8Array, encryptionKey?: Uint8Array): string {
  if (topic.length !== 32) throw new Error('topic must be 32 bytes')
  let s = `openkeet://${z32.encode(topic)}`
  if (encryptionKey) {
    if (encryptionKey.length !== 32) throw new Error('encryptionKey must be 32 bytes')
    s += `.${z32.encode(encryptionKey)}`
  }
  return s
}

export function decodeInvite(raw: string): ParsedInvite {
  const input = raw.trim()
  const m =
    /^openkeet:\/\/([a-z0-9]+)(?:\.([a-z0-9]+))?$/i.exec(input) ??
    /^openkeet:([a-z0-9]+)(?:\.([a-z0-9]+))?$/i.exec(input) ??
    /^([a-z0-9]{50,60})(?:\.([a-z0-9]{50,60}))?$/i.exec(input)
  if (!m) throw new Error(`unrecognised invite: ${input.slice(0, 48)}… (expected openkeet://<z32>[.<z32>])`)
  const topicZ32 = m[1].toLowerCase()
  const topic = decodeZ32(topicZ32)
  const encryptionKey = m[2] ? decodeZ32(m[2].toLowerCase()) : undefined
  return { topic, topicZ32, encryptionKey, raw: input }
}

/**
 * Compat shim for captured proprietary Keet links.
 * Phase 1: best-effort — if the payload happens to embed a z32 topic, extract it.
 * Phase 2: replace with real byte-layout decoder once de-obfuscated.
 */
export function decodeKeetCompat(raw: string): ParsedInvite {
  const candidates = raw.toLowerCase().match(/[a-z0-9]{50,60}/g) ?? []
  for (const c of candidates) {
    try {
      const topic = z32.decode(c)
      if (topic.length === 32) {
        return { topic, topicZ32: c, raw }
      }
    } catch {
      /* try next */
    }
  }
  throw new Error('decodeKeetCompat: no 32-byte topic found; needs de-obfuscation (see docs/REVERSE_ENGINEERING.md)')
}
