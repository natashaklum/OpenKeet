import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { generateIdentity, importIdentity } from '../identity.js'
import { encodeInvite, decodeInvite, decodeKeetCompat } from '../invite.js'
import { getBootstrapNodes } from '../dht.js'

describe('identity', () => {
  it('generates 24 words and round-trips', () => {
    const id = generateIdentity()
    assert.equal(id.mnemonic.split(' ').length, 24)
    assert.equal(id.publicKey.length, 32)
    const same = importIdentity(id.mnemonic)
    assert.equal(Buffer.from(same.publicKey).toString('hex'), Buffer.from(id.publicKey).toString('hex'))
  })

  it('rejects bad mnemonics', () => {
    assert.throws(() => importIdentity('hello world'), /expected 24 words/)
  })
})

describe('invites', () => {
  it('encodes/decodes topic-only and private invites', () => {
    const topic = randomBytes(32)
    const inv = encodeInvite(topic)
    assert.match(inv, /^openkeet:\/\//)
    const p = decodeInvite(inv)
    assert.equal(Buffer.from(p.topic).toString('hex'), Buffer.from(topic).toString('hex'))
    assert.equal(p.encryptionKey, undefined)

    const enc = randomBytes(32)
    const inv2 = encodeInvite(topic, enc)
    const p2 = decodeInvite(inv2)
    assert.equal(Buffer.from(p2.encryptionKey!).toString('hex'), Buffer.from(enc).toString('hex'))
  })

  it('rejects garbage', () => {
    assert.throws(() => decodeInvite('not-an-invite'), /unrecognised invite/)
  })

  it('compat shim extracts embedded topic or throws clearly', () => {
    const topic = randomBytes(32)
    const inv = encodeInvite(topic)
    // compat path: raw string containing the z32 topic somewhere
    const fakeKeet = `keet://room#${inv.split('://')[1]}?x=1`
    const p = decodeKeetCompat(fakeKeet)
    assert.equal(Buffer.from(p.topic).toString('hex'), Buffer.from(topic).toString('hex'))
    assert.throws(() => decodeKeetCompat('keet://nope'), /needs de-obfuscation/)
  })
})

describe('dht config', () => {
  it('defaults to undefined (public bootstrap) without env', () => {
    delete process.env.OPENKEET_BOOTSTRAP
    assert.equal(getBootstrapNodes(), undefined)
  })

  it('parses env list', () => {
    process.env.OPENKEET_BOOTSTRAP = '127.0.0.1:49737, 10.0.0.2:49737'
    assert.deepEqual(getBootstrapNodes(), ['127.0.0.1:49737', '10.0.0.2:49737'])
    delete process.env.OPENKEET_BOOTSTRAP
  })
})
