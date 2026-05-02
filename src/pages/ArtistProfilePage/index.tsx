import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'

import ArtworkCard from '@/components/Artwork'
import { DEFAULT_PROFILE_IMAGE_URL } from '@/constants/profileIcons'
import { db } from '@/firebase/config'
import { contentContainerSx, contentPageSx } from '@/styles/page'
import type { Artwork } from '@/types/artwork'
import type { S3ObjectReference } from '@/types/blockchain'

type ArtistProfile = {
  id: string
  name: string
  profileImageUrl: string
  backgroundImageUrl?: string
  role?: string
  university?: string
  department?: string
  bio?: string
}

type ArtistArtworkDoc = {
  artworkId?: string
  ownerUid?: string
  title?: string
  status?: string
  description?: string
  thumbnailContentId?: string | null
  images?: Array<{
    contentId?: string
    imageName?: string
    storage?: S3ObjectReference
  }>
  category?: string
  productionStart?: string
  productionEnd?: string
  productionYear?: number
  availableForSale?: boolean
  createdAt?: string
  artistName?: string
}

function resolveStorageUrl(storage?: S3ObjectReference): Promise<string> {
  const fallbackUrl = '/primary_default.png'

  if (!storage?.bucketName || !storage.objectKey) {
    return Promise.resolve(fallbackUrl)
  }

  const endpoint = import.meta.env.VITE_PRESIGNED_DOWNLOAD_ENDPOINT
  if (!endpoint) {
    return Promise.resolve(fallbackUrl)
  }

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucketName: storage.bucketName,
      objectKey: storage.objectKey,
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        return fallbackUrl
      }

      const payload = (await response.json()) as { url?: string }
      return payload.url || fallbackUrl
    })
    .catch(() => fallbackUrl)
}

function mapArtistArtwork(docSnapshot: ArtistArtworkDoc): Artwork {
  return {
    id: docSnapshot.artworkId ?? '',
    artistId: docSnapshot.ownerUid ?? '',
    categoryId: docSnapshot.category ?? '',
    artist: {
      id: docSnapshot.ownerUid ?? '',
      name: docSnapshot.artistName ?? 'Unknown artist',
    },
    title: docSnapshot.title ?? 'Untitled artwork',
    description: docSnapshot.description ?? '',
    thumbnailUrl: '/primary_default.png',
    thumbnailAlt: docSnapshot.title ?? 'Artwork',
    productionStartDate: docSnapshot.productionStart ?? '',
    productionEndDate: docSnapshot.productionEnd ?? '',
    productionYear: docSnapshot.productionYear ?? new Date().getFullYear(),
    isForSale: Boolean(docSnapshot.availableForSale),
    viewCount: 0,
    likeCount: 0,
    status: 'approved',
    contents: [],
    createdAt: docSnapshot.createdAt ?? new Date().toISOString(),
  }
}

