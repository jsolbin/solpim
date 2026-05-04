import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildFinalizedArtworkDocument,
  buildUploadRequestedArtworkDocument,
} from './protectedArtwork'

const storage = {
  provider: 's3' as const,
  bucketName: 'bucket',
  objectKey: 'artworks/a1/c1/image.jpg',
  region: 'ap-northeast-2',
}

test('builds upload requested firestore document with expected fields', () => {
  const now = '2026-05-03T10:00:00.000Z'
  const doc = buildUploadRequestedArtworkDocument({
    artworkId: 'artwork-1',
    contentId: 'content-1',
    ownerUid: 'user-1',
    title: 'Sunrise',
    imageName: 'sunrise.jpg',
    storage,
    now,
  })

  assert.equal(doc.title, 'Sunrise')
  assert.equal(doc.ownerUid, 'user-1')
  assert.equal(doc.protection.status, 'upload_requested')
  assert.equal(doc.protection.imageHash, undefined)
})

test('builds finalized firestore document with expected fields', () => {
  const submittedAt = '2026-05-03T10:05:00.000Z'
  const doc = buildFinalizedArtworkDocument({
    artworkId: 'artwork-1',
    contentId: 'content-1',
    ownerUid: 'user-1',
    title: 'Sunrise',
    imageName: 'sunrise.jpg',
    storage,
    submittedAt,
    verifiedStorage: {
      objectKey: storage.objectKey,
      contentType: 'image/jpeg',
      contentLength: 2048,
      eTag: 'etag-1',
    },
  })

  assert.equal(doc.title, 'Sunrise')
  assert.equal(doc.ownerUid, 'user-1')
  assert.equal(doc.protection.status, 'uploaded')
  assert.equal(doc.protection.verifiedStorage?.contentLength, 2048)
  assert.equal(doc.protection.imageHash, undefined)
})
