import { S3Client } from '@aws-sdk/client-s3'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { createHash } from 'node:crypto'

import { verifyAuthTokenFromHeader } from '../shared/auth'
import { mustGetEnv } from '../shared/env'
import {
  HttpRequest,
  HttpResponse,
  handleCommonHttpRequest,
  handleHttpError,
} from '../shared/http'
import { HttpError } from '../shared/httpError'
import {
  S3StorageReference,
  getUploadedObjectBytes,
  headUploadedObject,
} from '../shared/s3'
import type {
  FinalizeUploadRequestBody,
  FinalizeUploadResponseBody,
  StoredArtworkDocument,
} from '../shared/types'
import { validateRequiredString } from '../shared/validation'

const ARTWORKS_COLLECTION = 'protectedArtworks'

export async function finalizeArtworkUploadHandler(
  request: HttpRequest,
  response: HttpResponse
): Promise<void> {
  if (handleCommonHttpRequest(request, response, 'POST')) {
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

    const firestore = getFirestore()
    const docRef = firestore.collection(ARTWORKS_COLLECTION).doc(contentId)

    await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef)

      if (snapshot.exists) {
        logger.info('Content already finalized', { contentId, artworkId })
        return
      }

      const payload: StoredArtworkDocument = {
        artworkId,
        contentId,
        ownerUid,
        title,
        imageName,
        storage,
        protection: {
          status: 'uploaded',
          storage,
          requestedAt: submittedAt,
          uploadedAt: submittedAt,
          verifiedStorage: {
            objectKey: storage.objectKey,
            contentType,
            contentLength,
            eTag: headResult.ETag ?? null,
          },
        },
        verifiedStorage: {
          objectKey: storage.objectKey,
          contentType,
          contentLength,
          eTag: headResult.ETag ?? null,
        },
        submittedAt,
        createdAt: submittedAt,
        updatedAt: submittedAt,
      }

      transaction.set(docRef, payload)
    })

    const result: FinalizeUploadResponseBody = {
      artworkId,
      status: 'uploaded',
      verifiedStorage: {
        objectKey: storage.objectKey,
        contentType,
        contentLength,
      },
      submittedAt,
    }

    response.status(200).json(result)

    void runHashingPipelineAsync({
      contentId,
      storage,
    })
  } catch (error) {
    handleHttpError(response, error, 'Failed to finalize uploaded artwork')
  }
}

interface HashingPipelineParams {
  contentId: string
  storage: S3StorageReference
}

async function runHashingPipelineAsync(
  params: HashingPipelineParams
): Promise<void> {
  const firestore = getFirestore()
  const docRef = firestore.collection(ARTWORKS_COLLECTION).doc(params.contentId)

  try {
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
      logger.warn('Skip hashing pipeline: artwork not found', {
        contentId: params.contentId,
      })
      return
    }

    const artwork = snapshot.data() as StoredArtworkDocument
    if (artwork.protection.status === 'hashed') {
      logger.info('Skip hashing pipeline: already hashed', {
        contentId: params.contentId,
      })
      return
    }

    if (artwork.protection.status !== 'uploaded') {
      logger.info('Skip hashing pipeline: status is not uploaded', {
        contentId: params.contentId,
        status: artwork.protection.status,
      })
      return
    }

    const hashingAt = new Date().toISOString()
    await docRef.update({
      updatedAt: hashingAt,
      'protection.status': 'hashing',
      'protection.hashingAt': hashingAt,
      'protection.errorCode': FieldValue.delete(),
      'protection.errorMessage': FieldValue.delete(),
      'protection.failedAt': FieldValue.delete(),
    })

    const s3Client = new S3Client({ region: params.storage.region })
    const objectBytes = await getUploadedObjectBytes(s3Client, params.storage)
    const imageHash = createHash('sha256').update(objectBytes).digest('hex')

    const hashedAt = new Date().toISOString()
    await docRef.update({
      updatedAt: hashedAt,
      'protection.status': 'hashed',
      'protection.hashedAt': hashedAt,
      'protection.imageHash': imageHash,
    })
  } catch (error) {
    const failedAt = new Date().toISOString()
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error.'

    await docRef.update({
      updatedAt: failedAt,
      'protection.status': 'failed',
      'protection.failedAt': failedAt,
      'protection.errorCode': 'HASHING_ERROR',
      'protection.errorMessage': errorMessage,
    })

    logger.error('Hashing pipeline failed', {
      contentId: params.contentId,
      errorMessage,
    })
  }
}

function validateStorage(
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
