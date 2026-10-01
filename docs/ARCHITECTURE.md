# Architecture

## Monorepo

- `packages/openkeet-core`: pure TS, no UI. Owns identity, invites, DHT/swarm setup, room log, DM. Usable from Node, Electron main, Vite renderer (via bundler), Capacitor, or Bare (bundle with `bare-pack`).
- `packages/dht`: thin fork layer over `hyperdht`. Default export `createDHT()` respects `OPENKEET_BOOTSTRAP` (comma-separated `host:port`) and `OPENKEET_EPHEMERAL`. Bin `openkeet-dht-bootstrap` runs a bootstrap node. `PATCHES.md` tracks divergence from upstream.
- `apps/desktop`: Electron + Vite + React. `electron/main.ts` creates window; `src/renderer` is the chat UI importing `@openkeet/core`. Packaged with electron-builder → AppImage + deb on Linux CI.
- `apps/android`: Vite + React + Capacitor. Same UI components (imported source, not copy-paste) + `@openkeet/core`. `npx cap sync` generates `android/` in CI; Gradle builds debug APK.
- `vendor/keet-orig`: optional verbatim blobs + loader. Never required for build.

## Data flow (room message)

```
UI (React) -> core.createRoom() / core.join(invite)
  -> Hyperswarm.join(topic) -> peer sockets
  -> Corestore.replicate(socket) + Autobase.append({text, author, ts})
  -> Autobase linearised view -> UI subscription (poll/live)
```

DM flow: `dht.createServer({firewall})` + `listen(keyPair)` on one side, `dht.connect(remotePubKey)` on other → `SecretStream` (Noise). Firewall hook rejects unknown peers unless invited.

## Storage

- Desktop: `app.getPath('userData')/openkeet-storage` (Corestore directory).
- Android: Capacitor Filesystem directory (passed as `storagePath` to core) — defaults to in-memory if unavailable.
- Keys: OS keychain when available; else encrypted file. Never committed. 24-word mnemonic is the recovery source.

## Future (Pear/Bare-native)

Core avoids Node-only APIs (`node:fs` only behind `storagePath` injection) so it can later be bundled with `bare-pack` into a Bare worklet (`react-native-bare-kit`) or run under `pear run`. Electron/Capacitor chosen for Day-1 CI simplicity (standard GitHub runners, signed APK path well-known).
