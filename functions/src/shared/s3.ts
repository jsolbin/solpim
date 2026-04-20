import {
  GetObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  S3Client,
} from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'

import { HttpError } from './httpError'

export interface S3StorageReference {
  provider: 's3'
  bucketName: string
  objectKey: string
  region: string
}

export function buildObjectKey(
  artworkId: string,
  contentId: string,
  fileName: string
): string {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `artworks/${artworkId}/${contentId}-${randomUUID()}-${safeFileName}`
}

export async function headUploadedObject(
  s3Client: S3Client,
  storage: Pick<S3StorageReference, 'bucketName' | 'objectKey'>
): Promise<HeadObjectCommandOutput> {
  try {
    return await s3Client.send(
      new HeadObjectCommand({
        Bucket: storage.bucketName,
        Key: storage.objectKey,
      })
    )
  } catch (error) {
    if (isS3NotFoundError(error)) {
      throw new HttpError(404, 'Uploaded file not found in S3.')
    }

    throw error
  }
}

export async function getUploadedObjectBytes(
  s3Client: S3Client,
  storage: Pick<S3StorageReference, 'bucketName' | 'objectKey'>
): Promise<Uint8Array> {
  const result = await s3Client.send(
    new GetObjectCommand({
      Bucket: storage.bucketName,
      Key: storage.objectKey,
    })
  )

  const body = result.Body as
    | {
        transformToByteArray?: () => Promise<Uint8Array>
      }
    | undefined

  if (!body || typeof body.transformToByteArray !== 'function') {
    throw new HttpError(500, 'Unable to read uploaded S3 object body.')
  }

  return await body.transformToByteArray()
}

function isS3NotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const parsed = error as {
    name?: string
    Code?: string
    $metadata?: { httpStatusCode?: number }
  }

  return (
    parsed.name === 'NotFound' ||
    parsed.Code === 'NotFound' ||
    parsed.Code === 'NoSuchKey' ||
    parsed.$metadata?.httpStatusCode === 404
  )
}
