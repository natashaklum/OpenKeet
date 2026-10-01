// loader for optional obfuscated Keet blobs — bundled as-is, never required.
// Returns the blob module if present, else null (caller falls back to @openkeet/core).
export async function loadKeetOrig(paths = []) {
  const candidates =
    paths.length > 0
      ? paths
      : ['./keet.bundle.js', './vendor/keet-orig/keet.bundle.js', '../vendor/keet-orig/keet.bundle.js']
  for (const p of candidates) {
    try {
      const mod = await import(/* @vite-ignore */ p)
      console.info(`[openkeet] using vendored keet-orig blob: ${p}`)
      return mod
    } catch {
      /* not present — try next */
    }
  }
  return null
}
