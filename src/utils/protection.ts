import type {
  BlockchainProtection,
  FinalizeUploadRequest,
  FinalizeUploadResponse,
  PresignedUploadRequest,
  PresignedUploadResponse,
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

export async function requestPresignedUpload(options: {
  payload: PresignedUploadRequest
  authToken?: string
}): Promise<PresignedUploadResponse> {
  const { payload, authToken } = options
  const endpoint = import.meta.env.VITE_PRESIGNED_UPLOAD_ENDPOINT

  if (!endpoint) {
    throw new Error(
      'Missing VITE_PRESIGNED_UPLOAD_ENDPOINT. Set your presigned upload API endpoint in environment variables.'
    )
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await buildHttpErrorMessage(response))
  }

  return (await response.json()) as PresignedUploadResponse
}

export async function uploadFileToPresignedUrl(options: {
  uploadUrl: string
  file: File
}): Promise<void> {
  const { uploadUrl, file } = options

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  })

  if (!response.ok) {
    const errorText = await response.text()
    const detail = errorText ? ` Response: ${errorText}` : ''
    throw new Error(`S3 upload failed with status ${response.status}.${detail}`)
  }
}

export async function requestFinalizeUpload(options: {
  payload: FinalizeUploadRequest
  authToken: string
}): Promise<FinalizeUploadResponse> {
  const { payload, authToken } = options
  const endpoint = import.meta.env.VITE_FINALIZE_UPLOAD_ENDPOINT

  if (!endpoint) {
    throw new Error(
      'Missing VITE_FINALIZE_UPLOAD_ENDPOINT. Set your finalize upload API endpoint in environment variables.'
    )
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await buildHttpErrorMessage(response))
  }

  return (await response.json()) as FinalizeUploadResponse
}

export async function generateImageHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)

  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
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

async function buildHttpErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      message?: string
      error?: string
    }

    const message = body.message || body.error
    if (message) {
      return message
    }
  } catch {
    // Ignore body parsing errors and fallback to generic message
  }

  return `Request failed with status ${response.status}.`
}
