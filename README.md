# OpenKeet — full open-source Keet (P2P encrypted chat)

![build](https://github.com/natashaklum/OpenKeet/actions/workflows/build.yml/badge.svg)

OpenKeet is a clean-room, open-source re-implementation of the [Keet](https://keet.io/) chat client (Holepunch / Pear stack) in TypeScript/JavaScript, with a forkable DHT layer.

> **Legal / reverse-engineering note:** Keet's UI is closed-source. OpenKeet does **not** vendor proprietary Keet binaries. Instead it re-implements a wire-compatible client on top of the **open** Holepunch primitives (HyperDHT, Hyperswarm, Corestore/Hypercore, Autobase) and provides a `vendor/keet-orig/` drop-in directory where *you* may place any obfuscated blobs you have rights to for local analysis. Those blobs are bundled **as-is** (never transpiled) and are optional — the app works without them. See `docs/REVERSE_ENGINEERING.md`.

## Monorepo layout

```
OpenKeet/
  packages/
    openkeet-core/   # TS chat core: identity (24-word seed), rooms, invites, swarm replication
    dht/             # OpenKeet DHT fork wrapper around hyperdht (custom bootstrap / private nets)
  apps/
    desktop/         # Electron + Vite + React Linux desktop client (AppImage/.deb via electron-builder)
    android/         # Capacitor + Vite + React Android client (APK via Gradle), shares core + UI
  vendor/
    keet-orig/       # OPTIONAL drop-in for obfuscated Keet blobs, bundled verbatim. See README there.
  docs/
    REVERSE_ENGINEERING.md
    ARCHITECTURE.md
  scripts/
    bundle-vendor.mjs  # copies vendor blobs verbatim into dist/
  .github/workflows/build.yml  # CI: test core, build Linux + Android
```

## Quickstart (Node 20+)

```bash
npm install
npm run build --workspaces
npm test --workspace @openkeet/core

# Desktop (Linux dev)
npm run dev --workspace @openkeet/desktop

# Android (web preview; full APK built in CI, see docs)
npm run dev --workspace @openkeet/android
```

## Protocol (v0, compatible-style)

- **Identity:** ed25519 keypair derived from BIP-39 24-word mnemonic. No phone/email. `DHT.keyPair(seed)`.
- **1:1 DM:** `hyperdht` Noise XX holepunched socket (`node.createServer` + `node.connect(pubkey)`).
- **Rooms/groups:** `hyperswarm.join(topic)` where `topic` = 32-byte room key (discovery topic). Messages replicated over `corestore` + `autobase` multiwriter log; optional encryption key for private rooms.
- **Invite:** `openkeet://<z32-topic>[.<z32-encryptionKey>]` (also accepted as `keet-compat:` deep-link for analysis). Contains topic public key + optional secret. Share via QR / string. See `packages/openkeet-core/src/invite.ts`.

This matches the public Holepunch pattern (Hyperswarm topic + Autobase replication + blind-pairing-style invite) without copying proprietary `keet://` encoding. A translator for captured `keet://` links can live in `vendor/keet-orig/` during de-obfuscation.

## DHT fork

`packages/dht` wraps `hyperdht` (MIT) with OpenKeet defaults:

- `OPENKEET_BOOTSTRAP` env / `bootstrap.json` override (default: public Holepunch bootstrap).
- `openkeet-dht-bootstrap` bin to run your own bootstrap / isolated DHT (`--port --bootstrap`).
- See `packages/dht/README.md` and `packages/dht/PATCHES.md` for fork divergence. To fully fork: clone `holepunchto/hyperdht` into this dir (kept as npm dep + patches by default to stay mergeable).

## Obfuscated blobs (phase 1: bundle as-is)

1. Drop files into `vendor/keet-orig/` (e.g. `keet.bundle.js`, `pear-prebuilt/*`).
2. `npm run vendor:bundle -- --out <dist-dir>` copies them byte-for-byte + emits `vendor-manifest.json` (sha256).
3. Runtime loader (`vendor/keet-orig/loader.js`) `import()`s the blob only if present, else uses open implementation.
4. Phase 2 (later): de-obfuscate module-by-module into `packages/openkeet-core/src/compat/`. Do not commit blobs you don't have rights to distribute.

## CI builds

`git push` then GitHub Actions builds:

- Linux desktop: `AppImage` + `.deb` (electron-builder) — artefacts on Releases / Actions.
- Android: `app-debug.apk` (Capacitor + Gradle, preinstalled runner SDK).

See `.github/workflows/build.yml`. No secrets required for debug builds. For signed store builds add `ANDROID_KEYSTORE_*` secrets.

## Git push / auth

Classic PAT needs `repo` + `workflow` scopes (fine-grained needs Contents + Workflows read/write). Save once:

```bash
git config --global credential.helper store
git fetch origin # Username: natashaklum, Password: <PAT>
git push -u origin main
```

With GitHub CLI (`gh`):

```bash
export PATH="$HOME/.local/bin:$PATH" # gh lives here on this machine
export GH_TOKEN="<PAT>"               # or: gh auth login --with-token <<<"$GH_TOKEN"
gh run list --repo natashaklum/OpenKeet --limit 5
gh run view <run-id> --repo natashaklum/OpenKeet --log | tail -50
```

`403 Permission denied` on push with a fine-grained token almost always means Contents and/or Workflows permission is missing, or the repo was created after the token (re-select it under Repository access).

## Status

v0.1 scaffold: text rooms + invites + DM handshake work over public DHT. Audio/video, file transfer, and multi-device sync (QR + blind-pairing) are stubbed for incremental porting. Contributions welcome.
