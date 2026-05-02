import { initializeApp } from 'firebase-admin/app'
import { setGlobalOptions } from 'firebase-functions/v2'
import { onRequest } from 'firebase-functions/v2/https'

import { approveArtworkRegistrationHandler } from './handlers/approveArtworkRegistration'
import { createPresignedUploadUrlHandler } from './handlers/createPresignedUploadUrl'
import { finalizeArtworkUploadHandler } from './handlers/finalizeArtworkUpload'
import { getArtworkProtectionStatusHandler } from './handlers/getArtworkProtectionStatus'
import { listPendingArtworkProtectionHandler } from './handlers/listPendingArtworkProtection'
import { uploadFileHandler } from './handlers/uploadFile'

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

export const approveArtworkRegistration = onRequest(
  { region: 'europe-west1', cors: true, maxInstances: 1, invoker: 'public' },
  approveArtworkRegistrationHandler
)

export const getArtworkProtectionStatus = onRequest(
  { region: 'europe-west1', cors: true, maxInstances: 1, invoker: 'public' },
  getArtworkProtectionStatusHandler
)

export const listPendingArtworkProtection = onRequest(
  { region: 'europe-west1', cors: true, maxInstances: 1, invoker: 'public' },
  listPendingArtworkProtectionHandler
)

export const uploadFile = onRequest(
  { region: 'europe-west1', cors: true, maxInstances: 1, invoker: 'public' },
  uploadFileHandler
)
