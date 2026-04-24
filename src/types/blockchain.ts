export type BlockchainProtectionStatus =
  | 'upload_requested'
  | 'uploaded'
  | 'hashing'
  | 'pinned'
  | 'chain_pending'
  | 'registered'
  | 'failed'

export type StorageProvider = 's3'

export interface S3ObjectReference {
  provider: StorageProvider
  bucketName: string
  objectKey: string
  region: string
}

export interface ProtectedArtworkRecord {
  id: string
  title: string
  imageName: string
  contentId?: string
  ownerUid?: string
  createdAt: string
  updatedAt?: string
  protection: BlockchainProtection
}

export interface BlockchainProtection {
  status: BlockchainProtectionStatus
  storage: S3ObjectReference
  requestedAt?: string
  uploadedAt?: string
  approvedAt?: string
  hashingAt?: string
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

export interface PresignedUploadRequest {
  fileName: string
  fileType: string
  artworkId: string
  contentId: string
}

export interface PresignedUploadResponse {
  uploadUrl: string
  storage: S3ObjectReference
  expiresAt: string
}

export interface FinalizeUploadRequest {
  artworkId: string
  contentId: string
  title: string
  imageName: string
  storage: S3ObjectReference
}

export interface FinalizeUploadResponse {
  artworkId: string
  status: 'uploaded'
  verifiedStorage: {
    objectKey: string
    contentType: string
    contentLength: number
  }
  submittedAt: string
}
