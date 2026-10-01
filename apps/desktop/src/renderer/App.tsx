declare global {
  interface Window {
    openkeet?: {
      identityCreate: () => Promise<{ mnemonic: string; id: string }>
      identityImport: (m: string) => Promise<{ id: string }>
      roomCreate: () => Promise<{ topicZ32: string; invite: string }>
      roomJoin: (invite: string) => Promise<{ topicZ32: string; invite: string }>
      roomSend: (topic: string, text: string) => Promise<{ ok: boolean }>
      roomList: (topic: string) => Promise<Array<{ id: string; author: string; text: string; timestamp: number }>>
      exportText: (t: string) => Promise<{ saved: boolean }>
    }
  }
}

import { useCallback, useEffect, useState } from 'react'

interface Msg {
  id: string
  author: string
  text: string
  timestamp: number
}

export function App() {
  const [userId, setUserId] = useState('')
  const [mnemonic, setMnemonic] = useState('')
  const [topic, setTopic] = useState('')
  const [invite, setInvite] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [status, setStatus] = useState('No identity yet — create one to start (24-word seed, like Keet).')
  const api = typeof window !== 'undefined' ? window.openkeet : undefined

  const refresh = useCallback(async () => {
    if (!api || !topic) return
    try {
      const list = await api.roomList(topic)
      setMessages(list)
    } catch (e) {
      setStatus(`list failed: ${(e as Error).message}`)
    }
  }, [api, topic])

  useEffect(() => {
    if (!topic) return
    const t = setInterval(() => void refresh(), 1500)
    return () => clearInterval(t)
  }, [topic, refresh])

  if (!api) {
    return (
      <div className="wrap">
        <h1>OpenKeet</h1>
        <p>
          Renderer running outside Electron (Vite dev). Start Electron (<code>npm run dev:electron</code>) or use the
          Android app for full P2P.
        </p>
      </div>
    )
  }

  return (
    <div className="wrap">
      <header>
        <h1>OpenKeet</h1>
        <p className="sub">open P2P chat — Hyperswarm room + Autobase log. {userId ? `you: ${userId.slice(0, 12)}…` : ''}</p>
      </header>

      <section className="card">
        <h2>1 · Identity (24-word seed)</h2>
        <div className="row">
          <button
            onClick={async () => {
              const r = await api.identityCreate()
              setUserId(r.id)
              setMnemonic(r.mnemonic)
              setStatus(`identity ready: ${r.id.slice(0, 16)}… — SAVE the 24 words!`)
            }}
          >
            New identity
          </button>
          <button
            onClick={async () => {
              const m = prompt('Paste 24-word seed:')
              if (!m) return
              try {
                const r = await api.identityImport(m)
                setUserId(r.id)
                setMnemonic(m)
                setStatus('identity restored')
              } catch (e) {
                setStatus(`import failed: ${(e as Error).message}`)
              }
            }}
          >
            Restore
          </button>
        </div>
        {mnemonic && <textarea readOnly value={mnemonic} rows={2} title="recovery seed — keep secret" />}
      </section>

      <section className="card">
        <h2>2 · Room</h2>
        <div className="row">
          <button
            onClick={async () => {
              const r = await api.roomCreate()
              setTopic(r.topicZ32)
              setInvite(r.invite)
              setStatus(`room created, topic ${r.topicZ32.slice(0, 12)}… — share the invite`)
              setMessages([])
            }}
          >
            Create room
          </button>
          <input placeholder="paste openkeet:// invite" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
          <button
            onClick={async () => {
              try {
                const r = await api.roomJoin(joinCode.trim())
                setTopic(r.topicZ32)
                setInvite(r.invite)
                setStatus('joined room')
                setMessages([])
              } catch (e) {
                setStatus(`join failed: ${(e as Error).message}`)
              }
            }}
          >
            Join
          </button>
        </div>
        {invite && (
          <div className="row">
            <input readOnly value={invite} title="share this invite" />
            <button onClick={() => void api.exportText(invite)}>Save…</button>
          </div>
        )}
      </section>

      <section className="card">
        <h2>3 · Messages {topic ? `(live poll)` : ''}</h2>
        <div className="msgs">
          {messages.length === 0 && <em>No messages yet. Create/join a room, then send.</em>}
          {messages.map((m) => (
            <div key={m.id} className="msg">
              <span className="author">{m.author.slice(0, 8)}</span>
              <span>{m.text}</span>
              <span className="ts">{new Date(m.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
        <div className="row">
          <input
            placeholder={topic ? 'message…' : 'join a room first'}
            value={draft}
            disabled={!topic}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) {
                void api.roomSend(topic, draft).then(() => {
                  setDraft('')
                  void refresh()
                })
              }
            }}
          />
          <button
            disabled={!topic || !draft.trim()}
            onClick={() => {
              void api.roomSend(topic, draft).then(() => {
                setDraft('')
                void refresh()
              })
            }}
          >
            Send
          </button>
          <button disabled={!topic} onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      </section>

      <p className="status">{status}</p>
    </div>
  )
}
