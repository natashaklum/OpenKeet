import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getBootstrap } from '../src/index.js'

test('defaults to public bootstrap', () => {
  delete process.env.OPENKEET_BOOTSTRAP
  assert.equal(getBootstrap(), undefined)
})

test('parses custom bootstrap', () => {
  process.env.OPENKEET_BOOTSTRAP = '127.0.0.1:49737'
  assert.deepEqual(getBootstrap(), ['127.0.0.1:49737'])
  delete process.env.OPENKEET_BOOTSTRAP
})
