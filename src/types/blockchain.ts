export type BlockchainProtectionStatus =
  | 'pending'
  | 'registered'
  | 'failed'

export type StorageProvider = 's3'

export interface S3ObjectReference {
  provider: StorageProvider
  bucketName: string
  objectKey: string
  region?: string
}

export interface BlockchainProtection {
  imageHash: string
  storage: S3ObjectReference
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
