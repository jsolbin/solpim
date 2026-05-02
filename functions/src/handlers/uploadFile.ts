import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getFirestore } from 'firebase-admin/firestore'

import { verifyAuthTokenFromHeader } from '../shared/auth'
import { mustGetEnv } from '../shared/env'
import type { HttpRequest, HttpResponse } from '../shared/http'
import { handleCommonHttpRequest, handleHttpError } from '../shared/http'
import { HttpError } from '../shared/httpError'
import { buildObjectKey } from '../shared/s3'
import type { PresignedUploadResponseBody } from '../shared/types'
import { validateRequiredString } from '../shared/validation'

interface UploadFileRequestBody {
  artworkId?: string
  contentId?: string
  fileName?: string
  fileType?: string
  fileBase64?: string
}

export async function uploadFileHandler(
  request: HttpRequest,
  response: HttpResponse
): Promise<void> {
  if (handleCommonHttpRequest(request, response, 'POST')) {
    return
  }

  try {
    await verifyAuthTokenFromHeader(request.header('authorization'), true)

    const body = request.body as UploadFileRequestBody
    const artworkId = validateRequiredString(body.artworkId, 'artworkId')
    const contentId = validateRequiredString(body.contentId, 'contentId')
    const fileName = validateRequiredString(body.fileName, 'fileName')
    const fileType = validateRequiredString(body.fileType, 'fileType')
    const fileBase64 = validateRequiredString(body.fileBase64, 'fileBase64')

    const buffer = Buffer.from(fileBase64, 'base64')

    if (buffer.length === 0) {
      throw new HttpError(400, 'File body is required.')
    }

    const bucketName = mustGetEnv('S3_BUCKET_NAME')
    const region = mustGetEnv('AWS_REGION')

    const s3Client = new S3Client({ region })
    const objectKey = buildObjectKey(artworkId, contentId, fileName)

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: fileType,
      Body: buffer,
    })

    await s3Client.send(command)

    const firestore = getFirestore()
    const docRef = firestore.collection('protectedArtworks').doc(artworkId)
    const now = new Date().toISOString()

    await docRef.set(
      {
        protection: {
          status: 'uploaded',
          storage: {
            provider: 's3',
            bucketName,
            objectKey,
            region,
          },
          uploadedAt: now,
          verifiedStorage: {
            objectKey,
            contentLength: buffer.length,
            contentType: fileType,
            eTag: 'pending',
          },
        },
        updatedAt: now,
      },
      { merge: true }
    )

    const payload: PresignedUploadResponseBody = {
      uploadUrl: '',
      storage: {
        provider: 's3',
        bucketName,
        objectKey,
        region,
      },
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    }

    response.status(200).json(payload)
  } catch (error) {
    handleHttpError(response, error, 'uploadFileHandler failed')
  }
}
