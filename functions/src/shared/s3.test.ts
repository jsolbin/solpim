import test from 'node:test'
import assert from 'node:assert/strict'

import { buildObjectKey } from './s3'

test('buildObjectKey preserves structure and sanitizes file names', () => {
  const objectKey = buildObjectKey('artwork-1', 'content-1', 'my file(1).jpg')

  assert.match(
    objectKey,
    /^artworks\/artwork-1\/content-1-[0-9a-f-]+-my_file_1_.jpg$/
  )
})
