export interface ChatMessage {
  id: string
  author: string // z32 public key of writer
  text: string
  timestamp: number
}

export interface RoomHandle {
  topic: Uint8Array
  topicZ32: string
  invite: string
  send: (text: string) => Promise<void>
  list: () => Promise<ChatMessage[]>
  onMessage: (cb: (msg: ChatMessage) => void) => () => void
  close: () => Promise<void>
}

export interface Identity {
  /** 24-word BIP-39 mnemonic (recovery secret — never commit). */
  mnemonic: string
  /** 32-byte ed25519 seed derived from mnemonic. */
  seed: Uint8Array
  /** ed25519 public key (32 bytes). */
  publicKey: Uint8Array
  /** ed25519 secret key (64 bytes) for DHT keyPair. */
  secretKey: Uint8Array
  /** z32-encoded public key (user id). */
  id: string
}
