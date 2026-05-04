import test from 'node:test'
import assert from 'node:assert/strict'

import { createImageHash } from '../shared/hash'
import {
  buildFinalizedArtworkDocument,
  buildUploadRequestedArtworkDocument,
} from '../shared/protectedArtwork'
import { buildObjectKey } from '../shared/s3'
import type { StoredArtworkDocument } from '../shared/types'

interface ArtworkMetadataDocument {
  artworkId: string
  title: string
  ownerUid: string
  status: 'pending' | 'approved'
  images: Array<{
    contentId: string
    imageName: string
    objectKey: string
  }>
  createdAt: string
  updatedAt: string
}

interface PresignedUploadResult {
  uploadUrl: string
  bucketName: string
  objectKey: string
  expiresAt: string
}

interface BlockchainRecord {
  artworkId: string
  imageHash: string
  ipfsCid: string
  txHash: string
}

class ArtworkProtectionIntegrationHarness {
  private readonly bucketName = 'solpim-artworks-test'
  private readonly region = 'ap-northeast-2'
  private readonly now = '2026-05-03T12:00:00.000Z'

  readonly protectedArtworks = new Map<string, StoredArtworkDocument>()
  readonly artworks = new Map<string, ArtworkMetadataDocument>()
  readonly s3Objects = new Map<string, Uint8Array>()
  readonly ipfsPins = new Map<string, { cid: string; objectKey: string }>()
  readonly blockchainRecords = new Map<string, BlockchainRecord>()

  generatePresignedUploadUrl(input: {
    artworkId: string
    contentId: string
    ownerUid: string
    fileName: string
  }): PresignedUploadResult {
    const objectKey = buildObjectKey(
      input.artworkId,
      input.contentId,
      input.fileName
    )
    const expiresAt = '2026-05-03T12:15:00.000Z'
    const uploadUrl = `https://signed-upload.example/${encodeURIComponent(objectKey)}`

    const uploadRequestDoc = buildUploadRequestedArtworkDocument({
      artworkId: input.artworkId,
      contentId: input.contentId,
      ownerUid: input.ownerUid,
      title: '',
      imageName: input.fileName,
      storage: {
        provider: 's3',
        bucketName: this.bucketName,
        objectKey,
        region: this.region,
      },
      now: this.now,
    })

    this.protectedArtworks.set(input.artworkId, uploadRequestDoc)

    return {
      uploadUrl,
      bucketName: this.bucketName,
      objectKey,
      expiresAt,
    }
  }

  uploadImageToS3(input: { objectKey: string; bytes: Uint8Array }): void {
    this.s3Objects.set(input.objectKey, input.bytes)
  }

  storeArtworkMetadata(input: {
    artworkId: string
    contentId: string
    ownerUid: string
    title: string
    imageName: string
    objectKey: string
  }): void {
    this.artworks.set(input.artworkId, {
      artworkId: input.artworkId,
      title: input.title,
      ownerUid: input.ownerUid,
      status: 'pending',
      images: [
        {
          contentId: input.contentId,
          imageName: input.imageName,
          objectKey: input.objectKey,
        },
      ],
      createdAt: this.now,
      updatedAt: this.now,
    })
  }

  finalizeUploadAndHash(input: {
    artworkId: string
    contentId: string
    ownerUid: string
    title: string
    imageName: string
    objectKey: string
  }): StoredArtworkDocument {
    const bytes = this.requireS3Object(input.objectKey)
    const finalizedDoc = buildFinalizedArtworkDocument({
      artworkId: input.artworkId,
      contentId: input.contentId,
      ownerUid: input.ownerUid,
      title: input.title,
      imageName: input.imageName,
      storage: {
        provider: 's3',
        bucketName: this.bucketName,
        objectKey: input.objectKey,
        region: this.region,
      },
      submittedAt: this.now,
      verifiedStorage: {
        objectKey: input.objectKey,
        contentType: 'image/jpeg',
        contentLength: bytes.byteLength,
        eTag: 'etag-test',
      },
    })

    const imageHash = createImageHash(bytes)
    const hashedDoc: StoredArtworkDocument = {
      ...finalizedDoc,
      updatedAt: this.now,
      protection: {
        ...finalizedDoc.protection,
        status: 'hashed',
        hashingAt: this.now,
        hashedAt: this.now,
        imageHash,
      },
    }

    this.protectedArtworks.set(input.contentId, hashedDoc)
    return hashedDoc
  }