function ArtistProfilePage() {
  const { id = '' } = useParams()
  const [artist, setArtist] = useState<ArtistProfile | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadArtistProfile = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const artistSnapshot = await getDoc(doc(db, 'users', id))
        const artistData = artistSnapshot.data()

        if (!artistSnapshot.exists() || !artistData) {
          if (isMounted) {
            setArtist(null)
            setArtworks([])
          }
          return
        }

        const nextArtist: ArtistProfile = {
          id,
          name:
            typeof artistData.name === 'string' && artistData.name.trim()
              ? artistData.name
              : 'Unknown artist',
          profileImageUrl:
            typeof artistData.profileImageUrl === 'string' &&
            artistData.profileImageUrl.trim()
              ? artistData.profileImageUrl
              : DEFAULT_PROFILE_IMAGE_URL,
          backgroundImageUrl:
            typeof artistData.backgroundImageUrl === 'string'
              ? artistData.backgroundImageUrl
              : undefined,
          role:
            typeof artistData.role === 'string' ? artistData.role : undefined,
          university:
            typeof artistData.university === 'string'
              ? artistData.university
              : undefined,
          department:
            typeof artistData.department === 'string'
              ? artistData.department
              : undefined,
          bio: typeof artistData.bio === 'string' ? artistData.bio : undefined,
        }

        const artworksQuery = query(
          collection(db, 'artworks'),
          where('ownerUid', '==', id)
        )
        const artworkSnapshot = await getDocs(artworksQuery)

        const nextArtworks = await Promise.all(
          artworkSnapshot.docs.map(async (snapshot) => {
            const data = snapshot.data() as ArtistArtworkDoc
            if (data.status !== 'approved') {
              return null
            }
            const imageEntry =
              data.images?.find(
                (image) => image.contentId === data.thumbnailContentId
              ) ?? data.images?.[0]
            const thumbnailUrl = await resolveStorageUrl(imageEntry?.storage)

            return {
              ...mapArtistArtwork(data),
              thumbnailUrl,
            }
          })
        )

        if (isMounted) {
          setArtist(nextArtist)
          setArtworks(
            nextArtworks.filter((value): value is Artwork => Boolean(value))
          )
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Failed to load artist profile.'
          )
          setArtist(null)
          setArtworks([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadArtistProfile()

    return () => {
      isMounted = false
    }
  }, [id])

  if (isLoading) {
    return (
      <Box component="main" sx={contentPageSx}>
        <Stack spacing={2} sx={contentContainerSx}>
          <Typography variant="h3">Artist Profile</Typography>
          <Typography color="text.secondary">
            Loading artist profile...
          </Typography>
        </Stack>
      </Box>
    )
  }

  if (!artist) {
    return (
      <Box component="main" sx={contentPageSx}>
        <Stack spacing={2} sx={contentContainerSx}>
          <Typography variant="h3">Artist Profile</Typography>
          <Alert severity="info">No public artist profile was found.</Alert>
        </Stack>
      </Box>
    )
  }

  return (
    <Box component="main" sx={contentPageSx}>
      <Stack spacing={4} sx={contentContainerSx}>
        <Paper
          sx={{
            overflow: 'hidden',
            borderRadius: 4,
            background: artist.backgroundImageUrl
              ? `linear-gradient(180deg, rgba(15, 23, 42, 0.1), rgba(15, 23, 42, 0.55)), url(${artist.backgroundImageUrl}) center/cover`
              : 'linear-gradient(135deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.02))',
          }}
        >
          <Stack
            spacing={2}
            sx={{ p: { xs: 3, md: 5 }, color: 'common.white' }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2.5}
              alignItems={{ sm: 'center' }}
            >
              <Avatar
                src={artist.profileImageUrl}
                alt={artist.name}
                sx={{
                  width: 88,
                  height: 88,
                  border: '3px solid rgba(255,255,255,0.8)',
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" sx={{ opacity: 0.9 }}>
                  Artist profile
                </Typography>
                <Typography variant="h3" sx={{ color: 'inherit' }}>
                  {artist.name}
                </Typography>
                <Typography sx={{ opacity: 0.9 }}>
                  {[artist.university, artist.department]
                    .filter(Boolean)
                    .join(' · ') || 'Public artist profile'}
                </Typography>
              </Box>
            </Stack>

            {artist.bio ? (
              <Typography
                sx={{ maxWidth: 780, whiteSpace: 'pre-line', opacity: 0.95 }}
              >
                {artist.bio}
              </Typography>
            ) : null}
          </Stack>
        </Paper>

        <Stack spacing={1}>
          <Typography variant="h5">Featured works</Typography>
          <Typography color="text.secondary">
            Approved artworks by this artist.
          </Typography>
        </Stack>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        {artworks.length > 0 ? (
          <Box>
            <Stack spacing={3}>
              {artworks.map((artwork) => (
                <ArtworkCard artwork={artwork} key={artwork.id} />
              ))}
            </Stack>
          </Box>
        ) : (
          <Alert severity="info">No approved artworks are available yet.</Alert>
        )}

        <Typography
          component={RouterLink}
          to="/gallery"
          sx={{
            color: 'text.secondary',
            textDecoration: 'none',
            width: 'fit-content',
          }}
        >
          Back to gallery
        </Typography>
      </Stack>
    </Box>
  )
}

export default ArtistProfilePage
