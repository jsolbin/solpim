import type {
  BlockchainProtection,
  S3ObjectReference,
} from '@/types/blockchain'

const STORAGE_KEY = 'solpim-protected-artworks'

export interface ProtectedArtworkRecord {
  id: string
  title: string
  imageName: string
  createdAt: string
  protection: BlockchainProtection
}

interface StoredRecords {
  [id: string]: ProtectedArtworkRecord
}

export async function generateImageHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)

  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

export function createMockStorageReference(
  artworkId: string,
  fileName: string
): S3ObjectReference {
  return {
    provider: 's3',
    bucketName: 'solpim-artworks-dev',
    objectKey: `artworks/${artworkId}/${Date.now()}-${fileName}`,
    region: 'ap-northeast-2',
  }
}

export function createMockIpfsCid(imageHash: string): string {
  return `bafy${imageHash.slice(0, 40)}`
}

export async function registerArtworkProtectionMock(options: {
  imageHash: string
  ipfsCid?: string
  shouldFail?: boolean
}): Promise<
  Pick<
    BlockchainProtection,
    'status' | 'blockchainTxHash' | 'chainName' | 'protectedAt'
  >
> {
  const { imageHash, ipfsCid, shouldFail = false } = options

  await new Promise((resolve) => setTimeout(resolve, 700))

  if (shouldFail) {
    throw new Error('Mock blockchain registration failed.')
  }

  const now = new Date().toISOString()
  const txSuffix = imageHash.slice(0, 8)
  const cidSuffix = ipfsCid?.slice(0, 6) ?? 'nocid0'

  return {
    status: 'registered',
    blockchainTxHash: `0xmock${txSuffix}${cidSuffix}${Date.now().toString(16)}`,
    chainName: 'polygon-amoy',
    protectedAt: now,
  }
}

export function saveProtectedArtwork(record: ProtectedArtworkRecord): void {
  const records = readStoredRecords()
  records[record.id] = record
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function getProtectedArtworkById(
  id: string
): ProtectedArtworkRecord | null {
  const records = readStoredRecords()
  return records[id] ?? null
}

function readStoredRecords(): StoredRecords {
  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return {}
  }

  try {
    return JSON.parse(raw) as StoredRecords
  } catch {
    return {}
  }
}
