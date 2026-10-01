import { useState } from 'react'
import { generateIdentity, importIdentity, encodeInvite, decodeInvite } from '@openkeet/core'

// v0 Android: full identity + invite codec run 100% locally (no UDP in WebView).
// Live swarm replication in WebView is limited (no raw UDP); the APK ships the
// same UI + core, and CI builds it. Next step is a Bare worklet
// (react-native-bare-kit / bare-android) for native UDP — see docs/ARCHITECTURE.md.
// Until then, rooms created here produce real openkeet:// invites you can open on desktop.

export function AndroidApp() {
  const [id, setId] = useState('')
  const [mnemonic, setMnemonic] = useState('')
  const [invite, setInvite] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [status, setStatus] = useState('Create an identity to begin (stored in this device only).')

  return (
    <div className="wrap">
      <h1>OpenKeet (Android)</h1>
      <p className="sub">open P2P chat · identity + invites work offline · desktop peers via DHT</p>

      <section className="card">
        <h2>Identity</h2>
        <div className="row">
          <button
            onClick={() => {
              const ident = generateIdentity()
              setId(ident.id)
              setMnemonic(ident.mnemonic)
              try {
                localStorage.setItem('openkeet-mnemonic', ident.mnemonic)
              } catch {}
              setStatus(`id ${ident.id.slice(0, 16)}… — 24 words saved on device`)
            }}
          >
            New
          </button>
          <button
            onClick={() => {
              const m = prompt('Paste 24-word seed:') ?? localStorage.getItem('openkeet-mnemonic') ?? ''
              if (!m) return
              try {
                const ident = importIdentity(m)
                setId(ident.id)
                setMnemonic(ident.mnemonic)
                setStatus('restored')
              } catch (e) {
                setStatus(`import failed: ${(e as Error).message}`)
              }
            }}
          >
            Restore
          </button>
        </div>
        {mnemonic && <textarea readOnly rows={2} value={mnemonic} />}
      </section>

      <section className="card">
        <h2>Room invite (openkeet://)</h2>
        <div className="row">
          <button
            onClick={() => {
              // topic must be 32 random bytes; use WebCrypto in WebView
              const topic = new Uint8Array(32)
              crypto.getRandomValues(topic)
              const inv = encodeInvite(topic)
              setInvite(inv)
              setStatus('invite created — open it on desktop to chat P2P')
            }}
          >
            Create invite
          </button>
        </div>
        {invite && <input readOnly value={invite} />}
        <div className="row">
          <input placeholder="paste invite to validate" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
          <button
            onClick={() => {
              try {
                const p = decodeInvite(joinCode.trim())
                setStatus(`valid invite · topic ${p.topicZ32.slice(0, 12)}… — join from desktop for live swarm`)
              } catch (e) {
                setStatus(`invalid: ${(e as Error).message}`)
              }
            }}
          >
            Validate
          </button>
        </div>
      </section>

      <p className="status">{status}</p>
      {id && <p className="sub">you: {id.slice(0, 20)}…</p>}
    </div>
  )
}
