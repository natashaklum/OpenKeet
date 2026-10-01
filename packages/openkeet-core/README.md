# @openkeet/core

Pure-TypeScript P2P chat core (no UI). Works in Node, Electron, Vite/Capacitor (bundled), and later Bare.

```ts
import { generateIdentity, createRoom, joinRoom } from '@openkeet/core'

const alice = generateIdentity() // { mnemonic[24], publicKey z32, secret seed }
const room = await createRoom({ storagePath: './storage', identity: alice })
console.log(room.invite) // openkeet://...

const bobRoom = await joinRoom({ storagePath: './storage-bob', invite: room.invite })
await room.send('hello P2P')
```

See `src/` for `identity.ts`, `invite.ts`, `room.ts`, `dm.ts`, `dht.ts`.
