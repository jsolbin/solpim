import { initializeApp } from 'firebase-admin/app'
import { setGlobalOptions } from 'firebase-functions/v2'
import { onRequest } from 'firebase-functions/v2/https'
import { createPresignedUploadUrlHandler } from './handlers/createPresignedUploadUrl'
import { finalizeArtworkUploadHandler } from './handlers/finalizeArtworkUpload'

initializeApp()
setGlobalOptions({ maxInstances: 1 })

export const createPresignedUploadUrl = onRequest(
  { region: 'europe-west1', cors: true, maxInstances: 1, invoker: 'public' },
  createPresignedUploadUrlHandler
)

export const finalizeArtworkUpload = onRequest(
  { region: 'europe-west1', cors: true, maxInstances: 1, invoker: 'public' },
  finalizeArtworkUploadHandler
)
