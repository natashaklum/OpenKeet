# Reverse-engineering notes — Keet → OpenKeet

This doc records **observed / public** behaviour of Keet and how OpenKeet maps it to open primitives. No proprietary code is reproduced here.

## 1. What Keet is (public facts)

- Product: `keet.io` — P2P E2E-encrypted chat / rooms / audio-video / unlimited files. Desktop (Linux/macOS/Windows) + Android + iOS. Backed by Holepunch, built on Pear Runtime.
- No phone/email signup. Identity = 24-word seed phrase (wallet-style), sync across devices via QR / sync link.
- Transport: HyperDHT (Kademlia DHT, `holepunchto/hyperdht`, MIT) for peer discovery + UDP hole-punching, Noise XX encrypted sockets (`@hyperswarm/secret-stream`). Topic swarms via `hyperswarm` (MIT). Storage/replication via `hypercore`/`corestore` + `autobase` multiwriter. Pear (`Apache-2.0`) for desktop distribution/updates; Bare (`Apache-2.0`) for mobile runtime.
- Invite: opaque string / QR / `https://…/keetlink/#<key>`-style link containing at minimum the room/topic key and, for private rooms, the read/encryption secret. Exact `keet://` byte layout is proprietary/obfuscated — treat as opaque in Phase 1.

Sources: keet.io FAQ/download pages, pears.com, `holepunchto/hyperdht`, `holepunchto/hyperswarm`, Pear docs (`docs.pears.com`), community `gasolin/keetlink` samples.

## 2. Stack mapping (Keet concept → OpenKeet module)

| Keet concept | Open primitive | OpenKeet module |
|---|---|---|
| 24-word identity, no signup | BIP-39 mnemonic → 32B seed → `DHT.keyPair(seed)` ed25519 | `packages/openkeet-core/src/identity.ts` |
| DHT / holepunch / bootstrap nodes | `hyperdht` (+ `dht-rpc`) | `packages/dht` (fork wrapper, custom bootstrap, isolated nets) |
| Room topic / discovery | `hyperswarm.join(topic)` (32B), `Hypercore.discoveryKey` | `packages/openkeet-core/src/room.ts` |
| Message log, multiwriter, history | `corestore` + `hypercore` + `autobase` (+ `hyperbee` view) | `packages/openkeet-core/src/room.ts` |
| 1:1 DM Noise socket | `dht.createServer` + `dht.connect(pubkey)` → `SecretStream` | `packages/openkeet-core/src/dm.ts` |
| Invite link / QR / pairing | `openkeet://<z32-topic>[.<z32-encKey>]` (documented, open) + compat shim for captured `keet://` | `packages/openkeet-core/src/invite.ts` |
| Desktop shell | Electron (Linux CI) w/ Pear-compatible entry notes | `apps/desktop` |
| Mobile runtime | Capacitor webview + same core (CI APK); Bare worklet path documented for later | `apps/android`, `docs/ARCHITECTURE.md` |
| OTA / distribution | electron-builder + Capacitor artefacts via GitHub Actions (Pear `pear://` links optional later) | `.github/workflows/build.yml` |

## 3. Phase 1 — bundle obfuscated code as-is

Goal: get something running *before* full de-obfuscation.

1. Place any blobs you legally possess into `vendor/keet-orig/` (e.g. `keet.bundle.js`). **Do not commit blobs you cannot redistribute** — directory is git-ignored except README/loader.
2. `npm run vendor:bundle -- --out <dist>` copies bytes verbatim + writes `vendor-manifest.json` (`sha256`, size). No transpile/minify, so source-maps/offsets stay stable for later analysis.
3. `vendor/keet-orig/loader.js` lazy-loads the blob (`await loadKeetOrig()`) only if present; otherwise resolves `null` and the open core is used. Both desktop and android call it behind a try/catch.
4. Analyse with source-map explorers / `npx bare-pack --inspect` / Electron devtools; port modules one-by-one into `packages/openkeet-core/src/compat/` (Phase 2). Record each mapping in this file.

## 4. Phase 2 — de-obfuscation checklist (later)

- [ ] Identify invite decode (`z32`? `compact-encoding` struct?) → port to `invite.ts:decodeKeetCompat()`
- [ ] Identify message apply function (Autobase `apply` / Hyperbee put) → port to `room.ts`
- [ ] Identify media signalling (Protomux channels?) → stub in `call.ts`
- [ ] Replace `loader.js` branches with native open code; keep blob only for regression diffing.

## 5. Running an isolated network (dev)

```bash
# terminal 1: private bootstrap
npx openkeet-dht-bootstrap --port 49737 --bootstrap []
# terminal 2/3: app with custom bootstrap
OPENKEET_BOOTSTRAP=127.0.0.1:49737 npm run dev --workspace @openkeet/desktop
```

Hyperswarm honours mDNS locally, so two processes on one LAN find each other even without public bootstrap.