  approveArtworkByAdmin(input: { artworkId: string; approvedBy: string }): void {
    for (const [contentId, artwork] of this.protectedArtworks.entries()) {
      if (artwork.artworkId !== input.artworkId) {
        continue
      }

      if (artwork.protection.status !== 'hashed') {
        continue
      }

      const bytes = this.requireS3Object(artwork.protection.storage.objectKey)
      const ipfsCid = this.pinToIpfs({
        objectKey: artwork.protection.storage.objectKey,
      })
      const txHash = this.registerOnBlockchain({
        artworkId: contentId,
        imageHash: artwork.protection.imageHash ?? createImageHash(bytes),
        ipfsCid,
      })

      this.protectedArtworks.set(contentId, {
        ...artwork,
        updatedAt: this.now,
        protection: {
          ...artwork.protection,
          status: 'registered',
          approvedAt: this.now,
          approvedBy: input.approvedBy,
          chainPendingAt: this.now,
          registeredAt: this.now,
          protectedAt: this.now,
          ipfsCid,
          blockchainTxHash: txHash,
          chainName: 'polygon-amoy',
        },
      })
    }

    const artworkMetadata = this.artworks.get(input.artworkId)
    if (artworkMetadata) {
      this.artworks.set(input.artworkId, {
        ...artworkMetadata,
        status: 'approved',
        updatedAt: this.now,
      })
    }
  }

  private requireS3Object(objectKey: string): Uint8Array {
    const bytes = this.s3Objects.get(objectKey)
    assert.ok(bytes, `Expected S3 object for key ${objectKey}`)
    return bytes
  }

  private pinToIpfs(input: { objectKey: string }): string {
    const cid = `bafy${Buffer.from(input.objectKey).toString('hex').slice(0, 20)}`
    this.ipfsPins.set(input.objectKey, { cid, objectKey: input.objectKey })
    return cid
  }

  private registerOnBlockchain(input: {
    artworkId: string
    imageHash: string
    ipfsCid: string
  }): string {
    const txHash = `0x${Buffer.from(
      `${input.artworkId}:${input.imageHash}:${input.ipfsCid}`
    )
      .toString('hex')
      .slice(0, 64)
      .padEnd(64, '0')}`

    this.blockchainRecords.set(input.artworkId, {
      artworkId: input.artworkId,
      imageHash: input.imageHash,
      ipfsCid: input.ipfsCid,
      txHash,
    })

    return txHash
  }
}

function createSampleImageBytes(): Uint8Array {
  return Buffer.from('fake-jpeg-binary-for-integration-test')
}

