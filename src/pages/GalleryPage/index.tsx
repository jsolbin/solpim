import { useEffect, useState } from 'react'

import Masonry from '@mui/lab/Masonry'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { collection, getDocs, query, where } from 'firebase/firestore'

import ArtworkCard from '@/components/Artwork'
import { db } from '@/firebase/config'
import { contentContainerSx, contentPageSx } from '@/styles/page'
import type { Artwork as ArtworkItem } from '@/types/artwork'

const galleryIntro = 'Gallery page intro copy'

interface FirestoreArtworkDoc {
  artworkId?: string
  images?: Array<{
    contentId?: string
    storage?: { bucketName: string; objectKey: string; region?: string }
  }>
  thumbnailContentId?: string
  ownerUid?: string
  category?: string
  title?: string
  description?: string
  productionStart?: string
  productionEnd?: string
  productionYear?: number
  createdAt?: string
  availableForSale?: boolean
  status?: string
  artistName?: string
}

function buildS3Url(
  storage:
    | {
        bucketName: string
        objectKey: string
        region?: string
      }
    | undefined
): string {
  if (!storage || !storage.bucketName || !storage.objectKey) return ''
  const region = storage.region || 'us-east-1'
  return `https://${storage.bucketName}.s3.${region}.amazonaws.com/${encodeURIComponent(
    storage.objectKey
  )}`
}

function GalleryPage() {
  const [artworks, setArtworks] = useState<ArtworkItem[]>([])

  useEffect(() => {
    let isMounted = true

    const loadArtworks = async () => {
      const q = query(
        collection(db, 'artworks'),
        where('status', '==', 'approved')
      )
      const snapshot = await getDocs(q)

      const loaded = snapshot.docs.map((d) => {
        const data = d.data() as FirestoreArtworkDoc
        const images = data.images ?? []
        const thumbContentId = data.thumbnailContentId
        const thumbEntry =
          images.find((it) => it.contentId === thumbContentId) || images[0]

        const thumbnailUrl = thumbEntry?.storage
          ? buildS3Url(thumbEntry.storage)
          : '/primary_default.png'

        const createdAt = data.createdAt ?? new Date().toISOString()

        return {
          id: data.artworkId || d.id,
          artistId: data.ownerUid || '',
          categoryId: data.category || '',
          title: data.title || 'Untitled',
          description: data.description || '',
          thumbnailUrl,
          thumbnailAlt: data.title || 'Artwork',
          productionStartDate: data.productionStart || '',
          productionEndDate: data.productionEnd || '',
          productionYear:
            data.productionYear || new Date(createdAt).getFullYear(),
          isForSale: !!data.availableForSale,
          viewCount: 0,
          likeCount: 0,
          createdAt,
          contents: [],
          status:
            (data.status as 'approved' | 'pending' | 'rejected') || 'approved',
          artist: {
            id: data.ownerUid || '',
            name: data.artistName || 'Unknown',
          },
        } as ArtworkItem
      })

      if (isMounted) setArtworks(loaded)
    }

    void loadArtworks()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <Box component="main" sx={contentPageSx}>
      <Stack spacing={4} sx={contentContainerSx}>
        <Box>
          <Typography variant="h3">Gallery</Typography>
          <Typography sx={{ mt: 1 }} variant="body1">
            {galleryIntro}
          </Typography>
        </Box>

        <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2.5}>
          {artworks.map((artwork) => (
            <ArtworkCard artwork={artwork} key={artwork.id} />
          ))}
        </Masonry>
      </Stack>
    </Box>
  )
}

export default GalleryPage
