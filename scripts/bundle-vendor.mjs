#!/usr/bin/env node
// Copies vendor/keet-orig blobs verbatim into <out>/vendor/keet-orig + manifest.
// Usage: node scripts/bundle-vendor.mjs --out apps/desktop/dist [--src vendor/keet-orig]
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : (process.argv[i + 1] ?? fallback)
}

const src = arg('src', 'vendor/keet-orig')
const out = arg('out', 'dist')
const skip = new Set(['README.md', 'loader.js', '.gitkeep', 'vendor-manifest.json'])

const srcDir = path.resolve(src)
const destDir = path.resolve(out, 'vendor/keet-orig')
await fs.mkdir(destDir, { recursive: true })

let entries = []
try {
  entries = await fs.readdir(srcDir)
} catch {
  console.log(`[vendor] no ${srcDir}, writing empty manifest`)
}

const manifest = []
for (const name of entries) {
  if (skip.has(name)) continue
  const from = path.join(srcDir, name)
  const st = await fs.stat(from)
  if (!st.isFile()) {
    console.log(`[vendor] skip non-file ${name}`)
    continue
  }
  const data = await fs.readFile(from) // byte-for-byte, no transform
  await fs.writeFile(path.join(destDir, name), data)
  manifest.push({
    file: name,
    bytes: data.length,
    sha256: createHash('sha256').update(data).digest('hex')
  })
  console.log(`[vendor] bundled as-is: ${name} (${data.length} bytes)`)
}
// always copy loader for runtime probing
try {
  const loader = await fs.readFile(path.join(srcDir, 'loader.js'))
  await fs.writeFile(path.join(destDir, 'loader.js'), loader)
} catch {
  /* noop */
}
await fs.writeFile(path.join(destDir, 'vendor-manifest.json'), JSON.stringify({ blobs: manifest }, null, 2))
console.log(`[vendor] manifest: ${manifest.length} blob(s) -> ${path.join(destDir, 'vendor-manifest.json')}`)
