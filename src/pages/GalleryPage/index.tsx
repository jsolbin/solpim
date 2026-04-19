import Masonry from '@mui/lab/Masonry'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import ArtworkCard from '@/components/Artwork'
import { contentContainerSx, contentPageSx } from '@/styles/page'
import type { Artwork as ArtworkItem } from '@/types/artwork'

const galleryIntro = 'Gallery page intro copy'

// metadata for artworks - to be replaced with API data in the future
const artworks: ArtworkItem[] = [
  {
    id: '1',
    artistId: 'artist-1',
    categoryId: 'category-1',
    title: 'Urban Metamorphosis',
    description:
      'Mixed media work exploring density, memory, and urban change.',
    thumbnailUrl: '/primary_default.png',
    thumbnailAlt: 'Urban Metamorphosis artwork',
    productionStartDate: '2025-09-01',
    productionEndDate: '2026-03-01',
    productionYear: 2026,
    isForSale: false,
    viewCount: 128,
    likeCount: 24,
    createdAt: '2026-03-23T10:00:00Z',
    contents: [],
    status: 'approved',
    artist: {
      id: 'artist-1',
      name: "Sophie O'Connor",
    },
  },
  {
    id: '2',
    artistId: 'artist-2',
    categoryId: 'category-2',
    title: 'Drawing',
    description: 'Charcoal study focused on movement and layered gesture.',
    thumbnailUrl: '/artwork1.jpg',
    thumbnailAlt: 'Drawing artwork',
    productionStartDate: '2025-10-01',
    productionEndDate: '2026-02-15',
    productionYear: 2026,
    isForSale: true,
    viewCount: 96,
    likeCount: 18,
    createdAt: '2026-03-22T16:00:00Z',
    contents: [],
    status: 'approved',
    artist: {
      id: 'artist-2',
      name: 'Emma Watson',
    },
  },
  {
    id: '3',
    artistId: 'artist-3',
    categoryId: 'category-3',
    title: 'Glass',
    description:
      'A translucent composition using reflective surfaces and light.',
    thumbnailUrl: '/artwork2.jpeg',
    thumbnailAlt: 'Glass artwork',
    productionStartDate: '2025-11-05',
    productionEndDate: '2026-01-25',
    productionYear: 2026,
    isForSale: false,
    viewCount: 174,
    likeCount: 31,
    createdAt: '2026-03-21T13:00:00Z',
    contents: [],
    status: 'approved',
    artist: {
      id: 'artist-3',
      name: 'Sophia Jim',
    },
  },
  {
    id: '4',
    artistId: 'artist-4',
    categoryId: 'category-4',
    title: 'Butterfly',
    description:
      'Printed illustration inspired by repetition and transformation.',
    thumbnailUrl: '/artwork3.webp',
    thumbnailAlt: 'Butterfly artwork',
    productionStartDate: '2025-08-20',
    productionEndDate: '2026-02-05',
    productionYear: 2026,
    isForSale: true,
    viewCount: 143,
    likeCount: 27,
    createdAt: '2026-03-20T11:00:00Z',
    contents: [],
    status: 'approved',
    artist: {
      id: 'artist-4',
      name: 'Harry Potter',
    },
  },
  {
    id: '5',
    artistId: 'artist-5',
    categoryId: 'category-5',
    title: 'Paper Sky',
    description: 'Paper-based sculpture balancing softness, void, and surface.',
    thumbnailUrl: '/artwork5.jpeg',
    thumbnailAlt: 'Paper Sky artwork',
    productionStartDate: '2025-09-18',
    productionEndDate: '2026-02-28',
    productionYear: 2026,
    isForSale: false,
    viewCount: 88,
    likeCount: 16,
    createdAt: '2026-03-19T09:00:00Z',
    contents: [],
    status: 'approved',
    artist: {
      id: 'artist-5',
      name: 'Liam Jung',
    },
  },
  {
    id: '6',
    artistId: 'artist-6',
    categoryId: 'category-6',
    title: 'Digital art',
    description:
      'Digital composition experimenting with saturation and rhythm.',
    thumbnailUrl: '/artwork6.jpg',
    thumbnailAlt: 'Digital art artwork',
    productionStartDate: '2025-12-01',
    productionEndDate: '2026-03-10',
    productionYear: 2026,
    isForSale: true,
    viewCount: 212,
    likeCount: 42,
    createdAt: '2026-03-18T08:00:00Z',
    contents: [],
    status: 'approved',
    artist: {
      id: 'artist-6',
      name: 'Emily Lee',
    },
  },
]

function GalleryPage() {
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
