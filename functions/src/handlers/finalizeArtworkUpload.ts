import { S3Client } from '@aws-sdk/client-s3'
import { getFirestore } from 'firebase-admin/firestore'

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
    const docRef = firestore.collection(ARTWORKS_COLLECTION).doc(artworkId)

    let effectiveSubmittedAt = submittedAt
    let effectiveCreatedAt = submittedAt

    await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef)

      if (snapshot.exists) {
        const existing = snapshot.data() as Partial<StoredArtworkDocument>
        if (existing.contentId && existing.contentId !== contentId) {
          throw new HttpError(
            409,
            'Different contentId already exists for this artworkId.'
          )
        }

        if (existing.ownerUid && existing.ownerUid !== ownerUid) {
          throw new HttpError(403, 'Artwork owner mismatch.')
        }

        effectiveSubmittedAt =
          typeof existing.submittedAt === 'string'
            ? existing.submittedAt
            : submittedAt
        effectiveCreatedAt = existing.createdAt ?? submittedAt
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
          requestedAt:
            (snapshot.data() as Partial<StoredArtworkDocument> | undefined)
              ?.protection?.requestedAt ?? submittedAt,
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
        submittedAt: effectiveSubmittedAt,
        createdAt: effectiveCreatedAt,
        updatedAt: submittedAt,
      }

      transaction.set(docRef, payload, { merge: true })
    })

    const result: FinalizeUploadResponseBody = {
      artworkId,
      status: 'uploaded',
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
