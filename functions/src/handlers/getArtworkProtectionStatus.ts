import { getFirestore } from 'firebase-admin/firestore'

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

interface GetArtworkProtectionStatusRequestBody {
  artworkId?: string
}

export async function getArtworkProtectionStatusHandler(
  request: HttpRequest,
  response: HttpResponse
): Promise<void> {
  if (handleCommonHttpRequest(request, response, 'POST')) {
    return
  }

  try {
    const body = request.body as GetArtworkProtectionStatusRequestBody
    const artworkId = validateRequiredString(body.artworkId, 'artworkId')

    const firestore = getFirestore()
    const snapshot = await firestore
      .collection(ARTWORKS_COLLECTION)
      .doc(artworkId)
      .get()

    if (!snapshot.exists) {
      throw new HttpError(404, 'Artwork not found.')
    }

    const artwork = snapshot.data() as StoredArtworkDocument

    response.status(200).json({
      id: artwork.artworkId,
      title: artwork.title,
      imageName: artwork.imageName,
      contentId: artwork.contentId,
      ownerUid: artwork.ownerUid,
      createdAt: artwork.createdAt,
      updatedAt: artwork.updatedAt,
      protection: artwork.protection,
    })
  } catch (error) {
    handleHttpError(
      response,
      error,
      'Failed to fetch artwork protection status'
    )
  }
}
