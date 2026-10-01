# PATCHES vs upstream holepunchto/hyperdht

Upstream: https://github.com/holepunchto/hyperdht (MIT)
Pinned: `hyperdht@^7` (see package.json).

OpenKeet divergence (v0.1 — no wire changes):

- `src/index.js:createDHT()` — reads `OPENKEET_BOOTSTRAP` (csv `host:port`) and `OPENKEET_EPHEMERAL`, passes through to `new DHT({bootstrap, ephemeral})`. Upstream defaults unchanged when env absent.
- `src/bootstrap.js` — standalone bootstrap runner (`--port`, `--bootstrap`, `--host`). Upstream ships a similar CLI; ours adds env defaults + JSON logging for CI.
- No Kademlia / Noise / UDP wire changes yet. Future forks (e.g. custom bootstrap auth, local-only DHT) must be documented here with before/after packet notes + interop impact.
