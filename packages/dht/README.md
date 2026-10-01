# @openkeet/dht — forkable DHT layer

Thin wrapper over [`hyperdht`](https://github.com/holepunchto/hyperdht) (MIT, the DHT powering Hyperswarm/Keet).

Default behaviour = upstream public bootstrap (Holepunch). Override for private/isolated nets:

```bash
# isolated bootstrap node
npx openkeet-dht-bootstrap --port 49737 --bootstrap []

# app using it
OPENKEET_BOOTSTRAP=127.0.0.1:49737 npm run dev --workspace @openkeet/desktop
```

To fully fork (diverge from upstream): clone `holepunchto/hyperdht` over this directory, keep the same `createDHT()` API, and record changes in `PATCHES.md`. The npm-dep + patches approach is default so you stay mergeable.
