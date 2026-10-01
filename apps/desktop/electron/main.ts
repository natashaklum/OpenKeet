import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Core runs in Node (main process) — renderer stays dumb and calls IPC.
let core: typeof import('@openkeet/core') | null = null
async function getCore() {
  if (!core) core = await import('@openkeet/core')
  return core
}

const rooms = new Map<string, { handle: any; storagePath: string }>()
let identity: any = null

function storageBase() {
  return path.join(app.getPath('userData'), 'openkeet-storage')
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    backgroundColor: '#0f1419',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    await win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// Optional vendored blob probe (as-is bundle, never required).
async function probeVendorBlob() {
  try {
    // @ts-ignore optional blob, may not exist
    const mod = await import('../../../vendor/keet-orig/loader.js').catch(() => null)
    if (mod?.loadKeetOrig) await mod.loadKeetOrig()
  } catch {
    /* open core is the default */
  }
}

ipcMain.handle('openkeet:identity:create', async () => {
  const c = await getCore()
  identity = c.generateIdentity()
  return { mnemonic: identity.mnemonic, id: identity.id }
})

ipcMain.handle('openkeet:identity:import', async (_e, mnemonic: string) => {
  const c = await getCore()
  identity = c.importIdentity(mnemonic)
  return { id: identity.id }
})

ipcMain.handle('openkeet:room:create', async () => {
  const c = await getCore()
  if (!identity) identity = c.generateIdentity()
  const handle = await c.createRoom({ storagePath: path.join(storageBase(), `room-${Date.now()}`), identity })
  rooms.set(handle.topicZ32, { handle, storagePath: '' })
  return { topicZ32: handle.topicZ32, invite: handle.invite }
})

ipcMain.handle('openkeet:room:join', async (_e, invite: string) => {
  const c = await getCore()
  if (!identity) identity = c.generateIdentity()
  const handle = await c.joinRoom({ storagePath: path.join(storageBase(), `room-${Date.now()}`), invite })
  rooms.set(handle.topicZ32, { handle, storagePath: '' })
  return { topicZ32: handle.topicZ32, invite: handle.invite }
})

ipcMain.handle('openkeet:room:send', async (_e, topicZ32: string, text: string) => {
  const r = rooms.get(topicZ32)
  if (!r) throw new Error('unknown room')
  await r.handle.send(text)
  return { ok: true }
})

ipcMain.handle('openkeet:room:list', async (_e, topicZ32: string) => {
  const r = rooms.get(topicZ32)
  if (!r) throw new Error('unknown room')
  return await r.handle.list()
})

ipcMain.handle('openkeet:dialog:export', async (_e, text: string) => {
  const { filePath } = await dialog.showSaveDialog({ defaultPath: 'openkeet-invite.txt' })
  if (!filePath) return { saved: false }
  const { writeFile } = await import('node:fs/promises')
  await writeFile(filePath, text, 'utf8')
  return { saved: true, filePath }
})

app.whenReady().then(async () => {
  await probeVendorBlob()
  await createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
