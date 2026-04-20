export type BlockchainProtectionStatus = 'pending' | 'registered' | 'failed'

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
  createdAt: string
  protection: BlockchainProtection
}

export interface BlockchainProtection {
  imageHash: string
  storage: S3ObjectReference
  ipfsCid?: string
  status: BlockchainProtectionStatus
  blockchainTxHash?: string
  chainName?: string
  protectedAt?: string
  errorMessage?: string
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
  status: 'submitted'
  verifiedStorage: {
    objectKey: string
    contentType: string
    contentLength: number
  }
  submittedAt: string
}
