import { getFirestore } from 'firebase-admin/firestore'

import {
  HttpRequest,
  HttpResponse,
  handleCommonHttpRequest,
  handleHttpError,
} from '../shared/http'
import type { StoredArtworkDocument } from '../shared/types'

const ARTWORKS_COLLECTION = 'protectedArtworks'

export async function listPendingArtworkProtectionHandler(
  request: HttpRequest,
  response: HttpResponse
): Promise<void> {
  if (handleCommonHttpRequest(request, response, 'POST')) {
    return
  }

  try {
    const firestore = getFirestore()
    const snapshots = await firestore
      .collection(ARTWORKS_COLLECTION)
      .where('protection.status', '==', 'hashed')
      .get()

    const items = snapshots.docs.map((doc) => {
      const artwork = doc.data() as StoredArtworkDocument
      return {
        id: artwork.artworkId,
        title: artwork.title,
        imageName: artwork.imageName,
        contentId: artwork.contentId,
        ownerUid: artwork.ownerUid,
        createdAt: artwork.createdAt,
        updatedAt: artwork.updatedAt,
        protection: artwork.protection,
      }
    })

    response.status(200).json({ items })
  } catch (error) {
    handleHttpError(
      response,
      error,
      'Failed to list pending protection artworks'
    )
  }
}
