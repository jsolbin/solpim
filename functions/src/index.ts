import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { setGlobalOptions } from 'firebase-functions/v2'
import { onRequest } from 'firebase-functions/v2/https'
import { randomUUID } from 'node:crypto'

initializeApp()
setGlobalOptions({ maxInstances: 1 })

const ARTWORKS_COLLECTION = 'protectedArtworks'

class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message)
  }
}

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

interface FinalizeUploadRequestBody {
  artworkId?: string
  contentId?: string
  title?: string
  imageName?: string
  storage?: {
    provider?: string
    bucketName?: string
    objectKey?: string
    region?: string
  }
}

interface FinalizeUploadResponseBody {
  artworkId: string
  status: 'submitted'
  verifiedStorage: {
    objectKey: string
    contentType: string
    contentLength: number
  }
  submittedAt: string
}

interface StoredArtworkDocument {
  artworkId: string
  contentId: string
  ownerUid: string
  title: string
  imageName: string
  status: 'submitted'
  storage: {
    provider: 's3'
    bucketName: string
    objectKey: string
    region: string
  }
  verifiedStorage: {
    objectKey: string
    contentType: string
    contentLength: number
    eTag: string | null
  }
  submittedAt: string
  createdAt: string
  updatedAt: string
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

      await verifyAuthTokenFromHeader(request.header('authorization'), false)

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
      handleHttpError(response, error, 'Failed to create presigned upload URL')
    }
  }
)

export const finalizeArtworkUpload = onRequest(
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
      const body = request.body as FinalizeUploadRequestBody
      const artworkId = validateRequiredString(body.artworkId, 'artworkId')
      const contentId = validateRequiredString(body.contentId, 'contentId')
      const title = validateRequiredString(body.title, 'title')
      const imageName = validateRequiredString(body.imageName, 'imageName')
      const storage = validateStorage(body.storage)

      const ownerUid = await verifyAuthTokenFromHeader(
        request.header('authorization'),
        true
      )

      const expectedBucketName = mustGetEnv('S3_BUCKET_NAME')
      const expectedRegion = mustGetEnv('AWS_REGION')
      if (storage.bucketName !== expectedBucketName) {
        throw new HttpError(400, 'storage.bucketName does not match server.')
      }

      if (storage.region !== expectedRegion) {
        throw new HttpError(400, 'storage.region does not match server.')
      }

      const s3Client = new S3Client({ region: expectedRegion })
      const headResult = await headUploadedObject(s3Client, storage)

      const contentType = headResult.ContentType ?? 'application/octet-stream'
      const contentLength = headResult.ContentLength ?? 0
      const submittedAt = new Date().toISOString()

      const docRef = getFirestore()
        .collection(ARTWORKS_COLLECTION)
        .doc(artworkId)

      let effectiveSubmittedAt = submittedAt

      await getFirestore().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(docRef)

        if (snapshot.exists) {
          const existing = snapshot.data() as Partial<StoredArtworkDocument>
          if (existing.contentId && existing.contentId !== contentId) {
            throw new HttpError(
              409,
              'Different contentId already exists for this artworkId.'
            )
          }

          effectiveSubmittedAt =
            typeof existing.submittedAt === 'string'
              ? existing.submittedAt
              : submittedAt
        }

        const payload: StoredArtworkDocument = {
          artworkId,
          contentId,
          ownerUid,
          title,
          imageName,
          status: 'submitted',
          storage,
          verifiedStorage: {
            objectKey: storage.objectKey,
            contentType,
            contentLength,
            eTag: headResult.ETag ?? null,
          },
          submittedAt: effectiveSubmittedAt,
          createdAt: snapshot.exists
            ? ((snapshot.data()?.createdAt as string | undefined) ??
              submittedAt)
            : submittedAt,
          updatedAt: submittedAt,
        }

        transaction.set(docRef, payload, { merge: true })
      })

      const result: FinalizeUploadResponseBody = {
        artworkId,
        status: 'submitted',
        verifiedStorage: {
          objectKey: storage.objectKey,
          contentType,
          contentLength,
        },
        submittedAt: effectiveSubmittedAt,
      }

      response.status(200).json(result)
    } catch (error) {
      handleHttpError(response, error, 'Failed to finalize uploaded artwork')
    }
  }
)

function validateRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${fieldName} is required.`)
  }

  return value.trim()
}

function validateStorage(value: FinalizeUploadRequestBody['storage']): {
  provider: 's3'
  bucketName: string
  objectKey: string
  region: string
} {
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

async function verifyAuthTokenFromHeader(
  authorizationHeader: string | undefined,
  required: boolean
): Promise<string> {
  if (!authorizationHeader) {
    if (required) {
      throw new HttpError(401, 'Missing Authorization header.')
    }
    return ''
  }

  if (!authorizationHeader.startsWith('Bearer ')) {
    throw new HttpError(401, 'Invalid Authorization header format.')
  }

  const idToken = authorizationHeader.slice('Bearer '.length)
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken)
    return decodedToken.uid
  } catch {
    throw new HttpError(401, 'Invalid or expired auth token.')
  }
}

async function headUploadedObject(
  s3Client: S3Client,
  storage: {
    bucketName: string
    objectKey: string
  }
) {
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

function handleHttpError(
  response: { status: (code: number) => { json: (payload: object) => void } },
  error: unknown,
  logMessage: string
): void {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({ error: error.message })
    return
  }

  const message = error instanceof Error ? error.message : 'Unknown error.'
  logger.error(logMessage, error)
  response.status(500).json({ error: message })
}

function buildObjectKey(
  artworkId: string,
  contentId: string,
  fileName: string
): string {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `artworks/${artworkId}/${contentId}-${randomUUID()}-${safeFileName}`
}

function mustGetEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new HttpError(500, `Missing required environment variable: ${name}`)
  }

  return value
}
