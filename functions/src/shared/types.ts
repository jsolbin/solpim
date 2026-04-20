import type { S3StorageReference } from './s3'

export interface PresignedUploadRequestBody {
  fileName?: string
  fileType?: string
  artworkId?: string
  contentId?: string
}

export interface PresignedUploadResponseBody {
  uploadUrl: string
  storage: S3StorageReference
  expiresAt: string
}

export interface FinalizeUploadRequestBody {
  artworkId?: string
  contentId?: string
  title?: string
  imageName?: string
  storage?: {
    provider?: string
    bucketName?: string
    objectKey?: string
    region?: string
  }
}

export interface FinalizeUploadResponseBody {
  artworkId: string
  status: 'uploaded'
  verifiedStorage: {
    objectKey: string
    contentType: string
    contentLength: number
  }
  submittedAt: string
}

export interface StoredArtworkDocument {
  artworkId: string
  contentId?: string
  ownerUid?: string
  title: string
  imageName: string
  protection: {
    status:
      | 'upload_requested'
      | 'uploaded'
      | 'hashing'
      | 'pinned'
      | 'chain_pending'
      | 'registered'
      | 'failed'
    storage: S3StorageReference
    requestedAt?: string
    uploadedAt?: string
    approvedAt?: string
    hashingAt?: string
    pinnedAt?: string
    chainPendingAt?: string
    registeredAt?: string
    failedAt?: string
    approvedBy?: string
    imageHash?: string
    ipfsCid?: string
    blockchainTxHash?: string
    chainName?: string
    errorMessage?: string
    verifiedStorage?: {
      objectKey: string
      contentType: string
      contentLength: number
      eTag?: string | null
    }
  }
  storage: S3StorageReference
  verifiedStorage?: {
    objectKey: string
    contentType: string
    contentLength: number
    eTag?: string | null
  }
  submittedAt?: string
  createdAt: string
  updatedAt: string
}
