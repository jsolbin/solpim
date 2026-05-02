import type {
  FinalizeUploadRequest,
  FinalizeUploadResponse,
  PresignedUploadRequest,
  PresignedUploadResponse,
  ProtectedArtworkRecord,
} from '@/types/blockchain'

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

export async function uploadFileDirectly(options: {
  file: File
  artworkId: string
  contentId: string
  authToken: string
}): Promise<PresignedUploadResponse> {
  const { file, artworkId, contentId, authToken } = options
  const endpoint = import.meta.env.VITE_UPLOAD_FILE_ENDPOINT

  if (!endpoint) {
    throw new Error(
      'Missing VITE_UPLOAD_FILE_ENDPOINT. Set your direct file upload API endpoint in environment variables.'
    )
  }

  // Convert file to Base64
  const fileBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      artworkId,
      contentId,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileBase64,
    }),
  })

  if (!response.ok) {
    throw new Error(await buildHttpErrorMessage(response))
  }

  return (await response.json()) as PresignedUploadResponse
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

export async function requestApproveArtworkRegistration(options: {
  artworkId: string
  authToken: string
}): Promise<{
  artworkId: string
  status: 'chain_pending' | 'registered'
  approvedBy: string
}> {
  const { artworkId, authToken } = options
  const endpoint = import.meta.env.VITE_APPROVE_ARTWORK_ENDPOINT

  if (!endpoint) {
    throw new Error(
      'Missing VITE_APPROVE_ARTWORK_ENDPOINT. Set your admin approval API endpoint in environment variables.'
    )
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ artworkId }),
  })

  if (!response.ok) {
    throw new Error(await buildHttpErrorMessage(response))
  }

  return (await response.json()) as {
    artworkId: string
    status: 'chain_pending' | 'registered'
    approvedBy: string
  }
}

export async function requestProtectedArtworkStatus(options: {
  artworkId: string
}): Promise<ProtectedArtworkRecord | null> {
  const endpoint = import.meta.env.VITE_PROTECTION_STATUS_ENDPOINT

  if (!endpoint) {
    throw new Error(
      'Missing VITE_PROTECTION_STATUS_ENDPOINT. Set your protection status API endpoint in environment variables.'
    )
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ artworkId: options.artworkId }),
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(await buildHttpErrorMessage(response))
  }

  return (await response.json()) as ProtectedArtworkRecord
}

export async function requestPendingProtectedArtworks(): Promise<
  ProtectedArtworkRecord[]
> {
  const endpoint = import.meta.env.VITE_PENDING_ARTWORKS_ENDPOINT

  if (!endpoint) {
    throw new Error(
      'Missing VITE_PENDING_ARTWORKS_ENDPOINT. Set your pending artworks API endpoint in environment variables.'
    )
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })

  if (!response.ok) {
    throw new Error(await buildHttpErrorMessage(response))
  }

  const payload = (await response.json()) as {
    items?: ProtectedArtworkRecord[]
  }

  return payload.items ?? []
}

async function buildHttpErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      message?: string
      error?: string
      code?: string | null
    }

    const message = body.message || body.error
    if (message) {
      return body.code ? `${message} (${body.code})` : message
    }
  } catch {
    // Ignore body parsing errors and fallback to generic message
  }

  return `Request failed with status ${response.status}.`
}
