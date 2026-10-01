import z32 from 'z32'
import { encodeInvite, decodeInvite } from './invite.js'
import { createSwarm } from './dht.js'
import type { ChatMessage, Identity, RoomHandle } from './types.js'

function random32(): Uint8Array {
  const b = new Uint8Array(32)
  const g: any = globalThis as any
  if (g.crypto?.getRandomValues) {
    g.crypto.getRandomValues(b)
    return b
  }
  // last-resort Math.random (tests/bundlers without WebCrypto; not for production secrets)
  for (let i = 0; i < 32; i++) b[i] = Math.floor(Math.random() * 256)
  return b
}

// Lazy-load heavy Hyper* deps so bundlers / tests can stub them.
async function loadStore() {
  const [{ default: Corestore }, { default: Autobase }] = await Promise.all([
    // @ts-ignore
    import('corestore'),
    // @ts-ignore
    import('autobase')
  ])
  return { Corestore, Autobase }
}

export interface CreateRoomOpts {
  storagePath: string
  identity: Identity
  /** Optional fixed 32B topic (for tests). Defaults to random. */
  topic?: Uint8Array
  /** Optional 32B encryption key for private rooms. */
  encryptionKey?: Uint8Array
}

export interface JoinRoomOpts {
  storagePath: string
  identity?: Identity
  invite: string
}

/**
 * Room = Hyperswarm topic + Corestore/Autobase multiwriter log.
 * Writer bootstrap key = first writer's core key; others added via addWriter.
 * For v0 each device keeps its own storage dir; replication happens live over swarm.
 */
export async function createRoom(opts: CreateRoomOpts): Promise<RoomHandle> {
  const { Corestore, Autobase } = await loadStore()
  const topic = opts.topic ?? random32()
  const store = new Corestore(opts.storagePath)
  await store.ready()

  const base = new Autobase(store, null, {
    valueEncoding: 'json',
    open(store: InstanceType<typeof Corestore>) {
      return store.get('openkeet-view', { valueEncoding: 'json' })
    },
    apply: async (nodes: Array<{ value: unknown }>, view: { append: (v: unknown) => Promise<void> }, _host: unknown) => {
      for (const n of nodes) await view.append(n.value)
    }
  })
  await base.ready()

  const swarm: any = await createSwarm()
  wireReplication(swarm, store, topic)
  const handle = makeHandle(swarm, store, base, topic, opts.encryptionKey)
  // Announce so joiners find us once they decode the invite.
  await swarm.join(topic, { server: true, client: true }).flushed?.().catch?.(() => {})
  return handle
}

export async function joinRoom(opts: JoinRoomOpts): Promise<RoomHandle> {
  const { Corestore, Autobase } = await loadStore()
  const parsed = decodeInvite(opts.invite)
  const store = new Corestore(opts.storagePath)
  await store.ready()

  const base = new Autobase(store, null, {
    valueEncoding: 'json',
    open(store: InstanceType<typeof Corestore>) {
      return store.get('openkeet-view', { valueEncoding: 'json' })
    },
    apply: async (nodes: Array<{ value: unknown }>, view: { append: (v: unknown) => Promise<void> }, _host: unknown) => {
      for (const n of nodes) await view.append(n.value)
    }
  })
  await base.ready()

  const swarm: any = await createSwarm()
  wireReplication(swarm, store, parsed.topic)
  const handle = makeHandle(swarm, store, base, parsed.topic, parsed.encryptionKey)
  await swarm.join(parsed.topic, { server: true, client: true }).flushed?.().catch?.(() => {})
  return handle
}

function wireReplication(swarm: any, store: any, _topic: Uint8Array) {
  swarm.on('connection', (conn: any) => {
    try {
      store.replicate(conn)
    } catch {
      try {
        conn.destroy()
      } catch {
        /* noop */
      }
    }
  })
}

function makeHandle(swarm: any, store: any, base: any, topic: Uint8Array, encryptionKey?: Uint8Array): RoomHandle {
  const topicZ32 = z32.encode(topic)
  const invite = encodeInvite(topic, encryptionKey)
  const listeners = new Set<(m: ChatMessage) => void>()

  // Best-effort live tail: poll view length (simple, portable across autobase versions).
  let cursor = 0
  let stopped = false
  async function poll() {
    while (!stopped) {
      try {
        const len = base.view?.length ?? 0
        if (len > cursor) {
          for (let i = cursor; i < len; i++) {
            try {
              const v = await base.view.get(i)
              const msg = normalise(v?.value ?? v, topicZ32)
              if (msg) listeners.forEach((cb) => cb(msg))
            } catch {
              /* skip */
            }
          }
          cursor = len
        }
      } catch {
        /* view not ready yet */
      }
      await new Promise((r) => setTimeout(r, 750))
    }
  }
  void poll()

  return {
    topic,
    topicZ32,
    invite,
    async send(text: string) {
      const clean = text.trim()
      if (!clean) return
      await base.append({
        kind: 'chat',
        text: clean.slice(0, 4000),
        author: 'local',
        timestamp: Date.now(),
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`
      } as any)
    },
    async list() {
      const out: ChatMessage[] = []
      try {
        const len = base.view?.length ?? 0
        for (let i = 0; i < len; i++) {
          try {
            const v = await base.view.get(i)
            const m = normalise(v?.value ?? v, topicZ32)
            if (m) out.push(m)
          } catch {
            /* skip */
          }
        }
      } catch {
        /* empty */
      }
      return out
    },
    onMessage(cb) {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    async close() {
      stopped = true
      try {
        await swarm.leave(topic)
      } catch {
        /* noop */
      }
      try {
        await swarm.destroy()
      } catch {
        /* noop */
      }
      try {
        await base.close()
      } catch {
        /* noop */
      }
      try {
        await store.close()
      } catch {
        /* noop */
      }
    }
  }
}

function normalise(v: any, _topicZ32: string): ChatMessage | null {
  if (!v || typeof v !== 'object') return null
  if (typeof v.text !== 'string') return null
  return {
    id: String(v.id ?? `${v.timestamp ?? Date.now()}-${Math.random().toString(36).slice(2)}`),
    author: String(v.author ?? 'unknown'),
    text: v.text,
    timestamp: Number(v.timestamp ?? Date.now())
  }
}
