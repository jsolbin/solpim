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

export interface PinArtworkRequestBody {
  artworkId?: string
}

export interface PinArtworkResponseBody {
  artworkId: string
  status: 'pinned' | 'chain_pending' | 'failed'
  ipfsCid?: string
  errorCode?: string
  updatedAt: string
}

export interface PinataPinFileRequestOptions {
  fileName?: string
  groupId?: string
  keyValues?: Record<string, string>
}

export interface PinataPinFileResponseBody {
  IpfsHash: string
  PinSize: number
  Timestamp: string
  isDuplicate?: boolean
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
      | 'hashed'
      | 'pinned'
      | 'chain_pending'
      | 'registered'
      | 'failed'
    storage: S3StorageReference
    requestedAt?: string
    uploadedAt?: string
    approvedAt?: string
    hashingAt?: string
    hashedAt?: string
    pinnedAt?: string
    chainPendingAt?: string
    registeredAt?: string
    protectedAt?: string
    failedAt?: string
    approvedBy?: string
    imageHash?: string
    ipfsCid?: string
    blockchainTxHash?: string
    chainName?: string
    errorCode?: string
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
