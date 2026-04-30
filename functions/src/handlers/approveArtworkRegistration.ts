import { S3Client } from '@aws-sdk/client-s3'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { createHash } from 'node:crypto'

import { requireRoleFromHeader } from '../shared/auth'
import {
  BlockchainRegistrationError,
  registerProtectionOnChain,
} from '../shared/blockchain'
import { getBlockchainEnvConfig, getPinataEnvConfig } from '../shared/env'
import {
  HttpRequest,
  HttpResponse,
  handleCommonHttpRequest,
  handleHttpError,
} from '../shared/http'
import { HttpError } from '../shared/httpError'
import { PinataApiError, pinFileToIpfs } from '../shared/pinning'
import {
  getUploadedObjectBytes,
} from '../shared/s3'
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

  try {
    const body = request.body as ApproveArtworkRequestBody
    const artworkId = validateRequiredString(body.artworkId, 'artworkId')
    const { uid: approvedBy } = await requireRoleFromHeader(
      request.header('authorization'),
      ['admin']
    )

    const firestore = getFirestore()
    const docRef = firestore.collection(ARTWORKS_COLLECTION).doc(artworkId)
    const snapshot = await docRef.get()

    if (!snapshot.exists) {
      throw new HttpError(404, 'Artwork not found.')
    }

    const artwork = snapshot.data() as StoredArtworkDocument
    if (artwork.protection.status === 'registered') {
      response.status(200).json({
        artworkId,
        status: 'registered',
        approvedBy: artwork.protection.approvedBy ?? approvedBy,
      })
      return
    }

    if (artwork.protection.status !== 'uploaded') {
      throw new HttpError(
        409,
        `Artwork must be in uploaded status before approval. Current status: ${artwork.protection.status}`
      )
    }

    const now = new Date().toISOString()

    await docRef.update({
      updatedAt: now,
      'protection.approvedAt': now,
      'protection.approvedBy': approvedBy,
      'protection.errorCode': FieldValue.delete(),
      'protection.errorMessage': FieldValue.delete(),
      'protection.failedAt': FieldValue.delete(),
    })

    response.status(200).json({
      artworkId,
      status: 'registered',
      approvedBy,
    })

    // Complete registration (hashing, IPFS pinning, and blockchain registration) asynchronously
    void runCompleteArtworkRegistrationAsync({ artworkId })
  } catch (error) {
    handleHttpError(response, error, 'Failed to approve artwork registration')
  }
}

interface CompleteArtworkRegistrationParams {
  artworkId: string
}

async function runCompleteArtworkRegistrationAsync(
  params: CompleteArtworkRegistrationParams
): Promise<void> {
  const firestore = getFirestore()
  const docRef = firestore.collection(ARTWORKS_COLLECTION).doc(params.artworkId)

  try {
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
      logger.warn('Skip registration: artwork not found', {
        artworkId: params.artworkId,
      })
      return
    }

    const artwork = snapshot.data() as StoredArtworkDocument
    if (artwork.protection.status === 'registered') {
      logger.info('Skip registration: already registered', {
        artworkId: params.artworkId,
      })
      return
    }

    if (artwork.protection.status !== 'uploaded') {
      logger.info('Skip registration: status is not uploaded', {
        artworkId: params.artworkId,
        status: artwork.protection.status,
      })
      return
    }

    // Step 1: Hash the file
    const hashingAt = new Date().toISOString()
    await docRef.update({
      updatedAt: hashingAt,
      'protection.hashingAt': hashingAt,
    })

    const s3Client = new S3Client({ region: artwork.protection.storage.region })
    const objectBytes = await getUploadedObjectBytes(
      s3Client,
      artwork.protection.storage
    )
    const imageHash = createHash('sha256').update(objectBytes).digest('hex')

    // Step 2: Pin to IPFS
    const pinataEnv = getPinataEnvConfig()
    const pinResult = await pinFileToIpfs({
      apiBaseUrl: pinataEnv.apiBaseUrl,
      jwt: pinataEnv.jwt,
      fileBytes: objectBytes,
      fileName: artwork.imageName,
      options: {
        keyValues: {
          artworkId: params.artworkId,
          imageHash,
        },
      },
    })

    const ipfsCid = pinResult.IpfsHash

    // Step 3: Register on blockchain
    const chainResult = await registerProtectionOnChain({
      artworkId: params.artworkId,
      imageHash,
      ipfsCid,
      env: getBlockchainEnvConfig(),
    })

    // Step 4: Update Firestore with all results
    const registeredAt = new Date().toISOString()
    await docRef.update({
      updatedAt: registeredAt,
      'protection.status': 'registered',
      'protection.registeredAt': registeredAt,
      'protection.imageHash': imageHash,
      'protection.ipfsCid': ipfsCid,
      'protection.protectedAt': chainResult.protectedAt,
      'protection.blockchainTxHash': chainResult.txHash,
      'protection.chainName': chainResult.chainName,
    })

    logger.info('Artwork registration completed successfully', {
      artworkId: params.artworkId,
      imageHash,
      ipfsCid,
      txHash: chainResult.txHash,
    })
  } catch (error) {
    const failedAt = new Date().toISOString()
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error.'
    let errorCode = 'REGISTRATION_ERROR'

    if (error instanceof PinataApiError) {
      errorCode = error.code
    } else if (error instanceof BlockchainRegistrationError) {
      errorCode = error.code
    }

    await docRef.update({
      updatedAt: failedAt,
      'protection.status': 'failed',
      'protection.failedAt': failedAt,
      'protection.errorCode': errorCode,
      'protection.errorMessage': errorMessage,
    })

    logger.error('Artwork registration failed', {
      artworkId: params.artworkId,
      errorCode,
      errorMessage,
    })
  }
}
