import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'

import { requireRoleFromHeader } from '../shared/auth'
import {
  BlockchainRegistrationError,
  registerProtectionOnChain,
} from '../shared/blockchain'
import { getBlockchainEnvConfig } from '../shared/env'
import {
  HttpRequest,
  HttpResponse,
  handleCommonHttpRequest,
  handleHttpError,
} from '../shared/http'
import { HttpError } from '../shared/httpError'
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

    if (artwork.protection.status === 'chain_pending') {
      response.status(200).json({
        artworkId,
        status: 'chain_pending',
        approvedBy: artwork.protection.approvedBy ?? approvedBy,
      })
      return
    }

    if (artwork.protection.status !== 'pinned') {
      throw new HttpError(
        409,
        `Artwork must be pinned before chain registration. Current status: ${artwork.protection.status}`
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
      status: 'chain_pending',
      approvedBy,
    })

    // Chain registration can be slow and retried; process it asynchronously.
    void runChainRegistrationWorkerAsync({ artworkId })
  } catch (error) {
    handleHttpError(response, error, 'Failed to approve artwork registration')
  }
}

interface ChainRegistrationWorkerParams {
  artworkId: string
}

async function runChainRegistrationWorkerAsync(
  params: ChainRegistrationWorkerParams
): Promise<void> {
  const firestore = getFirestore()
  const docRef = firestore.collection(ARTWORKS_COLLECTION).doc(params.artworkId)

  try {
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
      logger.warn('Skip chain registration: artwork not found', {
        artworkId: params.artworkId,
      })
      return
    }

    const artwork = snapshot.data() as StoredArtworkDocument
    if (artwork.protection.status === 'registered') {
      logger.info('Skip chain registration: already registered', {
        artworkId: params.artworkId,
      })
      return
    }

    if (artwork.protection.status !== 'pinned') {
      logger.info('Skip chain registration: status is not pinned', {
        artworkId: params.artworkId,
        status: artwork.protection.status,
      })
      return
    }

    if (!artwork.protection.imageHash) {
      throw new HttpError(
        409,
        'imageHash is missing; pinning step is incomplete.'
      )
    }

    const chainPendingAt = new Date().toISOString()
    await docRef.update({
      updatedAt: chainPendingAt,
      'protection.status': 'chain_pending',
      'protection.chainPendingAt': chainPendingAt,
      'protection.errorCode': FieldValue.delete(),
      'protection.errorMessage': FieldValue.delete(),
      'protection.failedAt': FieldValue.delete(),
    })

    const ipfsCid = artwork.protection.ipfsCid
    if (!ipfsCid) {
      throw new HttpError(
        409,
        'ipfsCid is missing; pinning step is incomplete.'
      )
    }

    const chainResult = await registerProtectionOnChain({
      artworkId: params.artworkId,
      imageHash: artwork.protection.imageHash,
      ipfsCid,
      env: getBlockchainEnvConfig(),
    })

    const registeredAt = new Date().toISOString()
    await docRef.update({
      updatedAt: registeredAt,
      'protection.status': 'registered',
      'protection.registeredAt': registeredAt,
      'protection.protectedAt': chainResult.protectedAt,
      'protection.blockchainTxHash': chainResult.txHash,
      'protection.chainName': chainResult.chainName,
    })
  } catch (error) {
    const failedAt = new Date().toISOString()
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error.'
    const errorCode =
      error instanceof BlockchainRegistrationError
        ? error.code
        : 'CHAIN_REGISTRATION_ERROR'

    await docRef.update({
      updatedAt: failedAt,
      'protection.status': 'failed',
      'protection.failedAt': failedAt,
      'protection.errorCode': errorCode,
      'protection.errorMessage': errorMessage,
    })

    logger.error('Chain registration worker failed', {
      artworkId: params.artworkId,
      errorCode,
      errorMessage,
    })
  }
}
