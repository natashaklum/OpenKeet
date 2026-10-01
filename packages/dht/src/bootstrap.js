#!/usr/bin/env node
// openkeet-dht-bootstrap — run a DHT bootstrap / bootnode.
// Usage: openkeet-dht-bootstrap --port 49737 [--host 0.0.0.0] [--bootstrap 1.2.3.4:49737,...]
//   --bootstrap [] or env OPENKEET_BOOTSTRAP="" with empty value => isolated network.
import DHT from 'hyperdht'

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1) return fallback
  return process.argv[i + 1] ?? fallback
}

const port = Number(arg('port', process.env.OPENKEET_DHT_PORT ?? '49737'))
const host = arg('host', process.env.OPENKEET_DHT_HOST ?? '0.0.0.0')
let bootstrap = arg('bootstrap', process.env.OPENKEET_BOOTSTRAP)
let nodes
if (bootstrap === '[]' || bootstrap === '') nodes = []
else if (typeof bootstrap === 'string') nodes = bootstrap.split(',').map((s) => s.trim()).filter(Boolean)
else nodes = undefined

const boot = new DHT({ port, host, ...(nodes !== undefined ? { bootstrap: nodes } : {}) })
await boot.ready()
console.log(JSON.stringify({ ok: true, host, port, bootstrap: nodes ?? 'default-public' }))
process.on('SIGINT', async () => {
  await boot.destroy().catch(() => {})
  process.exit(0)
})
process.on('SIGTERM', async () => {
  await boot.destroy().catch(() => {})
  process.exit(0)
})
