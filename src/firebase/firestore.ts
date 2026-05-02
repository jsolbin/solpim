import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'

import { db } from '@/firebase/config'
import type { ProtectedArtworkRecord } from '@/types/blockchain'

const ARTWORKS_COLLECTION = 'protectedArtworks'

function toProtectedArtworkRecord(snapshot: {
  id: string
  data: () => Record<string, unknown>
}): ProtectedArtworkRecord {
  const data = snapshot.data()
  const protection = data.protection as ProtectedArtworkRecord['protection']

  return {
    id: data.artworkId as string,
    title: (data.title as string) ?? '',
    imageName: (data.imageName as string) ?? '',
    contentId: data.contentId as string | undefined,
    ownerUid: data.ownerUid as string | undefined,
    createdAt: (data.createdAt as string) ?? '',
    updatedAt: data.updatedAt as string | undefined,
    protection,
  }
}

export async function getProtectedArtworkById(
  artworkId: string
): Promise<ProtectedArtworkRecord | null> {
  const snapshot = await getDoc(doc(db, ARTWORKS_COLLECTION, artworkId))

  if (!snapshot.exists()) {
    return null
  }

  return toProtectedArtworkRecord({
    id: snapshot.id,
    data: () => snapshot.data() as Record<string, unknown>,
  })
}

export async function listPendingProtectedArtworks(): Promise<
  ProtectedArtworkRecord[]
> {
  const pendingQuery = query(
    collection(db, ARTWORKS_COLLECTION),
    where('protection.status', '==', 'pinned')
  )

  const snapshots = await getDocs(pendingQuery)
  return snapshots.docs.map((snapshot) =>
    toProtectedArtworkRecord({
      id: snapshot.id,
      data: () => snapshot.data() as Record<string, unknown>,
    })
  )
}
