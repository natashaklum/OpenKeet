import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import z32 from 'z32'
import type { Identity } from './types.js'

function seedFromMnemonic(mnemonic: string): Uint8Array {
  // Deterministic 32B seed: sha256('openkeet-identity-v1:' + mnemonic).
  // Uses BIP-39 entropy for the words; hash keeps ed25519 seed size fixed
  // and avoids depending on bip39 seed slicing quirks across impls.
  const enc = new TextEncoder()
  return sha256(enc.encode(`openkeet-identity-v1:${mnemonic.trim().toLowerCase()}`))
}

/** Generate a fresh 24-word identity (no phone/email, like Keet). */
export function generateIdentity(): Identity {
  const mnemonic = bip39.generateMnemonic(wordlist, 256) // 24 words
  return importIdentity(mnemonic)
}

/** Restore identity from a 24-word mnemonic. Throws on invalid mnemonic. */
export function importIdentity(mnemonic: string): Identity {
  const words = mnemonic.trim().toLowerCase().split(/\s+/)
  if (words.length !== 24) throw new Error(`expected 24 words, got ${words.length}`)
  if (!bip39.validateMnemonic(mnemonic, wordlist)) throw new Error('invalid mnemonic')
  const seed = seedFromMnemonic(mnemonic)
  // ed25519 keypair from seed
  const publicKey = ed25519.getPublicKey(seed)
  const sk = new Uint8Array(64)
  sk.set(seed, 0)
  sk.set(publicKey, 32)
  return {
    mnemonic: words.join(' '),
    seed,
    publicKey,
    secretKey: sk,
    id: z32.encode(publicKey)
  }
}

/** DHT keyPair object expected by hyperdht ({ publicKey, secretKey }). */
export function dhtKeyPair(identity: Identity): { publicKey: Uint8Array; secretKey: Uint8Array } {
  return { publicKey: identity.publicKey, secretKey: identity.secretKey }
}
