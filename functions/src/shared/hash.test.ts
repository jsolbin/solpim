import test from 'node:test'
import assert from 'node:assert/strict'

import { createImageHash } from './hash'

test('creates the same hash for identical file bytes', () => {
  const bytes = Buffer.from('same-image-content')

  assert.equal(createImageHash(bytes), createImageHash(bytes))
})

test('creates different hashes for different file bytes', () => {
  assert.notEqual(
    createImageHash(Buffer.from('image-a')),
    createImageHash(Buffer.from('image-b'))
  )
})
