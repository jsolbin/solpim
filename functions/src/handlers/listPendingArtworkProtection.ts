import { getFirestore } from 'firebase-admin/firestore'

import {
  HttpRequest,
  HttpResponse,
  handleCommonHttpRequest,
  handleHttpError,
} from '../shared/http'
import type { StoredArtworkDocument } from '../shared/types'

const ARTWORKS_COLLECTION = 'protectedArtworks'

interface PendingArtworkGroup {
  artworkId: string
  title: string
  ownerUid?: string
  createdAt: string
  updatedAt?: string
  images: Array<{
    contentId: string
    imageName: string
    status: string
  }>
}

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

    const grouped = new Map<string, PendingArtworkGroup>()

    snapshots.docs.forEach((doc) => {
      const artwork = doc.data() as StoredArtworkDocument
      const artworkId = artwork.artworkId || 'unknown'

      if (!grouped.has(artworkId)) {
        grouped.set(artworkId, {
          artworkId,
          title: artwork.title,
          ownerUid: artwork.ownerUid,
          createdAt: artwork.createdAt,
          updatedAt: artwork.updatedAt,
          images: [],
        })
      }

      const group = grouped.get(artworkId)!
      group.images.push({
        contentId: artwork.contentId ?? doc.id,
        imageName: artwork.imageName,
        status: artwork.protection.status,
      })
    })

    const items = Array.from(grouped.values())

    response.status(200).json({ items })
  } catch (error) {
    handleHttpError(
      response,
      error,
      'Failed to list pending protection artworks'
    )
  }
}
