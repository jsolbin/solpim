import type { S3StorageReference } from './s3'
import type { StoredArtworkDocument } from './types'

interface VerifiedStorageInput {
  objectKey: string
  contentType: string
  contentLength: number
  eTag?: string | null
}

interface UploadRequestedDocumentInput {
  artworkId: string
  contentId: string
  ownerUid: string
  title: string
  imageName: string
  storage: S3StorageReference
  now: string
}

interface FinalizedDocumentInput {
  artworkId: string
  contentId: string
  ownerUid: string
  title: string
  imageName: string
  storage: S3StorageReference
  submittedAt: string
  verifiedStorage: VerifiedStorageInput
}

function buildVerifiedStorage(input: VerifiedStorageInput) {
  return {
    objectKey: input.objectKey,
    contentType: input.contentType,
    contentLength: input.contentLength,
    eTag: input.eTag ?? null,
  }
}

export function buildUploadRequestedArtworkDocument(
  input: UploadRequestedDocumentInput
): StoredArtworkDocument {
  return {
    artworkId: input.artworkId,
    contentId: input.contentId,
    ownerUid: input.ownerUid,
    title: input.title,
    imageName: input.imageName,
    protection: {
      status: 'upload_requested',
      storage: input.storage,
      requestedAt: input.now,
    },
    storage: input.storage,
    createdAt: input.now,
    updatedAt: input.now,
  }
}

export function buildFinalizedArtworkDocument(
  input: FinalizedDocumentInput
): StoredArtworkDocument {
  const verifiedStorage = buildVerifiedStorage(input.verifiedStorage)

  return {
    artworkId: input.artworkId,
    contentId: input.contentId,
    ownerUid: input.ownerUid,
    title: input.title,
    imageName: input.imageName,
    storage: input.storage,
    protection: {
      status: 'uploaded',
      storage: input.storage,
      requestedAt: input.submittedAt,
      uploadedAt: input.submittedAt,
      verifiedStorage,
    },
    verifiedStorage,
    submittedAt: input.submittedAt,
    createdAt: input.submittedAt,
    updatedAt: input.submittedAt,
  }
}
