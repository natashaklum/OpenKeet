import type { Identity } from './types.js'
import { dhtKeyPair } from './identity.js'
import { createDHT } from './dht.js'

export interface DmServer {
  publicKey: Uint8Array
  close: () => Promise<void>
  onConnection: (cb: (socket: any) => void) => void
}

/**
 * 1:1 DM over HyperDHT Noise sockets (holepunched, E2E).
 * Server: listen on your identity key; share `id` (z32 pubkey) out-of-band.
 * Client: `connectTo peerId` → SecretStream usable like a socket.
 */
export async function listenForDM(identity: Identity, opts: { firewall?: (pubkey: Uint8Array) => boolean } = {}): Promise<DmServer> {
  const dht: any = await createDHT()
  const handlers = new Set<(s: any) => void>()
  const server = dht.createServer(
    { firewall: opts.firewall ? (remote: Uint8Array) => !opts.firewall!(remote) : undefined },
    (socket: any) => handlers.forEach((cb) => cb(socket))
  )
  await server.listen(dhtKeyPair(identity))
  return {
    publicKey: identity.publicKey,
    onConnection(cb) {
      handlers.add(cb)
    },
    async close() {
      try {
        await server.close()
      } finally {
        await dht.destroy()
      }
    }
  }
}

export async function connectDM(remotePublicKey: Uint8Array): Promise<any> {
  const dht: any = await createDHT()
  const socket = dht.connect(remotePublicKey)
  const origDestroy = socket.destroy?.bind(socket)
  if (origDestroy) {
    socket.destroy = (...a: unknown[]) => {
      try {
        return (origDestroy as (...x: unknown[]) => unknown)(...a)
      } finally {
        dht.destroy().catch(() => {})
      }
    }
  }
  return socket
}