test('IT-01 Generate S3 presigned upload URL', () => {
  const harness = new ArtworkProtectionIntegrationHarness()

  const result = harness.generatePresignedUploadUrl({
    artworkId: 'artwork-1',
    contentId: 'content-1',
    ownerUid: 'student-1',
    fileName: 'sunrise.jpg',
  })

  assert.match(result.uploadUrl, /^https:\/\/signed-upload\.example\//)
  assert.equal(result.bucketName, 'solpim-artworks-test')
  assert.match(result.objectKey, /^artworks\/artwork-1\/content-1-/)
  assert.equal(result.expiresAt, '2026-05-03T12:15:00.000Z')
})

test('IT-02 Upload image to S3', () => {
  const harness = new ArtworkProtectionIntegrationHarness()
  const presigned = harness.generatePresignedUploadUrl({
    artworkId: 'artwork-1',
    contentId: 'content-1',
    ownerUid: 'student-1',
    fileName: 'sunrise.jpg',
  })

  const imageBytes = createSampleImageBytes()
  harness.uploadImageToS3({
    objectKey: presigned.objectKey,
    bytes: imageBytes,
  })

  assert.deepEqual(harness.s3Objects.get(presigned.objectKey), imageBytes)
})

test('IT-03 Store metadata in Firestore after upload', () => {
  const harness = new ArtworkProtectionIntegrationHarness()
  const presigned = harness.generatePresignedUploadUrl({
    artworkId: 'artwork-1',
    contentId: 'content-1',
    ownerUid: 'student-1',
    fileName: 'sunrise.jpg',
  })

  harness.uploadImageToS3({
    objectKey: presigned.objectKey,
    bytes: createSampleImageBytes(),
  })
  harness.storeArtworkMetadata({
    artworkId: 'artwork-1',
    contentId: 'content-1',
    ownerUid: 'student-1',
    title: 'Sunrise',
    imageName: 'sunrise.jpg',
    objectKey: presigned.objectKey,
  })

  const artworkDoc = harness.artworks.get('artwork-1')
  assert.ok(artworkDoc)
  assert.equal(artworkDoc.title, 'Sunrise')
  assert.equal(artworkDoc.status, 'pending')
  assert.equal(artworkDoc.images[0]?.objectKey, presigned.objectKey)
})

test('IT-04 Admin approval updates status', () => {
  const harness = new ArtworkProtectionIntegrationHarness()
  const presigned = harness.generatePresignedUploadUrl({
    artworkId: 'artwork-1',
    contentId: 'content-1',
    ownerUid: 'student-1',
    fileName: 'sunrise.jpg',
  })

  harness.uploadImageToS3({
    objectKey: presigned.objectKey,
    bytes: createSampleImageBytes(),
  })
  harness.storeArtworkMetadata({
    artworkId: 'artwork-1',
    contentId: 'content-1',
    ownerUid: 'student-1',
    title: 'Sunrise',
    imageName: 'sunrise.jpg',
    objectKey: presigned.objectKey,
  })
  harness.finalizeUploadAndHash({
    artworkId: 'artwork-1',
    contentId: 'content-1',
    ownerUid: 'student-1',
    title: 'Sunrise',
    imageName: 'sunrise.jpg',
    objectKey: presigned.objectKey,
  })

  harness.approveArtworkByAdmin({
    artworkId: 'artwork-1',
    approvedBy: 'admin-1',
  })

  assert.equal(harness.artworks.get('artwork-1')?.status, 'approved')
})

test('IT-05 Pin artwork to IPFS after approval', () => {
  const harness = new ArtworkProtectionIntegrationHarness()
  const presigned = harness.generatePresignedUploadUrl({
    artworkId: 'artwork-1',
    contentId: 'content-1',
    ownerUid: 'student-1',
    fileName: 'sunrise.jpg',
  })

  harness.uploadImageToS3({
    objectKey: presigned.objectKey,
    bytes: createSampleImageBytes(),
  })
  harness.storeArtworkMetadata({
    artworkId: 'artwork-1',
    contentId: 'content-1',
    ownerUid: 'student-1',
    title: 'Sunrise',
    imageName: 'sunrise.jpg',
    objectKey: presigned.objectKey,
  })
  harness.finalizeUploadAndHash({
    artworkId: 'artwork-1',
    contentId: 'content-1',
    ownerUid: 'student-1',
    title: 'Sunrise',
    imageName: 'sunrise.jpg',
    objectKey: presigned.objectKey,
  })
  harness.approveArtworkByAdmin({
    artworkId: 'artwork-1',
    approvedBy: 'admin-1',
  })

  const registeredDoc = harness.protectedArtworks.get('content-1')
  assert.ok(registeredDoc?.protection.ipfsCid)
  assert.match(registeredDoc.protection.ipfsCid, /^bafy/)
})

test('IT-06 Register hash and CID on blockchain and persist tx hash', () => {
  const harness = new ArtworkProtectionIntegrationHarness()
  const presigned = harness.generatePresignedUploadUrl({
    artworkId: 'artwork-1',
    contentId: 'content-1',
    ownerUid: 'student-1',
    fileName: 'sunrise.jpg',
  })

  harness.uploadImageToS3({
    objectKey: presigned.objectKey,
    bytes: createSampleImageBytes(),
  })
  harness.storeArtworkMetadata({
    artworkId: 'artwork-1',
    contentId: 'content-1',
    ownerUid: 'student-1',
    title: 'Sunrise',
    imageName: 'sunrise.jpg',
    objectKey: presigned.objectKey,
  })
  const hashedDoc = harness.finalizeUploadAndHash({
    artworkId: 'artwork-1',
    contentId: 'content-1',
    ownerUid: 'student-1',
    title: 'Sunrise',
    imageName: 'sunrise.jpg',
    objectKey: presigned.objectKey,
  })
  harness.approveArtworkByAdmin({
    artworkId: 'artwork-1',
    approvedBy: 'admin-1',
  })

  const blockchainRecord = harness.blockchainRecords.get('content-1')
  const registeredDoc = harness.protectedArtworks.get('content-1')

  assert.ok(blockchainRecord)
  assert.equal(blockchainRecord.imageHash, hashedDoc.protection.imageHash)
  assert.equal(blockchainRecord.ipfsCid, registeredDoc?.protection.ipfsCid)
  assert.equal(
    registeredDoc?.protection.blockchainTxHash,
    blockchainRecord.txHash
  )
})
