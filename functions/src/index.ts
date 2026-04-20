import { randomUUID } from 'node:crypto'

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import * as logger from 'firebase-functions/logger'
import { setGlobalOptions } from 'firebase-functions/v2'
import { onRequest } from 'firebase-functions/v2/https'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

initializeApp()
setGlobalOptions({ maxInstances: 1 })

interface PresignedUploadRequestBody {
  fileName?: string
  fileType?: string
  artworkId?: string
  contentId?: string
}

interface PresignedUploadResponseBody {
  uploadUrl: string
  storage: {
    provider: 's3'
    bucketName: string
    objectKey: string
    region: string
  }
  expiresAt: string
}

export const createPresignedUploadUrl = onRequest(
  { region: 'europe-west1', cors: true, maxInstances: 1, invoker: 'public' },
  async (request, response) => {
    response.set('Cache-Control', 'no-store')

    if (request.method === 'OPTIONS') {
      response.status(204).send('')
      return
    }

    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed.' })
      return
    }

    try {
      const body = request.body as PresignedUploadRequestBody
      const fileName = validateRequiredString(body.fileName, 'fileName')
      const fileType = validateRequiredString(body.fileType, 'fileType')
      const artworkId = validateRequiredString(body.artworkId, 'artworkId')
      const contentId = validateRequiredString(body.contentId, 'contentId')

      const authHeader = request.header('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const idToken = authHeader.slice('Bearer '.length)
        await getAuth().verifyIdToken(idToken)
      }

      const bucketName = mustGetEnv('S3_BUCKET_NAME')
      const region = mustGetEnv('AWS_REGION')
      const expiresInSeconds = Number(
        process.env.PRESIGNED_URL_EXPIRES_IN_SECONDS ?? '900'
      )

      const s3Client = new S3Client({ region })
      const objectKey = buildObjectKey(artworkId, contentId, fileName)
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ContentType: fileType,
      })

      const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: expiresInSeconds,
      })

      const expiresAt = new Date(
        Date.now() + expiresInSeconds * 1000
      ).toISOString()
      const payload: PresignedUploadResponseBody = {
        uploadUrl,
        storage: {
          provider: 's3',
          bucketName,
          objectKey,
          region,
        },
        expiresAt,
      }

      response.status(200).json(payload)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error.'
      logger.error('Failed to create presigned upload URL', error)
      response.status(400).json({ error: message })
    }
  }
)

function validateRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required.`)
  }

  return value.trim()
}

function buildObjectKey(
  artworkId: string,
  contentId: string,
  fileName: string,
): string {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `artworks/${artworkId}/${contentId}-${randomUUID()}-${safeFileName}`
}

function mustGetEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}
