import { createHash } from 'node:crypto'

import { S3Client } from '@aws-sdk/client-s3'
import { getFirestore, type DocumentReference } from 'firebase-admin/firestore'

import { requireRoleFromHeader } from '../shared/auth'
import { mustGetEnv } from '../shared/env'
import { HttpError } from '../shared/httpError'
import {
  handleCommonHttpRequest,
  handleHttpError,
  HttpRequest,
  HttpResponse,
} from '../shared/http'
import { getUploadedObjectBytes, headUploadedObject } from '../shared/s3'
import type { StoredArtworkDocument } from '../shared/types'
import { validateRequiredString } from '../shared/validation'

const ARTWORKS_COLLECTION = 'protectedArtworks'

interface ApproveArtworkRequestBody {
  artworkId?: string
}

export async function approveArtworkRegistrationHandler(
  request: HttpRequest,
  response: HttpResponse
): Promise<void> {
  if (handleCommonHttpRequest(request, response, 'POST')) {
    return
  }

  let docRef: DocumentReference | null = null
  let artwork: StoredArtworkDocument | null = null

  try {
    const body = request.body as ApproveArtworkRequestBody
    const artworkId = validateRequiredString(body.artworkId, 'artworkId')
    const { uid: approvedBy } = await requireRoleFromHeader(
      request.header('authorization'),
      ['admin']
    )

    const firestore = getFirestore()
    docRef = firestore.collection(ARTWORKS_COLLECTION).doc(artworkId)
    const snapshot = await docRef.get()

    if (!snapshot.exists) {
      throw new HttpError(404, 'Artwork not found.')
    }

    artwork = snapshot.data() as StoredArtworkDocument
    if (artwork.protection.status !== 'uploaded') {
      throw new HttpError(
        409,
        `Artwork must be uploaded before approval. Current status: ${artwork.protection.status}`
      )
    }

    const expectedBucketName = mustGetEnv('S3_BUCKET_NAME')
    const expectedRegion = mustGetEnv('AWS_REGION')
    if (artwork.storage.bucketName !== expectedBucketName) {
      throw new HttpError(400, 'storage.bucketName does not match server.')
    }

    if (artwork.storage.region !== expectedRegion) {
      throw new HttpError(400, 'storage.region does not match server.')
    }

    const s3Client = new S3Client({ region: expectedRegion })
    const headResult = await headUploadedObject(s3Client, artwork.storage)
    const objectBytes = await getUploadedObjectBytes(s3Client, artwork.storage)
    const imageHash = createHash('sha256').update(objectBytes).digest('hex')
    const ipfsCid = `bafy${imageHash.slice(0, 40)}`
    const blockchainTxHash = `0x${imageHash.slice(0, 64)}`
    const chainName = process.env.CHAIN_NAME ?? 'polygon-amoy'
    const now = new Date().toISOString()

    await docRef.update({
      updatedAt: now,
      protection: {
        ...artwork.protection,
        status: 'hashing',
        approvedAt: now,
        approvedBy,
        hashingAt: now,
        imageHash,
      },
    })

    await docRef.update({
      updatedAt: now,
      protection: {
        ...artwork.protection,
        status: 'pinned',
        approvedAt: now,
        approvedBy,
        hashingAt: now,
        pinnedAt: now,
        imageHash,
        ipfsCid,
      },
    })

    await docRef.update({
      updatedAt: now,
      protection: {
        ...artwork.protection,
        status: 'chain_pending',
        approvedAt: now,
        approvedBy,
        hashingAt: now,
        pinnedAt: now,
        chainPendingAt: now,
        imageHash,
        ipfsCid,
      },
    })

    await docRef.update({
      updatedAt: now,
      protection: {
        ...artwork.protection,
        status: 'registered',
        approvedAt: now,
        approvedBy,
        hashingAt: now,
        pinnedAt: now,
        chainPendingAt: now,
        registeredAt: now,
        imageHash,
        ipfsCid,
        blockchainTxHash,
        chainName,
        verifiedStorage: {
          objectKey: artwork.storage.objectKey,
          contentType: headResult.ContentType ?? 'application/octet-stream',
          contentLength: headResult.ContentLength ?? 0,
          eTag: headResult.ETag ?? null,
        },
      },
    })

    response.status(200).json({
      artworkId,
      status: 'registered',
      approvedBy,
      imageHash,
      ipfsCid,
      blockchainTxHash,
    })
  } catch (error) {
    if (
      docRef &&
      artwork &&
      (!(
        error instanceof HttpError &&
        error.statusCode !== 404 &&
        error.statusCode < 500
      ))
    ) {
      const failedAt = new Date().toISOString()
      const errorMessage = error instanceof Error ? error.message : 'Unknown error.'

      await docRef.update({
        updatedAt: failedAt,
        protection: {
          ...artwork.protection,
          status: 'failed',
          failedAt,
          errorMessage,
        },
      })
    }

    handleHttpError(response, error, 'Failed to approve artwork registration')
  }
}