import type {
  PinataPinFileRequestOptions,
  PinataPinFileResponseBody,
} from './types'

export interface PinataPinFileParams {
  apiBaseUrl: string
  jwt: string
  fileBytes: Uint8Array
  fileName: string
  options?: PinataPinFileRequestOptions
}

export class PinataApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number
  ) {
    super(message)
  }
}

export async function pinFileToIpfs(
  params: PinataPinFileParams
): Promise<PinataPinFileResponseBody> {
  const formData = new FormData()
  const safeFileName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const blob = new Blob([Buffer.from(params.fileBytes)], {
    type: 'application/octet-stream',
  })
  formData.append('file', blob, safeFileName)

  const keyValues = params.options?.keyValues
  if (params.options?.fileName || keyValues) {
    formData.append(
      'pinataMetadata',
      JSON.stringify({
        name: params.options?.fileName ?? safeFileName,
        keyvalues: keyValues,
      })
    )
  }

  if (params.options?.groupId) {
    formData.append(
      'pinataOptions',
      JSON.stringify({ groupId: params.options.groupId })
    )
  }

  const url = `${params.apiBaseUrl.replace(/\/$/, '')}/pinning/pinFileToIPFS`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.jwt}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const detail = await parsePinataErrorPayload(response)
    throw new PinataApiError(detail.code, detail.message, response.status)
  }

  return (await response.json()) as PinataPinFileResponseBody
}

async function parsePinataErrorPayload(
  response: Response
): Promise<{ code: string; message: string }> {
  try {
    const body = (await response.json()) as {
      error?: string | { reason?: string; details?: string }
      reason?: string
      message?: string
    }

    const errorReason =
      typeof body.error === 'string'
        ? body.error
        : (body.error?.reason ?? body.error?.details)

    const reason = body.reason ?? body.message ?? errorReason

    return {
      code: `PINATA_${response.status}`,
      message: reason ?? `Pinata request failed with ${response.status}`,
    }
  } catch {
    return {
      code: `PINATA_${response.status}`,
      message: `Pinata request failed with ${response.status}`,
    }
  }
}
