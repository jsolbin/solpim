import { useEffect, useState } from 'react'

import Masonry from '@mui/lab/Masonry'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
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

async function resolveThumbnailUrl(
  storage:
    | {
        bucketName: string
        objectKey: string
        region?: string
      }
    | undefined
): Promise<string> {
  if (!storage?.bucketName || !storage.objectKey) {
    return '/primary_default.png'
  }

  const endpoint = import.meta.env.VITE_PRESIGNED_DOWNLOAD_ENDPOINT

  if (!endpoint) {
    return '/primary_default.png'
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketName: storage.bucketName,
        objectKey: storage.objectKey,
      }),
    })

    if (!response.ok) {
      return '/primary_default.png'
    }

    const payload = (await response.json()) as { url?: string }
    return payload.url || '/primary_default.png'
  } catch {
    return '/primary_default.png'
  }
}

function GalleryPage() {
  const [allArtworks, setAllArtworks] = useState<ArtworkItem[]>([])
  const [sortBy, setSortBy] = useState<'latest' | 'liked' | 'viewed' | 'year'>(
    'latest'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [favoriteArtistsOnly, setFavoriteArtistsOnly] = useState(false)
  const [favoriteArtists, setFavoriteArtists] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    let isMounted = true

    const loadArtworks = async () => {
      const q = query(
        collection(db, 'artworks'),
        where('status', '==', 'approved')
      )
      const snapshot = await getDocs(q)

      const loaded = await Promise.all(
        snapshot.docs.map(async (d) => {
          const data = d.data() as FirestoreArtworkDoc
          const images = data.images ?? []
          const thumbContentId = data.thumbnailContentId
          const thumbEntry =
            images.find((it) => it.contentId === thumbContentId) || images[0]

          const thumbnailUrl = await resolveThumbnailUrl(thumbEntry?.storage)

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
              (data.status as 'approved' | 'pending' | 'rejected') ||
              'approved',
            artist: {
              id: data.ownerUid || '',
              name: data.artistName || 'Unknown',
            },
          } as ArtworkItem
        })
      )

      if (isMounted) {
        setAllArtworks(loaded)
        const uniqueCategories = Array.from(
          new Set(loaded.map((art) => art.categoryId).filter(Boolean))
        )
        setCategories(uniqueCategories as string[])
      }
    }

    void loadArtworks()

    return () => {
      isMounted = false
    }
  }, [])

  // Filter and sort artworks
  const filteredArtworks = allArtworks
    .filter((art) => {
      // Search filter
      if (
        searchQuery &&
        !art.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }
      // Category filter
      if (selectedCategory && art.categoryId !== selectedCategory) {
        return false
      }
      // Favorite artists filter
      if (favoriteArtistsOnly && !favoriteArtists.includes(art.artistId)) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        case 'liked':
          return b.likeCount - a.likeCount
        case 'viewed':
          return b.viewCount - a.viewCount
        case 'year':
          return b.productionYear - a.productionYear
        default:
          return 0
      }
    })

  const handleToggleFavoriteArtist = (artistId: string) => {
    setFavoriteArtists((prev) =>
      prev.includes(artistId)
        ? prev.filter((id) => id !== artistId)
        : [...prev, artistId]
    )
  }

  return (
    <Box component="main" sx={contentPageSx}>
      <Stack spacing={4} sx={contentContainerSx}>
        <Box>
          <Typography variant="h3">Gallery</Typography>
          <Typography sx={{ mt: 1 }} variant="body1">
            {galleryIntro}
          </Typography>
        </Box>

        {/* Curation Controls */}
        <Stack spacing={3}>
          {/* Search */}
          <TextField
            placeholder="Search artworks by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            size="small"
            variant="outlined"
          />

          {/* Sort and Category */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Sort by</InputLabel>
              <Select
                value={sortBy}
                label="Sort by"
                onChange={(e) =>
                  setSortBy(
                    e.target.value as 'latest' | 'liked' | 'viewed' | 'year'
                  )
                }
                size="small"
              >
                <MenuItem value="latest">Latest</MenuItem>
                <MenuItem value="liked">Most Liked</MenuItem>
                <MenuItem value="viewed">Most Viewed</MenuItem>
                <MenuItem value="year">Production Year</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
                size="small"
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant={favoriteArtistsOnly ? 'contained' : 'outlined'}
              onClick={() => setFavoriteArtistsOnly(!favoriteArtistsOnly)}
              size="small"
            >
              Favorite Artists
            </Button>
          </Stack>

          {/* Favorite Artists Chips (shown when filter is active) */}
          {favoriteArtistsOnly && favoriteArtists.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Typography variant="caption" sx={{ alignSelf: 'center' }}>
                Filtering by:
              </Typography>
              {favoriteArtists.map((artistId) => {
                const artist = allArtworks.find(
                  (art) => art.artistId === artistId
                )?.artist
                return (
                  <Chip
                    key={artistId}
                    label={artist?.name || 'Unknown'}
                    onDelete={() => handleToggleFavoriteArtist(artistId)}
                    size="small"
                  />
                )
              })}
            </Stack>
          )}

          {/* Results info */}
          <Typography variant="body2" color="text.secondary">
            Showing {filteredArtworks.length} of {allArtworks.length} artworks
          </Typography>
        </Stack>

        {/* Gallery Grid */}
        {filteredArtworks.length > 0 ? (
          <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2.5}>
            {filteredArtworks.map((artwork) => (
              <ArtworkCard artwork={artwork} key={artwork.id} />
            ))}
          </Masonry>
        ) : (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">
              No artworks found matching your criteria.
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  )
}

export default GalleryPage
