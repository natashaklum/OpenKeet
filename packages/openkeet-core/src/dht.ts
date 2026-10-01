// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMod = any

async function load(mod: string): Promise<AnyMod> {
  // @ts-ignore dynamic optional dep
  return await import(mod)
}

/** Bootstrap entries from env: OPENKEET_BOOTSTRAP="host:port,host:port" or [] for isolated nets. */
export function getBootstrapNodes(): string[] | undefined {
  const raw = (globalThis as any).process?.env?.OPENKEET_BOOTSTRAP as string | undefined
  if (raw === undefined) return undefined // hyperdht default (public Holepunch bootstrap)
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return list
}

/** Create a HyperDHT node honouring OpenKeet env overrides. Caller must destroy() it. */
export async function createDHT(opts: { ephemeral?: boolean } = {}) {
  const { default: DHT } = await load('hyperdht')
  const bootstrap = getBootstrapNodes()
  const ephemeral = opts.ephemeral ?? (globalThis as any).process?.env?.OPENKEET_EPHEMERAL === '1'
  const dht = new DHT({
    ...(bootstrap !== undefined ? { bootstrap } : {}),
    ephemeral
  })
  await dht.ready()
  return dht
}

/** Create a Hyperswarm instance honouring OpenKeet env overrides. Caller must destroy() it. */
export async function createSwarm(opts: { dht?: unknown; ephemeral?: boolean } = {}) {
  const { default: Hyperswarm } = await load('hyperswarm')
  if (opts.dht) return new Hyperswarm({ dht: opts.dht })
  const bootstrap = getBootstrapNodes()
  const ephemeral = opts.ephemeral ?? (globalThis as any).process?.env?.OPENKEET_EPHEMERAL === '1'
  return new Hyperswarm({
    ...(bootstrap !== undefined ? { bootstrap } : {}),
    ephemeral
  })
}
