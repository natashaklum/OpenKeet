// @openkeet/dht — fork wrapper around hyperdht.
// Keeps wire-compat with upstream; adds OpenKeet env overrides.
// NOTE: hyperdht is lazily imported so pure-config tests work without native deps.
export function getBootstrap() {
  const raw = process.env.OPENKEET_BOOTSTRAP
  if (raw === undefined) return undefined
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return list
}

export async function createDHT(opts = {}) {
  const { default: DHT } = await import('hyperdht')
  const bootstrap = getBootstrap()
  const dht = new DHT({
    ...(bootstrap !== undefined ? { bootstrap } : {}),
    ephemeral: opts.ephemeral ?? process.env.OPENKEET_EPHEMERAL === '1'
  })
  await dht.ready()
  return dht
}

export default { createDHT, getBootstrap }
