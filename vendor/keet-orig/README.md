# vendor/keet-orig — OPTIONAL obfuscated Keet blobs (bundled as-is)

Phase-1 strategy: bundle obfuscated code **verbatim**, get OpenKeet working, de-obfuscate later.

- Drop files here, e.g. `keet.bundle.js`, `pear-prebuilt/`, `keet-android.apk` (for analysis only).
- **Do not commit blobs you don't have rights to redistribute.** This directory is git-ignored except `README.md`, `loader.js`, `.gitkeep` (see root `.gitignore`).
- Build: `npm run vendor:bundle -- --out <dist-dir>` copies every file byte-for-byte into `<dist>/vendor/keet-orig/` + writes `vendor-manifest.json` (`sha256`, bytes). No transpile, no minify — offsets stay stable for analysis.
- Runtime: `loader.js:loadKeetOrig()` dynamic-`import()`s the blob only if present, else returns `null`. Desktop + Android call it in try/catch and fall back to `@openkeet/core`.

Phase-2: port modules one-by-one into `packages/openkeet-core/src/compat/` and record mappings in `docs/REVERSE_ENGINEERING.md`.
