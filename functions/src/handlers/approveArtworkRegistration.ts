import { S3Client } from '@aws-sdk/client-s3'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'

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
import { getUploadedObjectBytes } from '../shared/s3'
import type { StoredArtworkDocument } from '../shared/types'

const ARTWORKS_COLLECTION = 'protectedArtworks'

interface ApproveArtworkRequestBody {
  artworkId?: string
  contentId?: string
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
    const artworkId = body.artworkId?.trim()
    const { uid: approvedBy } = await requireRoleFromHeader(
      request.header('authorization'),
      ['admin']
    )

    if (!artworkId) {
      throw new HttpError(400, 'artworkId is required.')
    }

    const firestore = getFirestore()

    const snapshots = await firestore
      .collection(ARTWORKS_COLLECTION)
      .where('artworkId', '==', artworkId)
      .where('protection.status', '==', 'hashed')
      .get()

    if (snapshots.empty) {
      throw new HttpError(
        404,
        'No pending images found for this artwork. They may already be approved or no longer in hashed status.'
      )
    }

    const now = new Date().toISOString()

    const updatePromises = snapshots.docs.map((doc) =>
      doc.ref.update({
        updatedAt: now,
        'protection.approvedAt': now,
        'protection.approvedBy': approvedBy,
        'protection.errorCode': FieldValue.delete(),
        'protection.errorMessage': FieldValue.delete(),
        'protection.failedAt': FieldValue.delete(),
      })
    )

    await Promise.all(updatePromises)

    response.status(200).json({
      artworkId,
      status: 'chain_pending',
      approvedBy,
    })

    // Start async pin and register for all images
    void runPinAndRegisterArtworkAsync({ artworkId })
  } catch (error) {
    handleHttpError(response, error, 'Failed to approve artwork registration')
  }
}

interface PinAndRegisterArtworkParams {
  artworkId: string
}

async function runPinAndRegisterArtworkAsync(
  params: PinAndRegisterArtworkParams
): Promise<void> {
  const firestore = getFirestore()

  try {
    // Get all content docs for this artworkId that are chain_pending or hashed
    const snapshots = await firestore
      .collection(ARTWORKS_COLLECTION)
      .where('artworkId', '==', params.artworkId)
      .where('protection.status', 'in', ['hashed', 'chain_pending'])
      .get()

    if (snapshots.empty) {
      logger.info('No pending images to register', {
        artworkId: params.artworkId,
      })
      return
    }

    logger.info('Starting registration for all images of artwork', {
      artworkId: params.artworkId,
      imageCount: snapshots.docs.length,
    })

    // Process each image sequentially to avoid resource contention
    for (const doc of snapshots.docs) {
      await registerSingleImageAsync(
        firestore,
        doc.data() as StoredArtworkDocument
      )
    }

    // After all registrations, sync the artwork approval status
    await syncArtworkApprovalStatus(firestore, params.artworkId)
  } catch (error) {
    logger.error('Batch registration failed', {
      artworkId: params.artworkId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

async function registerSingleImageAsync(
  firestore: ReturnType<typeof getFirestore>,
  artwork: StoredArtworkDocument
): Promise<void> {
  const contentId = artwork.contentId ?? artwork.artworkId
  const docRef = firestore.collection(ARTWORKS_COLLECTION).doc(contentId)

  try {
    if (artwork.protection.status === 'registered') {
      logger.info('Image already registered', { contentId })
      return
    }

    if (!artwork.protection.imageHash) {
      throw new HttpError(
        409,
        'imageHash is missing; hashing step is incomplete.'
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

    // Step 1: Pin to IPFS
    const s3Client = new S3Client({ region: artwork.protection.storage.region })
    const objectBytes = await getUploadedObjectBytes(
      s3Client,
      artwork.protection.storage
    )

    const pinataEnv = getPinataEnvConfig()
    const pinResult = await pinFileToIpfs({
      apiBaseUrl: pinataEnv.apiBaseUrl,
      jwt: pinataEnv.jwt,
      fileBytes: objectBytes,
      fileName: artwork.imageName,
      options: {
        keyValues: {
          artworkId: artwork.artworkId,
          imageHash: artwork.protection.imageHash,
        },
      },
    })

    const ipfsCid = pinResult.IpfsHash

    // Step 2: Register on blockchain
    const chainResult = await registerProtectionOnChain({
      artworkId: contentId,
      imageHash: artwork.protection.imageHash,
      ipfsCid,
      env: getBlockchainEnvConfig(),
    })

    // Step 3: Update with all results
    const registeredAt = new Date().toISOString()
    await docRef.update({
      updatedAt: registeredAt,
      'protection.status': 'registered',
      'protection.registeredAt': registeredAt,
      'protection.imageHash': artwork.protection.imageHash,
      'protection.ipfsCid': ipfsCid,
      'protection.protectedAt': chainResult.protectedAt,
      'protection.blockchainTxHash': chainResult.txHash,
      'protection.chainName': chainResult.chainName,
    })

    logger.info('Image registration completed', {
      contentId,
      artworkId: artwork.artworkId,
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

    logger.error('Image registration failed', {
      contentId,
      errorCode,
      errorMessage,
    })
  }
}

async function syncArtworkApprovalStatus(
  firestore: ReturnType<typeof getFirestore>,
  artworkId: string
): Promise<void> {
  if (!artworkId) {
    return
  }

  const artworkSnapshot = await firestore
    .collection('artworks')
    .doc(artworkId)
    .get()

  if (!artworkSnapshot.exists) {
    return
  }

  const protectedSnapshots = await firestore
    .collection(ARTWORKS_COLLECTION)
    .where('artworkId', '==', artworkId)
    .get()

  if (protectedSnapshots.empty) {
    return
  }

  const hasUnregisteredContent = protectedSnapshots.docs.some((doc) => {
    const artwork = doc.data() as StoredArtworkDocument
    return artwork.protection.status !== 'registered'
  })

  if (hasUnregisteredContent) {
    return
  }

  await firestore.collection('artworks').doc(artworkId).update({
    status: 'approved',
    updatedAt: new Date().toISOString(),
  })
}
