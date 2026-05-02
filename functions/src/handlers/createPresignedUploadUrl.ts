import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getFirestore } from 'firebase-admin/firestore'

import { verifyAuthTokenFromHeader } from '../shared/auth'
import { mustGetEnv } from '../shared/env'
import {
  handleCommonHttpRequest,
  handleHttpError,
  HttpRequest,
  HttpResponse,
} from '../shared/http'
import { buildObjectKey } from '../shared/s3'
import { buildUploadRequestedArtworkDocument } from '../shared/protectedArtwork'
import type {
  PresignedUploadRequestBody,
  PresignedUploadResponseBody,
} from '../shared/types'
import {
  validateImageUploadInput,
  validateRequiredString,
} from '../shared/validation'

export async function createPresignedUploadUrlHandler(
  request: HttpRequest,
  response: HttpResponse
): Promise<void> {
  if (handleCommonHttpRequest(request, response, 'POST')) {
    return
  }

  try {
    const body = request.body as PresignedUploadRequestBody
    const fileName = validateRequiredString(body.fileName, 'fileName')
    const fileType = validateRequiredString(body.fileType, 'fileType')
    const artworkId = validateRequiredString(body.artworkId, 'artworkId')
    const contentId = validateRequiredString(body.contentId, 'contentId')
    validateImageUploadInput(fileName, 0)

    const ownerUid = await verifyAuthTokenFromHeader(
      request.header('authorization'),
      true
    )

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

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

    const firestore = getFirestore()
    const docRef = firestore.collection('protectedArtworks').doc(artworkId)
    const now = new Date().toISOString()
    const storage = {
      provider: 's3' as const,
      bucketName,
      objectKey,
      region,
    }
    const storedArtwork = buildUploadRequestedArtworkDocument({
      artworkId,
      contentId,
      ownerUid,
      title: '',
      imageName: fileName,
      storage,
      now,
    })

    await docRef.set(storedArtwork, { merge: true })

    const payload: PresignedUploadResponseBody = {
      uploadUrl,
      storage,
      expiresAt,
    }

    response.status(200).json(payload)
  } catch (error) {
    handleHttpError(response, error, 'Failed to create presigned upload URL')
  }
}
