import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import type { Artwork } from '@/types/artwork'

interface ArtworkProps {
  artwork: Artwork
}

const cardSx = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '18px',
  backgroundColor: 'background.paper',
  cursor: 'pointer',
  '&:hover .artwork-overlay': {
    opacity: 1,
  },
  '&:hover img': {
    transform: 'scale(1.03)',
  },
}

const imageSx = {
  width: '100%',
  height: 'auto',
  display: 'block',
  transition: 'transform 180ms ease',
}

const overlaySx = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  gap: 0.5,
  p: 2,
  color: 'common.white',
  background:
    'linear-gradient(to top, rgba(15, 23, 42, 0.82) 0%, rgba(15, 23, 42, 0.22) 55%, rgba(15, 23, 42, 0) 100%)',
  opacity: 0,
  transition: 'opacity 180ms ease',
}

function ArtworkCard({ artwork }: ArtworkProps) {
  return (
    <Box sx={cardSx}>
      <Box sx={{ overflow: 'hidden' }}>
        <Box component="img" src={artwork.thumbnailUrl} alt={artwork.thumbnailAlt} sx={imageSx} />
      </Box>

      <Box className="artwork-overlay" sx={overlaySx}>
        <Typography
          sx={{
            fontSize: '1.125rem',
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {artwork.title}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.95rem',
            opacity: 0.92,
          }}
        >
          {artwork.artist.name}
        </Typography>
      </Box>
    </Box>
  )
}

export default ArtworkCard
