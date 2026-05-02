import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { mustGetEnv } from '../shared/env'
import {
  HttpRequest,
  HttpResponse,
  handleCommonHttpRequest,
  handleHttpError,
} from '../shared/http'
import { validateRequiredString } from '../shared/validation'

interface PresignedDownloadRequestBody {
  bucketName?: string
  objectKey?: string
  expiresInSeconds?: number
}

export async function createPresignedDownloadUrlHandler(
  request: HttpRequest,
  response: HttpResponse
): Promise<void> {
  if (handleCommonHttpRequest(request, response, 'POST')) {
    return
  }

  try {
    const body = request.body as PresignedDownloadRequestBody
    const bucketName = validateRequiredString(body.bucketName, 'bucketName')
    const objectKey = validateRequiredString(body.objectKey, 'objectKey')
    const expiresInSeconds = Number(body.expiresInSeconds ?? 300)

    const region = mustGetEnv('AWS_REGION')

    const s3Client = new S3Client({ region })
    const command = new GetObjectCommand({ Bucket: bucketName, Key: objectKey })

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: expiresInSeconds,
    })

    response
      .status(200)
      .json({
        url,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      })
  } catch (error) {
    handleHttpError(response, error, 'Failed to create presigned download URL')
  }
}
