import { HttpError } from './httpError'
import type { S3StorageReference } from './s3'
import type { FinalizeUploadRequestBody } from './types'

export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const
export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024

export function validateRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${fieldName} is required.`)
  }

  return value.trim()
}

export function getFileExtension(fileName: string): string {
  const trimmedFileName = fileName.trim().toLowerCase()
  const lastDotIndex = trimmedFileName.lastIndexOf('.')

  if (lastDotIndex === -1 || lastDotIndex === trimmedFileName.length - 1) {
    return ''
  }

  return trimmedFileName.slice(lastDotIndex + 1)
}

export function isAllowedImageExtension(fileName: string): boolean {
  const extension = getFileExtension(fileName)
  return ALLOWED_IMAGE_EXTENSIONS.includes(
    extension as (typeof ALLOWED_IMAGE_EXTENSIONS)[number]
  )
}

export function validateImageUploadInput(
  fileName: string,
  fileSizeBytes: number
): void {
  if (!isAllowedImageExtension(fileName)) {
    throw new HttpError(
      400,
      `Unsupported image extension. Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}.`
    )
  }

  if (fileSizeBytes > MAX_IMAGE_FILE_SIZE_BYTES) {
    throw new HttpError(
      400,
      `File size exceeds ${MAX_IMAGE_FILE_SIZE_BYTES} bytes.`
    )
  }
}

export function validateS3StorageReference(
  value: FinalizeUploadRequestBody['storage']
): S3StorageReference {
  if (!value || typeof value !== 'object') {
    throw new HttpError(400, 'storage is required.')
  }

  const provider = validateRequiredString(value.provider, 'storage.provider')
  if (provider !== 's3') {
    throw new HttpError(400, 'storage.provider must be s3.')
  }

  return {
    provider: 's3',
    bucketName: validateRequiredString(value.bucketName, 'storage.bucketName'),
    objectKey: validateRequiredString(value.objectKey, 'storage.objectKey'),
    region: validateRequiredString(value.region, 'storage.region'),
  }
}
